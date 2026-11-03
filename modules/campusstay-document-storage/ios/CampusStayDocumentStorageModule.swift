import ExpoModulesCore
import Foundation
import Darwin

public class CampusStayDocumentStorageModule: Module {
  private static let lock = NSRecursiveLock()
  private static var liveSessions = Set<String>()
  private let fm = FileManager.default
  private var session: URL?
  private var pendingDeletes = Set<URL>()
  private let limit = 10 * 1024 * 1024
  private let reserve = 1024 * 1024

  public func definition() -> ModuleDefinition {
    Name("CampusStayDocumentStorage")
    Function("initialize") { self.locked { self.initialize() } }
    AsyncFunction("stage") { (uri: String, id: String, mime: String) -> [String: Any] in
      self.stage(uri, id: id, mime: mime)
    }
    Function("available") { (id: String, size: Double) -> Bool in self.locked {
      guard let file = try? self.target(id, ext: "local"), self.safeFile(file),
        let attrs = try? self.fm.attributesOfItem(atPath: file.path),
        (attrs[.size] as? NSNumber)?.doubleValue == size,
        let handle = try? FileHandle(forReadingFrom: file) else { return false }
      defer { try? handle.close() }
      return (try? handle.read(upToCount: 1)?.count) == 1
    } }
    Function("remove") { (id: String) -> Bool in self.locked {
      guard let file = try? self.target(id, ext: "local") else { return false }
      return self.erase(file)
    } }
    Function("retryCleanup") { self.locked { self.retryCleanup() } }
    OnDestroy { self.locked {
      if let session = self.session {
        _ = try? self.eraseSession(session)
        Self.liveSessions.remove(session.path)
      }
      self.session = nil
    } }
  }
  private func locked<T>(_ work: () throws -> T) rethrows -> T {
    Self.lock.lock(); defer { Self.lock.unlock() }; return try work()
  }
  private func matches(_ name: String, _ pattern: String) -> Bool {
    name.range(of: pattern, options: .regularExpression) != nil
  }
  private func require(_ condition: Bool) throws {
    if !condition { throw NSError(domain: "CampusStayStorage", code: 1) }
  }
  private func protect(_ original: URL) throws {
    var file = original
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    try file.setResourceValues(values)
    try fm.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: file.path)
    let excluded = try file.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
    let protection = try fm.attributesOfItem(atPath: file.path)[.protectionKey]
    let complete = (protection as? FileProtectionType) == .complete ||
      (protection as? String) == FileProtectionType.complete.rawValue
    try require(excluded == true && complete)
  }
  private func initialize() -> Bool {
    if session != nil { return retryCleanup() }
    do {
      let support = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).resolvingSymlinksInPath()
      let root = support.appendingPathComponent("campusstay-document-staging-v1", isDirectory: true)
      try require(root.resolvingSymlinksInPath().path == root.path)
      try fm.createDirectory(at: root, withIntermediateDirectories: true,
        attributes: [.protectionKey: FileProtectionType.complete])
      try protect(root)
      for old in try fm.contentsOfDirectory(at: root, includingPropertiesForKeys: nil) {
        try require(matches(old.lastPathComponent, "^session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"))
        if !Self.liveSessions.contains(old.path) { try require(try eraseSession(old)) }
      }
      let next = root.appendingPathComponent("session-" + UUID().uuidString.lowercased(), isDirectory: true)
      try fm.createDirectory(at: next, withIntermediateDirectories: false,
        attributes: [.protectionKey: FileProtectionType.complete])
      try protect(next)
      session = next; Self.liveSessions.insert(next.path)
      return true
    } catch { return false }
  }
  private func target(_ id: String, ext: String) throws -> URL {
    try require(matches(id, "^[a-z0-9-]{1,100}$"))
    guard let session else { throw NSError(domain: "CampusStayStorage", code: 1) }
    try require(session.resolvingSymlinksInPath().path == session.path)
    let file = session.appendingPathComponent(id + "." + ext)
    try require(file.resolvingSymlinksInPath().path == file.path)
    return file
  }
  private func safeFile(_ file: URL) -> Bool {
    guard file.resolvingSymlinksInPath().path == file.path,
      let type = try? fm.attributesOfItem(atPath: file.path)[.type] as? FileAttributeType else { return false }
    return type == .typeRegular
  }
  private func erase(_ file: URL) -> Bool {
    do {
      if fm.fileExists(atPath: file.path) { try require(safeFile(file)); try fm.removeItem(at: file) }
      pendingDeletes.remove(file); return true
    } catch { pendingDeletes.insert(file); return false }
  }
  private func retryCleanup() -> Bool {
    for file in Array(pendingDeletes) { _ = erase(file) }
    return pendingDeletes.isEmpty
  }
  private func eraseSession(_ directory: URL) throws -> Bool {
    try require(directory.resolvingSymlinksInPath().path == directory.path)
    let children = try fm.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
    try require(children.allSatisfy { matches($0.lastPathComponent, "^[a-z0-9-]{1,100}\\.(local|partial)$") && safeFile($0) })
    guard children.map({ erase($0) }).allSatisfy({ $0 }) else { return false }
    try fm.removeItem(at: directory); return true
  }
  private func noSpace(_ error: NSError) -> Bool {
    if (error.domain == NSPOSIXErrorDomain && error.code == Int(ENOSPC)) ||
      (error.domain == NSCocoaErrorDomain && error.code == CocoaError.fileWriteOutOfSpace.rawValue) { return true }
    return (error.userInfo[NSUnderlyingErrorKey] as? NSError).map { noSpace($0) } ?? false
  }
  private func signature(_ data: Data, mime: String) -> Bool {
    let expected: [UInt8]
    switch mime {
    case "application/pdf": expected = [37, 80, 68, 70, 45]
    case "image/jpeg": expected = [255, 216, 255]
    case "image/png": expected = [137, 80, 78, 71, 13, 10, 26, 10]
    default: return false
    }
    return data.starts(with: expected)
  }
  private func stage(_ source: String, id: String, mime: String) -> [String: Any] {
    guard let owner = locked({ initialize() ? session : nil }) else { return ["code": "cleanup"] }
    var partial: URL?; var destination: URL?; var created = false; var renamed = false; var openingSource = false
    defer { if created, let partial { _ = locked { erase(partial) } } }
    do {
      let (temp, final) = try locked { () -> (URL, URL) in
        try require(session == owner)
        let temp = try target(id, ext: "partial"); let final = try target(id, ext: "local")
        try require(!fm.fileExists(atPath: temp.path) && !fm.fileExists(atPath: final.path))
        return (temp, final)
      }
      partial = temp; destination = final
      guard let uri = URL(string: source), uri.isFileURL else { return ["code": "unreadable"] }
      let accessed = uri.startAccessingSecurityScopedResource()
      defer { if accessed { uri.stopAccessingSecurityScopedResource() } }
      openingSource = true
      let attrs = try fm.attributesOfItem(atPath: uri.path)
      guard let size = (attrs[.size] as? NSNumber)?.intValue, size > 0 else { return ["code": "unreadable"] }
      if size > limit { return ["code": "size"] }
      if let space = try? fm.attributesOfFileSystem(forPath: temp.deletingLastPathComponent().path),
        let free = (space[.systemFreeSize] as? NSNumber)?.int64Value, free >= 0,
        free < Int64(size + reserve) { return ["code": "storage"] }
      let input = try FileHandle(forReadingFrom: uri); defer { try? input.close() }
      openingSource = false
      try require(fm.createFile(atPath: temp.path, contents: nil,
        attributes: [.protectionKey: FileProtectionType.complete, .posixPermissions: 0o600]))
      created = true; try protect(temp)
      let output = try FileHandle(forWritingTo: temp); defer { try? output.close() }
      var total = 0
      while true {
        let block: Data
        do { block = try input.read(upToCount: 64 * 1024) ?? Data() }
        catch { return ["code": "unreadable"] }
        if block.isEmpty { break }
        total += block.count
        if total > limit { return ["code": "size"] }
        try output.write(contentsOf: block)
      }
      try output.synchronize(); try output.close()
      try require(total == size)
      let check = try FileHandle(forReadingFrom: temp); defer { try? check.close() }
      let prefix = try check.read(upToCount: min(16, total)) ?? Data()
      if !signature(prefix, mime: mime) { return ["code": "content"] }
      try locked {
        // Never hold the lifecycle lock while reading a potentially slow provider.
        try require(session == owner && !fm.fileExists(atPath: final.path))
        try fm.moveItem(at: temp, to: final); renamed = true
        try protect(final) // Reapply and verify exclusion after move; never silently downgrade.
        let copiedSize = try fm.attributesOfItem(atPath: final.path)[.size] as? NSNumber
        try require(safeFile(final) && copiedSize?.intValue == total)
      }
      return ["code": "ok", "uri": final.absoluteString, "size": total, "prefix": Array(prefix)]
    } catch {
      if renamed, let destination { _ = locked { erase(destination) } }
      return ["code": noSpace(error as NSError) ? "storage" : openingSource ? "unreadable" : "staging"]
    }
  }
}
