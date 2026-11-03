import { notFound } from "next/navigation";
import { canRenderPreview } from "@/lib/access.server";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  if (!canRenderPreview()) return <h1>Administrator access unavailable</h1>;
  const { path = [] } = await params;
  const valid =
    path.length === 0 ||
    (path.length === 1 &&
      ["applications", "properties", "users", "audit", "settings"].includes(
        path[0],
      )) ||
    (path.length === 2 && ["applications", "properties"].includes(path[0]));
  if (!valid) notFound();
  const { PreviewPage } = await import("@/components/pages");
  return <PreviewPage path={path} />;
}
