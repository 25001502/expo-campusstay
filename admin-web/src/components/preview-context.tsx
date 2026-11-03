"use client";
import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { ApplicationView, ConfirmedPreviewReview } from "@/lib/contracts";
import { applyPreviewReview } from "@/lib/mock-adapter";
import { createSyntheticApplications, previewReviewer } from "@/lib/mock-data";
import { PropertyPreviewProvider } from "./property-preview-context";
type State = { records: ApplicationView[]; notice: string; error: string };
type Action =
  | { type: "review"; review: ConfirmedPreviewReview; now: string }
  | { type: "note"; id: string; note: string }
  | { type: "reset" };
export function previewReducer(state: State, action: Action): State {
  if (action.type === "reset")
    return {
      records: createSyntheticApplications(),
      notice: "Synthetic examples restored for this page session.",
      error: "",
    };
  if (action.type === "note")
    return {
      ...state,
      records: state.records.map((r) =>
        r.application.id === action.id
          ? { ...r, internalNote: action.note.slice(0, 2000) }
          : r,
      ),
      notice:
        "Preview note kept in memory only. No backend record was changed.",
      error: "",
    };
  try {
    return {
      records: applyPreviewReview(
        state.records,
        action.review,
        previewReviewer,
        { nodeEnv: process.env.NODE_ENV, optIn: "1" },
        action.now,
      ),
      notice:
        "Preview decision updated in memory only. No role granted, message sent or Supabase record changed.",
      error: "",
    };
  } catch (e) {
    return {
      ...state,
      notice: "",
      error: e instanceof Error ? e.message : "Preview action unavailable.",
    };
  }
}
const Context = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(previewReducer, undefined, () => ({
    records: createSyntheticApplications(),
    notice: "",
    error: "",
  }));
  return (
    <Context.Provider value={{ state, dispatch }}>
      <PropertyPreviewProvider>{children}</PropertyPreviewProvider>
    </Context.Provider>
  );
}
export function usePreview() {
  const value = useContext(Context);
  if (!value) throw new Error("Preview context missing.");
  return value;
}
