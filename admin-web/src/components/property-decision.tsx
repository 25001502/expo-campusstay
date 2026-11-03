"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  propertyChecklistItems,
  propertyStatusLabels,
  type ConfirmedPropertyReview,
  type PropertyDecision,
  type PropertyReview,
} from "@/lib/property-contracts";
import {
  emptyPropertyConfirmations,
  managerEligible,
  propertyApprovalBlock,
  propertyChecklistError,
  propertyPreviewNotice,
} from "@/lib/property-review";
import { reasonError } from "@/lib/review-safety";
import { usePropertyPreview } from "./property-preview-context";
import { SectionHeading } from "./ui";

type Snapshot = Omit<ConfirmedPropertyReview, "confirmation">;
export function PropertyDecisionPanel({
  property,
}: {
  property: PropertyReview;
}) {
  const { dispatch } = usePropertyPreview();
  const [reason, setReason] = useState("");
  const [confirmations, setConfirmations] = useState(() =>
    property.previewDecision
      ? { ...property.previewDecision.confirmations }
      : emptyPropertyConfirmations(),
  );
  const [error, setError] = useState("");
  const [checkError, setCheckError] = useState("");
  const [pending, setPending] = useState<Snapshot | null>(null);
  const activeSnapshot = useRef<Snapshot | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const firstCheck = useRef<HTMLInputElement>(null);
  const completed = useRef<HTMLDivElement>(null);
  const reviewable = property.status === "awaiting_review";
  const blocked = propertyApprovalBlock(property);
  useEffect(() => {
    if (property.previewDecision) completed.current?.focus();
  }, [property.previewDecision]);
  function prepare(decision: PropertyDecision) {
    if (!reviewable || modal.current?.open) return;
    const invalidReason = reasonError(reason);
    const invalidChecks =
      decision === "approved"
        ? blocked || propertyChecklistError(decision, confirmations)
        : "";
    setError(invalidReason);
    setCheckError(invalidChecks);
    if (invalidReason || invalidChecks) {
      if (invalidReason) reasonInput.current?.focus();
      else firstCheck.current?.focus();
      return;
    }
    const snapshot: Snapshot = {
      propertyId: property.id,
      revision: property.revision,
      decision,
      reason: reason.trim(),
      confirmations: { ...confirmations },
    };
    activeSnapshot.current = snapshot;
    setPending(snapshot);
    modal.current?.showModal();
  }
  function cancel() {
    activeSnapshot.current = null;
    setPending(null);
    modal.current?.close();
  }
  function confirm() {
    const snapshot = activeSnapshot.current;
    if (!modal.current?.open || !snapshot || snapshot !== pending) return;
    if (
      !reviewable ||
      snapshot.propertyId !== property.id ||
      snapshot.revision !== property.revision ||
      snapshot.reason !== reason.trim() ||
      propertyChecklistItems.some(
        (item) => snapshot.confirmations[item.key] !== confirmations[item.key],
      ) ||
      reasonError(snapshot.reason) ||
      (snapshot.decision === "approved" &&
        (propertyApprovalBlock(property) ||
          propertyChecklistError(snapshot.decision, snapshot.confirmations)))
    ) {
      cancel();
      setError(
        "This listing review changed. Check the details and open confirmation again.",
      );
      reasonInput.current?.focus();
      return;
    }
    activeSnapshot.current = null;
    dispatch({
      type: "review",
      review: { ...snapshot, confirmation: "confirmed-in-dialog" },
      now: new Date().toISOString(),
    });
    modal.current?.close();
  }
  return (
    <section className="panel padded decision-panel property-decision-panel">
      <SectionHeading
        title="Listing review decision"
        detail="Simulate a separate property moderation decision."
      />
      <p className="decision-boundary">
        Manager approval alone never publishes a property. These client-side
        checks are preview safeguards, not production security.
      </p>
      {!reviewable && (
        <div className="feedback" role="status" ref={completed} tabIndex={-1}>
          This example has already been reviewed. Listing decision controls are
          locked for this session. No real publication occurred.
        </div>
      )}
      {blocked && (
        <p id="property-approval-block" className="field-error">
          {blocked}
        </p>
      )}
      <fieldset
        className="review-checklist"
        disabled={!reviewable}
        aria-describedby="property-check-help property-check-error"
      >
        <legend>
          <ShieldCheck size={16} aria-hidden="true" />
          Simulated reviewer confirmations
        </legend>
        <p className="small-note" id="property-check-help">
          Required for approval only. Checking a box does not establish factual
          accuracy. Photos here are sample illustrations.
        </p>
        {propertyChecklistItems.map((item, index) => (
          <label key={item.key}>
            <input
              type="checkbox"
              ref={index === 0 ? firstCheck : undefined}
              checked={confirmations[item.key]}
              disabled={
                (item.key === "manager" &&
                  !managerEligible(property.manager)) ||
                (item.key === "photos" && !property.images.length)
              }
              aria-describedby="property-check-help property-check-error"
              aria-invalid={Boolean(checkError)}
              onChange={(event) => {
                const checked = event.target.checked;
                setConfirmations((current) => ({
                  ...current,
                  [item.key]: checked,
                }));
              }}
            />
            <span>{item.label}</span>
          </label>
        ))}
        <p
          id="property-check-error"
          className="field-error"
          role={checkError ? "alert" : undefined}
        >
          {checkError}
        </p>
      </fieldset>
      <label className="field-label" htmlFor="property-reason">
        Listing review reason
        <span>Required for every decision · manager-visible feedback</span>
      </label>
      <textarea
        id="property-reason"
        ref={reasonInput}
        rows={4}
        value={reason}
        maxLength={2000}
        disabled={!reviewable}
        aria-describedby="property-reason-help property-reason-error"
        aria-invalid={Boolean(error)}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Explain the basis for approval, the changes needed or the grounds for rejection…"
      />
      <p className="small-note" id="property-reason-help">
        Use 20–2,000 characters and at least three distinct substantive words.
        Explain your chosen action. This feedback is manager-visible; keep
        internal notes separate. Length is not proof of truth or sufficiency.
      </p>
      <p
        id="property-reason-error"
        className="field-error"
        role={error ? "alert" : undefined}
      >
        {error}
      </p>
      <div className="decision-actions">
        <button
          className="button primary"
          disabled={!reviewable || Boolean(blocked)}
          aria-describedby={blocked ? "property-approval-block" : undefined}
          onClick={() => prepare("approved")}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          Preview approve listing
        </button>
        <button
          className="button secondary"
          disabled={!reviewable}
          onClick={() => prepare("changes_requested")}
        >
          Preview request changes
        </button>
        <button
          className="button danger-outline"
          disabled={!reviewable}
          onClick={() => prepare("rejected")}
        >
          Preview reject listing
        </button>
      </div>
      {property.previewDecision && (
        <div className="saved-reason">
          <strong>Recorded manager-visible feedback</strong>
          <p>{property.previewDecision.reason}</p>
        </div>
      )}
      <dialog
        className="confirmation-dialog"
        ref={modal}
        aria-labelledby="property-confirm-title"
        aria-describedby="property-preview-disclosure"
        onCancel={cancel}
        onClose={() => {
          activeSnapshot.current = null;
          setPending(null);
        }}
      >
        <span className="metric-icon tone-blue">
          <ShieldCheck size={24} aria-hidden="true" />
        </span>
        <h2 id="property-confirm-title">Preview this listing decision?</h2>
        <div className="feedback" id="property-preview-disclosure">
          <strong>{propertyPreviewNotice}</strong>
        </div>
        {pending && (
          <>
            <dl className="preview-summary">
              <div>
                <dt>Property</dt>
                <dd>{property.name}</dd>
              </div>
              <div>
                <dt>Responsible manager</dt>
                <dd>{property.manager.name}</dd>
              </div>
              <div>
                <dt>Proposed decision</dt>
                <dd>{propertyStatusLabels[pending.decision]}</dd>
              </div>
            </dl>
            <p>
              Real publication would require both active, trusted
              server-authorised manager access and a separately authorised
              property moderation decision. This preview changes neither
              publishing nor permissions.
            </p>
            <p>
              <strong>Simulated confirmation summary</strong>
              {pending.decision !== "approved" &&
                " · not required for this action"}
            </p>
            <ul className="preview-check-summary">
              {propertyChecklistItems.map((item) => (
                <li key={item.key}>
                  {item.label}:{" "}
                  {pending.confirmations[item.key]
                    ? "Confirmed for preview"
                    : "Not confirmed"}
                </li>
              ))}
            </ul>
            <div className="saved-reason">
              <strong>Manager-visible review reason</strong>
              <p>{pending.reason}</p>
            </div>
          </>
        )}
        <div className="button-row">
          <button className="button secondary" autoFocus onClick={cancel}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!pending || !reviewable}
            onClick={confirm}
          >
            Confirm listing preview
          </button>
        </div>
      </dialog>
    </section>
  );
}
