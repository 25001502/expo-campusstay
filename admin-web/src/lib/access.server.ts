import "server-only";
import { previewAllowed } from "../../security.mjs";
export function canRenderPreview(): boolean {
  return previewAllowed(process.env.NODE_ENV, process.env.ADMIN_MOCK_MODE);
}
