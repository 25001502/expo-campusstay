export type VerticalBounds = { y: number; height: number };
export function clampFormOffset(offset: number, contentHeight: number, viewportHeight: number): number {
  return Math.max(0, Math.min(Number.isFinite(offset) ? offset : 0, Math.max(0, contentHeight - viewportHeight)));
}

// All coordinates come from the same native window. No keyboard-height guess,
// field-specific offset or keyboard-sized content padding is needed.
export function focusedFormOffset(offset: number, contentHeight: number, viewport: VerticalBounds, input?: VerticalBounds): number {
  const current = clampFormOffset(offset, contentHeight, viewport.height);
  if (!input || viewport.height <= 0) return current;
  const margin = Math.min(12, viewport.height / 4);
  const top = viewport.y + margin;
  const bottom = viewport.y + viewport.height - margin;
  let delta = 0;
  if (input.height > bottom - top) delta = input.y - top;
  else if (input.y < top) delta = input.y - top;
  else if (input.y + input.height > bottom) delta = input.y + input.height - bottom;
  return clampFormOffset(current + delta, contentHeight, viewport.height);
}
