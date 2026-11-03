import Link from "next/link";
export default function NotFound() {
  return (
    <main className="unavailable">
      <h1>Page not found</h1>
      <p>This workspace page is unavailable.</p>
      <Link className="button secondary" href="/admin">
        Return to workspace
      </Link>
    </main>
  );
}
