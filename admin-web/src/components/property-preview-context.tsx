"use client";
import { createContext, useContext, useReducer, type ReactNode } from "react";
import { previewAllowed } from "../../security.mjs";
import type {
  ConfirmedPropertyReview,
  PropertyReview,
} from "@/lib/property-contracts";
import { createSyntheticProperties } from "@/lib/property-data";
import { applyPropertyReview } from "@/lib/property-review";
import { previewReviewer } from "@/lib/mock-data";

type PropertyState = {
  records: PropertyReview[];
  notice: string;
  error: string;
};
type PropertyAction =
  | { type: "review"; review: ConfirmedPropertyReview; now: string }
  | { type: "note"; id: string; note: string }
  | { type: "reset" };
export function propertyPreviewReducer(
  state: PropertyState,
  action: PropertyAction,
): PropertyState {
  const mode = { nodeEnv: process.env.NODE_ENV, optIn: "1" };
  if (!previewAllowed(mode.nodeEnv, mode.optIn))
    return {
      ...state,
      notice: "",
      error: "Property preview action unavailable.",
    };
  if (action.type === "reset")
    return {
      records: createSyntheticProperties(),
      notice: "Synthetic property examples restored for this session.",
      error: "",
    };
  if (action.type === "note")
    return {
      ...state,
      records: state.records.map((property) =>
        property.id === action.id
          ? { ...property, internalNote: action.note.slice(0, 2000) }
          : property,
      ),
      notice:
        "Internal property note kept in memory only; no service was changed.",
      error: "",
    };
  try {
    return {
      records: applyPropertyReview(
        state.records,
        action.review,
        previewReviewer,
        mode,
        action.now,
      ),
      notice:
        "Listing decision previewed in memory only. Nothing was published, no permission changed and no notification was sent.",
      error: "",
    };
  } catch (error) {
    return {
      ...state,
      notice: "",
      error:
        error instanceof Error
          ? error.message
          : "Property preview unavailable.",
    };
  }
}
const Context = createContext<{
  state: PropertyState;
  dispatch: React.Dispatch<PropertyAction>;
} | null>(null);
export function PropertyPreviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    propertyPreviewReducer,
    undefined,
    () => ({ records: createSyntheticProperties(), notice: "", error: "" }),
  );
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  );
}
export function usePropertyPreview() {
  const value = useContext(Context);
  if (!value) throw new Error("Property preview context missing.");
  return value;
}
