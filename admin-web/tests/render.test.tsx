import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Applications,
  Overview,
  Properties,
  UsersPage,
  AuditPage,
  SettingsPage,
} from "../src/components/pages";
import { ApplicationDetail } from "../src/components/review-detail";
import {
  PreviewProvider,
  previewReducer,
} from "../src/components/preview-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "../src/components/ui";
import { createSyntheticApplications } from "../src/lib/mock-data";
import { applicationStatuses, statusLabels } from "../src/lib/contracts";
const render = (component: React.ReactNode) =>
  renderToStaticMarkup(<PreviewProvider>{component}</PreviewProvider>);
test("overview renders synthetic totals, chart text and review links", () => {
  const html = render(<Overview />);
  for (const title of [
    "Pending applications",
    "Approved managers",
    "Properties awaiting review",
    "Registered users",
    "The review queue",
    "Application status",
  ])
    assert.ok(html.includes(title));
  assert.ok(html.includes("Pending: 3"));
  assert.ok(html.includes("/admin/applications/"));
});
test("application list renders semantic table, labelled controls and all records", () => {
  const html = render(<Applications />);
  assert.ok(html.includes("<table>"));
  assert.ok(html.includes('scope="col"'));
  assert.ok(html.includes("Search manager applications"));
  assert.ok(html.includes("8 of 8 example applications"));
  for (const r of createSyntheticApplications())
    assert.ok(html.includes(r.application.full_name));
});
test("every status uses a readable textual label", () => {
  for (const s of applicationStatuses)
    assert.ok(
      renderToStaticMarkup(<StatusBadge status={s} />).includes(
        statusLabels[s],
      ),
    );
});
test("detail provides contact, evidence metadata, reason, notes and guarded actions", () => {
  const html = render(
    <ApplicationDetail id={createSyntheticApplications()[0].application.id} />,
  );
  for (const label of [
    "Applicant overview",
    "Verification evidence",
    "Review history",
    "Reviewer notes",
    "Preview approve",
    "Preview reject",
    "Demo preview only",
    "Simulated reviewer confirmations",
    "applicant-visible",
    "does not verify real evidence",
  ])
    assert.ok(html.includes(label));
  assert.ok(html.includes('aria-describedby="reason-help reason-error"'));
  assert.ok(!html.includes("supabase.co"));
  assert.ok(!html.includes("<iframe"));
  assert.ok(html.includes("Document preview unavailable"));
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 3);
  assert.ok(!html.includes('checked=""'));
  assert.ok(html.includes('aria-describedby="checklist-help checklist-error"'));
});
test("unknown detail recovers safely; drafts cannot be approved", () => {
  assert.ok(
    render(<ApplicationDetail id="missing" />).includes(
      "Application not found",
    ),
  );
  const html = render(
    <ApplicationDetail id={createSyntheticApplications()[7].application.id} />,
  );
  assert.ok(html.includes("Drafts cannot be reviewed"));
  assert.match(html, /disabled=""[^>]*>.*?Preview approve/);
});
test("property, directory, audit and settings pages communicate separate boundaries", () => {
  assert.ok(render(<Properties />).includes("not verified live vacancies"));
  assert.ok(
    render(<UsersPage />).includes("permission changes are unavailable"),
  );
  assert.ok(
    render(<AuditPage />).includes("not persistent administrative audit logs"),
  );
  assert.ok(render(<SettingsPage />).includes("production denied"));
});
test("loading, empty and error states are rendered with status and alert semantics", () => {
  assert.ok(renderToStaticMarkup(<LoadingState />).includes('role="status"'));
  assert.ok(
    renderToStaticMarkup(<ErrorState retry={() => {}} />).includes(
      'role="alert"',
    ),
  );
  assert.ok(
    renderToStaticMarkup(<EmptyState />).includes("Try a different search"),
  );
});
test("internal preview notes remain independent of applicant-visible reason", () => {
  const records = createSyntheticApplications();
  const before = records[0].application;
  const state = previewReducer(
    { records, notice: "", error: "" },
    { type: "note", id: before.id, note: "Private local draft" },
  );
  assert.equal(state.records[0].internalNote, "Private local draft");
  assert.deepEqual(state.records[0].application, before);
  assert.equal(state.records[1].internalNote, "");
});
