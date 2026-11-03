"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { applicationStatuses, statusLabels } from "@/lib/contracts";
import { filterApplications } from "@/lib/mock-adapter";
import { previewReviewer, sampleUsers } from "@/lib/mock-data";
import { usePreview } from "./preview-context";
import {
  Avatar,
  EmptyState,
  SectionHeading,
  StatusBadge,
  formatDate,
  formatTimestamp,
} from "./ui";
import { ApplicationDetail } from "./review-detail";
import { PropertyReviews } from "./property-list";
import { PropertyDetail } from "./property-detail";
import { usePropertyPreview } from "./property-preview-context";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Overview() {
  const { state } = usePreview();
  const { state: propertyState } = usePropertyPreview();
  const records = state.records;
  const pending = records.filter((r) => r.application.status === "pending");
  const distribution = applicationStatuses.map((status) => ({
    status,
    count: records.filter((r) => r.application.status === status).length,
  }));
  const metrics = [
    {
      title: "Pending applications",
      value: pending.length,
      foot: "Ready for a careful review",
      icon: ClipboardCheck,
      tone: "blue",
    },
    {
      title: "Approved managers",
      value: records.filter((r) => r.application.status === "approved").length,
      foot: "Example approval records",
      icon: ShieldCheck,
      tone: "green",
    },
    {
      title: "Properties awaiting review",
      value: propertyState.records.filter((p) => p.status === "awaiting_review")
        .length,
      foot: "Separate listing decisions",
      icon: Building2,
      tone: "purple",
    },
    {
      title: "Registered users",
      value: sampleUsers.length,
      foot: "Synthetic directory entries",
      icon: Users,
      tone: "amber",
    },
  ];
  const activity = records
    .flatMap((r) =>
      r.history.map((h) => ({
        ...h,
        name: r.application.full_name,
        business: r.application.business_name,
      })),
    )
    .toSorted((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 4);
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE, AT A GLANCE"
        title="Overview"
        description="A considered view of the people and places awaiting review."
        action={
          <span className="date-chip">Illustrative snapshot · 23 Oct 2026</span>
        }
      />
      <div className="stat-grid">
        {metrics.map((m) => (
          <article className="stat-card" key={m.title}>
            <div className="stat-label">
              {m.title}
              <span className={`metric-icon tone-${m.tone}`}>
                <m.icon size={19} aria-hidden="true" />
              </span>
            </div>
            <strong className="stat-number">{m.value}</strong>
            <span className="stat-foot">{m.foot}</span>
          </article>
        ))}
      </div>
      <div className="overview-columns">
        <section className="panel queue-panel">
          <SectionHeading
            title="The review queue"
            detail="Start with the next pending manager application."
            action={
              <Link className="text-link" href="/admin/applications">
                View all <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
          {pending.length ? (
            pending.map((r, i) => (
              <Link
                className="queue-row"
                href={`/admin/applications/${r.application.id}`}
                key={r.application.id}
              >
                <Avatar initials={r.initials} />
                <div className="queue-person">
                  <strong>{r.application.full_name}</strong>
                  <span>{r.application.business_name}</span>
                  <small>
                    <MapPin size={12} aria-hidden="true" />
                    {r.city}
                  </small>
                </div>
                <div className="queue-meta">
                  {i === 0 && <span className="next-tag">Next to review</span>}
                  <span>{formatDate(r.application.submitted_at)}</span>
                </div>
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
            ))
          ) : (
            <EmptyState
              title="The example queue is clear"
              detail="All pending synthetic applications have been reviewed in this page session."
            />
          )}
        </section>
        <section className="panel distribution">
          <SectionHeading
            title="Application status"
            detail="Distribution of the eight synthetic examples."
          />
          <div className="donut-wrap">
            <svg
              viewBox="0 0 120 120"
              role="img"
              aria-label={distribution
                .map((d) => `${statusLabels[d.status]}: ${d.count}`)
                .join(", ")}
            >
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="12"
              />
              {distribution.map((d, i) => {
                const dash = (d.count / records.length) * 289.0265;
                const offset = distribution
                  .slice(0, i)
                  .reduce(
                    (sum, segment) =>
                      sum + (segment.count / records.length) * 289.0265,
                    0,
                  );
                return (
                  <circle
                    key={d.status}
                    className={`chart-${d.status}`}
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    strokeWidth="12"
                    strokeDasharray={`${dash} ${289.0265 - dash}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 60 60)"
                  />
                );
              })}
              <text x="60" y="59" textAnchor="middle" className="donut-total">
                {records.length}
              </text>
              <text x="60" y="75" textAnchor="middle" className="donut-caption">
                examples
              </text>
            </svg>
          </div>
          <ul className="chart-legend">
            {distribution.map((d) => (
              <li key={d.status}>
                <span>
                  <i className={`legend-dot chart-${d.status}`} />
                  {statusLabels[d.status]}
                </span>
                <strong>{d.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="overview-columns lower">
        <section className="panel">
          <SectionHeading
            title="Recent activity"
            detail="Sample history and this session’s preview decisions."
            action={
              <Link className="text-link" href="/admin/audit">
                View sample logs <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
          <div className="activity-list">
            {activity.map((a) => (
              <div className="activity-row" key={a.id}>
                <span className="activity-icon">
                  <Clock3 size={17} aria-hidden="true" />
                </span>
                <div>
                  <strong>{a.name}</strong>
                  <p>
                    {a.action === "submitted"
                      ? "Submitted a manager application"
                      : `${a.action.replaceAll("_", " ")} · preview record`}
                  </p>
                  <small>{a.business}</small>
                </div>
                <time dateTime={a.occurred_at}>
                  {formatDate(a.occurred_at)}
                </time>
              </div>
            ))}
          </div>
        </section>
        <section className="panel review-guide">
          <span className="metric-icon tone-blue">
            <ShieldCheck size={23} aria-hidden="true" />
          </span>
          <h2>One decision at a time.</h2>
          <p>
            Review the applicant’s authority to manage accommodation. Property
            publication is a separate review.
          </p>
          <div className="guide-rule">
            <span>01</span>Understand the application
          </div>
          <div className="guide-rule">
            <span>02</span>Review supporting evidence
          </div>
          <div className="guide-rule">
            <span>03</span>Record a clear reason
          </div>
          <p className="small-note">
            Private documents and real decisions remain unavailable in this
            frontend preview.
          </p>
        </section>
      </div>
    </>
  );
}
export function Applications() {
  const { state } = usePreview();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const filtered = filterApplications(state.records, query, status, sort);
  return (
    <>
      <PageHeading
        title="Manager Applications"
        description="Review the people behind the accommodation. Every record here is synthetic."
      />
      <section className="panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search manager applications</span>
            <input
              type="search"
              placeholder="Search applicant, business or location"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="select-label">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {applicationStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Applicant name</option>
            </select>
          </label>
        </div>
        <div className="result-count" role="status">
          {filtered.length} of {state.records.length} example applications
        </div>
        {filtered.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Manager applications table"
          >
            <table>
              <caption className="sr-only">
                Synthetic manager applications
              </caption>
              <thead>
                <tr>
                  <th scope="col">Applicant</th>
                  <th scope="col">Accommodation</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.application.id}>
                    <td>
                      <div className="table-person">
                        <Avatar initials={r.initials} small />
                        <strong>{r.application.full_name}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>{r.application.business_name}</strong>
                      <small>{r.city}</small>
                    </td>
                    <td className="date-cell">
                      {formatDate(r.application.submitted_at)}
                    </td>
                    <td>
                      <StatusBadge status={r.application.status} />
                    </td>
                    <td>
                      <Link
                        className="table-action"
                        href={`/admin/applications/${r.application.id}`}
                        aria-label={`View ${r.application.full_name} application`}
                      >
                        View details{" "}
                        <ChevronRight size={15} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            action={
              <button
                className="button secondary"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
              >
                Clear filters
              </button>
            }
          />
        )}
      </section>
    </>
  );
}
export function Properties() {
  return <PropertyReviews />;
}
export function UsersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const filtered = sampleUsers.filter(
    (u) =>
      `${u.name} ${u.role} ${u.access}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (role === "all" || u.role === role),
  );
  return (
    <>
      <PageHeading
        title="Users & Managers"
        description="An illustrative directory. Account and permission changes are unavailable."
      />
      <section className="panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search users and managers</span>
            <input
              type="search"
              placeholder="Search name or access state"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="select-label">
            Account type
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">All account types</option>
              {[
                "Student",
                "Manager applicant",
                "Approved manager",
                "Manager",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Synthetic user directory"
          >
            <table>
              <caption className="sr-only">
                Synthetic users and managers
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Account type</th>
                  <th scope="col">Manager access</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.role}</td>
                    <td>
                      <span className={`badge access-${u.access}`}>
                        {u.access === "none" ? "Not granted" : u.access}
                      </span>
                    </td>
                    <td>{u.joined}</td>
                    <td>
                      <details className="inline-details">
                        <summary>View account</summary>
                        <p>
                          Synthetic account only. No real identity,
                          authentication session or role assignment exists.
                        </p>
                        <p>
                          Deletion, role changes and access management are
                          unavailable.
                        </p>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No matching accounts" />
        )}
      </section>
    </>
  );
}
export function AuditPage() {
  const { state } = usePreview();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const events = state.records
    .flatMap((r) =>
      r.history.map((h) => ({
        ...h,
        target: r.application.business_name,
        actor:
          h.actor_id === previewReviewer.id
            ? previewReviewer.label
            : r.application.full_name,
      })),
    )
    .toSorted((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const filtered = events.filter(
    (e) =>
      (action === "all" || e.action === action) &&
      `${e.actor} ${e.target} ${e.reason ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Audit Logs"
        description="Sample events and in-memory preview history. These are not persistent administrative audit logs."
      />
      <section className="panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search sample audit events</span>
            <input
              type="search"
              placeholder="Search actor, target or reason"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="select-label">
            Action
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="all">All actions</option>
              {["submitted", "approved", "needs_information", "rejected"].map(
                (a) => (
                  <option key={a} value={a}>
                    {a.replaceAll("_", " ")}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Example audit events"
          >
            <table>
              <caption className="sr-only">
                Sample audit history, not persisted
              </caption>
              <thead>
                <tr>
                  {[
                    "Actor",
                    "Action & target",
                    "Timestamp",
                    "Outcome",
                    "Reason",
                  ].map((h) => (
                    <th scope="col" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.actor}</strong>
                    </td>
                    <td>
                      {e.action.replaceAll("_", " ")}
                      <small>{e.target}</small>
                    </td>
                    <td>
                      <time dateTime={e.occurred_at}>
                        {formatTimestamp(e.occurred_at)}
                      </time>
                    </td>
                    <td>
                      <span className="badge status-draft">
                        {e.id.startsWith("preview-")
                          ? "Preview only"
                          : "Sample event"}
                      </span>
                    </td>
                    <td className="reason-cell">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No matching events" />
        )}
      </section>
    </>
  );
}
export function SettingsPage() {
  const { dispatch: propertyDispatch } = usePropertyPreview();
  const { dispatch } = usePreview();
  return (
    <>
      <PageHeading
        title="Settings"
        description="Workspace configuration and integration readiness."
      />
      <div className="settings-grid">
        <section className="panel padded">
          <SectionHeading
            title="Workspace"
            detail="CampusStay administration frontend"
          />
          <dl className="detail-list">
            <div>
              <dt>Environment</dt>
              <dd>Explicit development preview</dd>
            </div>
            <div>
              <dt>Data source</dt>
              <dd>Synthetic records · memory only</dd>
            </div>
            <div>
              <dt>Live Supabase operations</dt>
              <dd>Not connected</dd>
            </div>
            <div>
              <dt>Administrator authorization</dt>
              <dd>Not implemented · production denied</dd>
            </div>
          </dl>
          <p className="small-note">
            Refresh the browser to restore the illustrative baseline. Closing or
            navigating between pages does not save anything to a service.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              dispatch({ type: "reset" });
              propertyDispatch({ type: "reset" });
            }}
          >
            Reset synthetic examples
          </button>
        </section>
        <section className="panel padded">
          <SectionHeading title="Before backend integration" />
          <ul className="readiness-list">
            <li>Deploy and verify H1.3 in approved staging.</li>
            <li>Establish trusted server-side administrator authorization.</li>
            <li>
              Agree identity, reviewer and private-document read contracts.
            </li>
            <li>
              Validate RLS, revision conflicts, revocation and durable audit
              events.
            </li>
            <li>Define separate property moderation permissions.</li>
          </ul>
          <p className="small-note">
            No configuration on this page activates services or grants access.
          </p>
        </section>
      </div>
    </>
  );
}
export function PreviewPage({ path }: { path: string[] }) {
  if (path.length === 0) return <Overview />;
  if (path[0] === "applications" && path[1])
    return <ApplicationDetail key={path[1]} id={path[1]} />;
  if (path.length === 2 && path[0] === "properties")
    return <PropertyDetail key={path[1]} id={path[1]} />;
  switch (path[0]) {
    case "applications":
      return <Applications />;
    case "properties":
      return <Properties />;
    case "users":
      return <UsersPage />;
    case "audit":
      return <AuditPage />;
    case "settings":
      return <SettingsPage />;
    default:
      return (
        <EmptyState
          title="Page not found"
          action={<Link href="/admin">Return to overview</Link>}
        />
      );
  }
}
