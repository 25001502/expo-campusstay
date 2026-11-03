import type { ReactNode } from "react";
import { ArrowUpRight, CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import { statusLabels, type ApplicationStatus } from "@/lib/contracts";
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}
export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title = "No applications found",
  detail = "Try a different search or status filter.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Inbox size={30} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="empty-state" role="status">
      <LoaderCircle className="loading-icon" aria-hidden="true" />
      <h2>Loading your workspace</h2>
      <p>Preparing the review interface.</p>
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <CircleAlert aria-hidden="true" />
      <h2>We couldn’t load this view</h2>
      <p>Please try again. No administrative change is confirmed.</p>
      <button className="button primary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
export function TextArrow() {
  return <ArrowUpRight size={16} aria-hidden="true" />;
}
export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Johannesburg",
      }).format(new Date(value))
    : "Not submitted";
}
export function formatTimestamp(value: string) {
  return `${new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Johannesburg" }).format(new Date(value))} SAST`;
}
export function Avatar({
  initials,
  small = false,
}: {
  initials: string;
  small?: boolean;
}) {
  return (
    <span className={`avatar ${small ? "small" : ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}
