package expo.modules.campusstaystorage

import android.net.Uri
import android.system.ErrnoException
import android.system.OsConstants
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID

/** No public paths or caller-supplied deletion paths. Errors never contain source names/URIs. */
class CampusStayDocumentStorageModule : Module() {
  companion object {
    private val lock = Any()
    private val liveSessions = mutableSetOf<String>()
    private const val LIMIT = 10L * 1024 * 1024
    private const val RESERVE = 1024L * 1024
    private val sessionName = Regex("session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
    private val idPattern = Regex("[a-z0-9-]{1,100}")
    private val ownedName = Regex("[a-z0-9-]{1,100}\\.(local|partial)")
  }
  private var session: File? = null
  private val pendingDeletes = mutableSetOf<File>()

  override fun definition() = ModuleDefinition {
    Name("CampusStayDocumentStorage")
    Function("initialize") { synchronized(lock) { initialize() } }
    AsyncFunction("stage") { uri: String, id: String, mime: String ->
      stage(uri, id, mime)
    }
    Function("available") { id: String, size: Double -> synchronized(lock) {
      try {
        val file = target(id, "local")
        safeFile(file) && file.length() == size.toLong() && FileInputStream(file).use { it.read() >= 0 }
      } catch (_: Exception) { false }
    } }
    Function("remove") { id: String -> synchronized(lock) {
      try { erase(target(id, "local")) } catch (_: Exception) { false }
    } }
    Function("retryCleanup") { synchronized(lock) { retryCleanup() } }
    OnDestroy { synchronized(lock) {
      session?.let { directory ->
        // Do not release a different runtime's active files.
        try { eraseSession(directory) } catch (_: Exception) { /* next-start sweep */ }
        liveSessions.remove(directory.absolutePath)
      }
      session = null
    } }
  }

  private fun initialize(): Boolean = try {
    if (session != null) retryCleanup() else {
      val context = appContext.reactContext ?: error("unavailable")
      val parent = context.noBackupFilesDir.canonicalFile
      val root = File(parent, "campusstay-document-staging-v1")
      check(root.canonicalFile == File(parent, root.name))
      check(root.isDirectory || root.mkdir())
      // Fail closed for unexpected entries and deletion failures. Never follow symlinks.
      for (old in root.listFiles() ?: error("cleanup")) {
        check(sessionName.matches(old.name) && old.canonicalFile == File(root, old.name))
        if (old.absolutePath !in liveSessions) check(eraseSession(old))
      }
      val next = File(root, "session-${UUID.randomUUID()}")
      check(next.mkdir())
      session = next
      liveSessions.add(next.absolutePath)
      true
    }
  } catch (_: Exception) { false }

  private fun target(id: String, extension: String): File {
    check(idPattern.matches(id))
    val directory = session ?: error("unavailable")
    check(directory.canonicalFile == directory.absoluteFile && directory.isDirectory)
    return File(directory, "$id.$extension").also { check(it.canonicalFile == it.absoluteFile) }
  }
  private fun safeFile(file: File) = file.canonicalFile == file.absoluteFile && file.isFile
  private fun erase(file: File): Boolean {
    val removed = file.canonicalFile == file.absoluteFile && (!file.exists() || (file.isFile && file.delete()))
    if (removed) pendingDeletes.remove(file) else pendingDeletes.add(file)
    return removed
  }
  private fun retryCleanup(): Boolean {
    for (file in pendingDeletes.toList()) erase(file)
    return pendingDeletes.isEmpty()
  }
  private fun eraseSession(directory: File): Boolean {
    check(directory.isDirectory && directory.canonicalFile == directory.absoluteFile)
    val children = directory.listFiles() ?: return false
    // Validate every child before touching anything in this recognized session.
    check(children.all { ownedName.matches(it.name) && safeFile(it) })
    return children.map { erase(it) }.all { it } && directory.delete()
  }
  private fun noSpace(error: Throwable?): Boolean = error != null &&
    ((error is ErrnoException && error.errno == OsConstants.ENOSPC) ||
      error.message?.contains("ENOSPC") == true || noSpace(error.cause))
  private fun signature(bytes: ByteArray, mime: String): Boolean {
    val expected = when (mime) {
      "application/pdf" -> byteArrayOf(37, 80, 68, 70, 45)
      "image/jpeg" -> byteArrayOf(255.toByte(), 216.toByte(), 255.toByte())
      "image/png" -> byteArrayOf(137.toByte(), 80, 78, 71, 13, 10, 26, 10)
      else -> return false
    }
    return bytes.size >= expected.size && expected.indices.all { bytes[it] == expected[it] }
  }
  private fun stage(source: String, id: String, mime: String): Map<String, Any> {
    val owner = synchronized(lock) { if (initialize()) session else null }
      ?: return mapOf("code" to "cleanup")
    var partial: File? = null
    var destination: File? = null
    var created = false
    var renamed = false
    var openingSource = false
    try {
      val (temp, final) = synchronized(lock) {
        check(session === owner)
        val temp = target(id, "partial")
        val final = target(id, "local")
        // A collision is never overwritten or deleted as a failed candidate.
        check(!temp.exists() && !final.exists())
        temp to final
      }
      partial = temp; destination = final
      val uri = Uri.parse(source)
      val context = appContext.reactContext ?: error("unavailable")
      var knownSize: Long? = null
      openingSource = true
      val stream: InputStream = when (uri.scheme) {
        "content" -> {
          knownSize = context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { it.length.takeIf { n -> n >= 0 } }
          context.contentResolver.openInputStream(uri) ?: error("unreadable")
        }
        "file" -> {
          val file = File(uri.path ?: error("unreadable"))
          knownSize = file.length()
          FileInputStream(file)
        }
        else -> error("unreadable")
      }
      openingSource = false
      stream.use { input ->
        if (knownSize != null && knownSize!! > LIMIT) return mapOf("code" to "size")
        if (knownSize == 0L) return mapOf("code" to "unreadable")
        val free = temp.parentFile!!.usableSpace
        if (free >= 0 && free < (knownSize ?: LIMIT) + RESERVE) return mapOf("code" to "storage")
        check(temp.createNewFile()); created = true
        var total = 0L
        FileOutputStream(temp).use { output ->
          val buffer = ByteArray(64 * 1024)
          while (true) {
            val count = try { input.read(buffer) } catch (_: Exception) { return mapOf("code" to "unreadable") }
            if (count < 0) break
            total += count
            if (total > LIMIT) return mapOf("code" to "size")
            output.write(buffer, 0, count)
          }
          output.fd.sync()
        }
        if (total <= 0 || (knownSize != null && total != knownSize) || temp.length() != total) return mapOf("code" to "staging")
        val prefix = FileInputStream(temp).use { input ->
          ByteArray(minOf(16, total.toInt())).also { bytes ->
            for (index in bytes.indices) { val byte = input.read(); check(byte >= 0); bytes[index] = byte.toByte() }
          }
        }
        if (!signature(prefix, mime)) return mapOf("code" to "content")
        synchronized(lock) {
          // Source reads can be slow (for example a cloud Files provider).
          // Keep them outside the lock so Leave/Log Out never waits on that provider.
          check(session === owner && !final.exists())
          check(temp.renameTo(final)); renamed = true
          check(safeFile(final) && final.length() == total)
        }
        return mapOf("code" to "ok", "uri" to Uri.fromFile(final).toString(), "size" to total,
          "prefix" to prefix.map { it.toInt() and 255 })
      }
    } catch (error: Exception) {
      if (renamed) synchronized(lock) { destination?.let { erase(it) } }
      return mapOf("code" to if (noSpace(error)) "storage" else if (openingSource) "unreadable" else "staging")
    } finally {
      if (created) synchronized(lock) { partial?.let { erase(it) } }
    }
  }
}
