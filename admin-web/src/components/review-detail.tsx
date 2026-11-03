"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { ConfirmedPreviewReview, ReviewDecision } from "@/lib/contracts";
import { statusLabels } from "@/lib/contracts";
import {
  checklistError,
  confirmationItems,
  emptyConfirmations,
  previewDecisionNotice,
  reasonError,
} from "@/lib/review-safety";
import { usePreview } from "./preview-context";
import {
  Avatar,
  EmptyState,
  SectionHeading,
  StatusBadge,
  formatDate,
} from "./ui";
export function ApplicationDetail({ id }: { id: string }) {
  const { state } = usePreview();
  const revision = state.records.find((r) => r.application.id === id)
    ?.application.revision;
  return <ApplicationReview key={`${id}:${revision}`} id={id} />;
}
type PendingPreview = Omit<ConfirmedPreviewReview, "confirmation">;
function ApplicationReview({ id }: { id: string }) {
  const { state, dispatch } = usePreview();
  const record = state.records.find((r) => r.application.id === id);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState(() =>
    record?.previewDecision
      ? { ...record.previewDecision.confirmations }
      : emptyConfirmations(),
  );
  const [pending, setPending] = useState<PendingPreview | null>(null);
  const pendingRef = useRef<PendingPreview | null>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const firstCheckbox = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [checkError, setCheckError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const completedNotice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (record?.previewDecision) completedNotice.current?.focus();
  }, [record?.previewDecision]);
  if (!record)
    return (
      <EmptyState
        title="Application not found"
        detail="This example is unavailable. No record has been changed."
        action={
          <Link className="button secondary" href="/admin/applications">
            Back to applications
          </Link>
        }
      />
    );
  const a = record.application;
  const reviewable = a.status === "pending";
  function prepare(next: ReviewDecision) {
    if (!reviewable || dialog.current?.open) return;
    const invalidReason = reasonError(reason);
    const invalidChecklist = checklistError(next, confirmations);
    setError(invalidReason);
    setCheckError(invalidChecklist);
    if (invalidReason || invalidChecklist) {
      if (invalidReason) reasonInput.current?.focus();
      else firstCheckbox.current?.focus();
      return;
    }
    const snapshot: PendingPreview = {
      command: {
        p_application: id,
        p_revision: a.revision,
        p_decision: next,
        p_reason: reason.trim(),
      },
      confirmations: { ...confirmations },
    };
    pendingRef.current = snapshot;
    setPending(snapshot);
    dialog.current?.showModal();
  }
  function cancel() {
    pendingRef.current = null;
    setPending(null);
    dialog.current?.close();
  }
  function confirm() {
    const snapshot = pendingRef.current;
    if (!dialog.current?.open || !snapshot || snapshot !== pending) return;
    if (
      !reviewable ||
      snapshot.command.p_application !== id ||
      snapshot.command.p_revision !== a.revision ||
      snapshot.command.p_reason !== reason.trim() ||
      confirmationItems.some(
        (item) => snapshot.confirmations[item.key] !== confirmations[item.key],
      ) ||
      reasonError(snapshot.command.p_reason) ||
      checklistError(snapshot.command.p_decision, snapshot.confirmations)
    ) {
      cancel();
      setError(
        "This review changed. Check the details and open the confirmation again.",
      );
      reasonInput.current?.focus();
      return;
    }
    pendingRef.current = null;
    dispatch({
      type: "review",
      review: { ...snapshot, confirmation: "confirmed-in-dialog" },
      now: new Date().toISOString(),
    });
    dialog.current?.close();
  }
  return (
    <>
      <Link className="back-link" href="/admin/applications">
        <ArrowLeft size={17} aria-hidden="true" />
        Back to manager applications
      </Link>
      <div className="application-heading">
        <Avatar initials={record.initials} />
        <div>
          <span className="eyebrow">
            MANAGER VERIFICATION · SYNTHETIC RECORD
          </span>
          <h1>{a.full_name}</h1>
          <p>{a.business_name}</p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <div className="case-meta">
        <span>Submitted {formatDate(a.submitted_at)}</span>
        <span>Revision {a.revision}</span>
        <span className="case-id">Case {a.id.slice(-4)}</span>
      </div>
      <div className="detail-columns">
        <div className="detail-primary">
          <section className="panel padded">
            <SectionHeading
              title="Applicant overview"
              detail="Contact details below are non-deliverable examples."
            />
            <dl className="detail-list">
              <div>
                <dt>
                  <Mail size={15} aria-hidden="true" />
                  Email
                </dt>
                <dd>{record.contactEmail}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={15} aria-hidden="true" />
                  Phone
                </dt>
                <dd>{a.phone} · illustrative</dd>
              </div>
              <div>
                <dt>Business / accommodation</dt>
                <dd>{a.business_name}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={15} aria-hidden="true" />
                  Property location
                </dt>
                <dd>{a.property_location}</dd>
              </div>
            </dl>
            <div className="declaration">
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>
                  {a.relationship === "owner"
                    ? "Property owner declaration"
                    : "Authorised-manager declaration"}
                </strong>
                <p>
                  The applicant declares authority to manage this accommodation.
                  This example is not independently verified.
                </p>
              </div>
            </div>
          </section>
          <section className="panel padded">
            <SectionHeading
              title="Verification evidence"
              detail="Metadata layout only. No private document is loaded."
            />
            {a.proof ? (
              <div className="evidence-card">
                <span className="document-icon">
                  <FileText size={25} aria-hidden="true" />
                </span>
                <div>
                  <strong>{a.proof.file_name}</strong>
                  <p>
                    PDF · {Math.round(a.proof.byte_size / 1024)} KB · synthetic
                    metadata
                  </p>
                  <span className="evidence-lock">
                    <LockKeyhole size={12} aria-hidden="true" />
                    Private document access is not connected
                  </span>
                </div>
                <button
                  className="button secondary"
                  disabled
                  aria-label="Document preview unavailable"
                >
                  View document
                </button>
              </div>
            ) : (
              <EmptyState
                title="No supporting evidence"
                detail="This synthetic draft has no example proof metadata."
              />
            )}
          </section>
          <section className="panel padded">
            <SectionHeading
              title="Review history"
              detail="Sample events and decisions made in this preview session."
            />
            {record.history.length ? (
              <ol className="timeline">
                {record.history.map((h) => (
                  <li key={h.id}>
                    <span className="timeline-dot">
                      <Check size={11} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>
                        {h.action === "submitted"
                          ? "Application submitted"
                          : (statusLabels[h.action as ReviewDecision] ??
                            h.action.replaceAll("_", " "))}
                      </strong>
                      <time dateTime={h.occurred_at}>
                        {formatDate(h.occurred_at)} ·{" "}
                        {h.id.startsWith("preview-")
                          ? "Preview decision"
                          : "Sample event"}
                      </time>
                      <p>{h.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">This draft has not been submitted.</p>
            )}
          </section>
        </div>
        <aside className="detail-secondary">
          <section className="panel padded decision-panel">
            <SectionHeading
              title="Review decision"
              detail="Try the review layout with this synthetic record."
            />
            <p className="decision-boundary">
              A preview decision grants no real access, verifies no real
              evidence and sends no notification.
            </p>
            {!reviewable && (
              <div
                className="feedback"
                ref={completedNotice}
                tabIndex={-1}
                role="status"
              >
                {a.status === "draft"
                  ? "Drafts cannot be reviewed. Await submission."
                  : "This example has already been reviewed. The decision controls are locked."}
              </div>
            )}
            <fieldset
              className="review-checklist"
              disabled={!reviewable}
              aria-describedby="checklist-help checklist-error"
            >
              <legend>
                <ShieldCheck size={16} aria-hidden="true" />
                Simulated reviewer confirmations
              </legend>
              <p id="checklist-help" className="small-note">
                Required for approval only. Selecting these boxes does not
                verify real evidence or its authenticity.
              </p>
              {confirmationItems.map((item, index) => (
                <label key={item.key}>
                  <input
                    type="checkbox"
                    ref={index === 0 ? firstCheckbox : undefined}
                    checked={confirmations[item.key]}
                    aria-invalid={Boolean(checkError)}
                    aria-describedby="checklist-help checklist-error"
                    onChange={(e) =>
                      setConfirmations((current) => ({
                        ...current,
                        [item.key]: e.target.checked,
                      }))
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
              <p
                id="checklist-error"
                className="field-error"
                role={checkError ? "alert" : undefined}
              >
                {checkError}
              </p>
            </fieldset>
            <label className="field-label" htmlFor="review-reason">
              Review reason <span>Required for every decision</span>
            </label>
            <textarea
              id="review-reason"
              ref={reasonInput}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Record the reason for your preview decision…"
              rows={4}
              maxLength={2000}
              disabled={!reviewable}
              aria-describedby="reason-help reason-error"
              aria-invalid={Boolean(error)}
            />
            <p id="reason-help" className="small-note">
              The H1.3 review reason is applicant-visible. Do not put private
              reviewer notes here. Use 20–2,000 characters and at least three
              distinct words to explain the decision. Length alone does not
              establish that a reason is truthful or sufficient.
            </p>
            <p
              id="reason-error"
              role={error ? "alert" : undefined}
              className="field-error"
            >
              {error}
            </p>
            <div className="decision-actions">
              <button
                className="button primary"
                disabled={!reviewable}
                onClick={() => prepare("approved")}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Preview approve
              </button>
              <button
                className="button secondary"
                disabled={!reviewable}
                onClick={() => prepare("needs_information")}
              >
                Preview request information
              </button>
              <button
                className="button danger-outline"
                disabled={!reviewable}
                onClick={() => prepare("rejected")}
              >
                Preview reject
              </button>
            </div>
            {a.review_reason && (
              <div className="saved-reason">
                <strong>Recorded example reason</strong>
                <p>{a.review_reason}</p>
              </div>
            )}
          </section>
          <section className="panel padded">
            <SectionHeading
              title="Reviewer notes"
              detail="Local UI draft only; no H1.3 private-notes contract exists."
            />
            <label className="sr-only" htmlFor="internal-note">
              Internal preview note
            </label>
            <textarea
              id="internal-note"
              rows={3}
              value={note ?? record.internalNote}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="Keep an internal preview note…"
            />
            <button
              className="button secondary note-button"
              onClick={() => {
                dispatch({
                  type: "note",
                  id,
                  note: note ?? record.internalNote,
                });
              }}
            >
              Keep note in preview
            </button>
            <p className="small-note">
              Memory only. Never sent as the applicant-visible review reason.
            </p>
          </section>
        </aside>
      </div>
      <dialog
        className="confirmation-dialog"
        ref={dialog}
        aria-labelledby="confirm-title"
        aria-describedby="preview-disclosure"
        onCancel={cancel}
        onClose={() => {
          pendingRef.current = null;
          setPending(null);
        }}
      >
        <span className="metric-icon tone-blue">
          <ShieldCheck size={24} aria-hidden="true" />
        </span>
        <h2 id="confirm-title">Preview this decision?</h2>
        <div className="feedback" id="preview-disclosure">
          <strong>{previewDecisionNotice}</strong>
        </div>
        {pending && (
          <>
            <dl className="preview-summary">
              <div>
                <dt>Applicant</dt>
                <dd>{a.full_name}</dd>
              </div>
              <div>
                <dt>Accommodation / business</dt>
                <dd>{a.business_name}</dd>
              </div>
              <div>
                <dt>Proposed decision</dt>
                <dd>{statusLabels[pending.command.p_decision]}</dd>
              </div>
            </dl>
            {pending.command.p_decision === "approved" && (
              <>
                <p>
                  Real approval would grant Manager Workspace access. This
                  preview grants no access.
                </p>
                <p>
                  <strong>Simulated confirmation summary</strong>
                </p>
                <ul className="preview-check-summary">
                  {confirmationItems.map((item) => (
                    <li key={item.key}>
                      {item.label}:{" "}
                      {pending.confirmations[item.key]
                        ? "Confirmed for preview"
                        : "Not confirmed"}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="saved-reason">
              <strong>Applicant-visible review reason</strong>
              <p>{pending.command.p_reason}</p>
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
            Confirm preview decision
          </button>
        </div>
      </dialog>
    </>
  );
}
