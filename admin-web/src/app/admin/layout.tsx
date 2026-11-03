import { canRenderPreview } from "@/lib/access.server";
import { PreviewProvider } from "@/components/preview-context";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!canRenderPreview())
    return (
      <main className="unavailable">
        <h1>Administrator access unavailable</h1>
        <p>Verified server-side authorization is required.</p>
      </main>
    );
  return (
    <PreviewProvider>
      <Shell>{children}</Shell>
    </PreviewProvider>
  );
}
