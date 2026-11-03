import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  ConfirmedPropertyReview,
  PropertyDecision,
} from "../src/lib/property-contracts";
import { propertyChecklistItems } from "../src/lib/property-contracts";
import { createSyntheticProperties } from "../src/lib/property-data";
import {
  applyPropertyReview,
  emptyPropertyConfirmations,
  filterProperties,
  managerEligible,
  managerState,
  propertyApprovalBlock,
  roomSummary,
} from "../src/lib/property-review";
import {
  createSyntheticApplications,
  previewReviewer,
} from "../src/lib/mock-data";
import { applyPreviewReview } from "../src/lib/mock-adapter";
import { PreviewProvider } from "../src/components/preview-context";
import { propertyPreviewReducer } from "../src/components/property-preview-context";
import { PropertyReviews } from "../src/components/property-list";
import {
  PropertyDetail,
  PropertyReviewDetails,
} from "../src/components/property-detail";
import { PropertyGallery } from "../src/components/property-gallery";
import { PreviewPage } from "../src/components/pages";

const fixtures = createSyntheticProperties;
const mode = { nodeEnv: "development", optIn: "1" };
const now = "2026-10-23T16:00:00.000Z";
const reason =
  "The synthetic listing details meet the illustrative property review criteria.";
const complete = () => ({
  location: true,
  description: true,
  rooms: true,
  photos: true,
  amenities: true,
  manager: true,
});
const review = (
  decision: PropertyDecision = "approved",
  propertyId = "property-hillcrest",
): ConfirmedPropertyReview => ({
  propertyId,
  revision: 1,
  decision,
  reason,
  confirmations: complete(),
  confirmation: "confirmed-in-dialog",
});
const render = (element: React.ReactNode) =>
  renderToStaticMarkup(<PreviewProvider>{element}</PreviewProvider>);

test("existing three properties retain IDs, names, room totals, rent and illustrative status", () => {
  assert.deepEqual(
    fixtures()
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        name: p.name,
        ...roomSummary(p),
        status: p.status,
      })),
    [
      {
        id: "property-oak",
        name: "Oak House Student Living",
        quantity: 24,
        startingRent: 2200,
        status: "awaiting_review",
      },
      {
        id: "property-hillcrest",
        name: "Hillcrest House",
        quantity: 18,
        startingRent: 2400,
        status: "awaiting_review",
      },
      {
        id: "property-acacia",
        name: "Acacia Student Village",
        quantity: 12,
        startingRent: 3500,
        status: "published_example",
      },
    ],
  );
});
test("all fixtures are synthetic with stable distinct room IDs, valid declared capacities and local assets", () => {
  const ids = new Set<string>();
  for (const p of fixtures()) {
    assert.equal(p.source, "synthetic");
    assert.equal(p.manager.source, "synthetic");
    assert.ok(p.contactEmail.endsWith("@example.invalid"));
    for (const room of p.roomTypes) {
      assert.ok(!ids.has(room.id));
      ids.add(room.id);
      assert.equal(room.capacity, room.type === "Single Room" ? 1 : 2);
      assert.ok(room.monthlyRent > 0 && room.quantity > 0);
    }
    for (const image of [
      ...p.images,
      ...p.roomTypes.flatMap((room) => room.images),
    ]) {
      assert.match(image.src, /^\/[a-z-]+\.svg$/);
      assert.ok(image.alt);
      assert.ok(existsSync(new URL(`../public${image.src}`, import.meta.url)));
    }
  }
});
test("search and combined status/manager filters do not mutate fixtures", () => {
  const records = fixtures(),
    before = structuredClone(records);
  for (const query of [" OAK ", "naledi", "PRETORIA", "12 Example Street"])
    assert.equal(
      filterProperties(records, query, "all", "all")[0].id,
      "property-oak",
    );
  assert.deepEqual(
    filterProperties(records, "", "awaiting_review", "approved").map(
      (p) => p.id,
    ),
    ["property-hillcrest"],
  );
  assert.equal(
    filterProperties(records, "", "all", "suspended")[0].id,
    "property-courtyard",
  );
  assert.equal(
    filterProperties(records, "", "all", "revoked")[0].id,
    "property-gardens",
  );
  assert.equal(filterProperties(records, "missing", "all", "all").length, 0);
  assert.deepEqual(records, before);
});
for (const id of [
  "property-oak",
  "property-courtyard",
  "property-gardens",
  "property-west-end",
])
  test(`${id} manager state blocks listing approval at adapter and UI`, () => {
    const record = fixtures().find((p) => p.id === id)!;
    assert.equal(managerEligible(record.manager), false);
    assert.ok(propertyApprovalBlock(record));
    assert.throws(
      () =>
        applyPropertyReview(
          fixtures(),
          review("approved", id),
          previewReviewer,
          mode,
          now,
        ),
      /authorisation/,
    );
    assert.match(
      render(<PropertyDetail id={id} />),
      /disabled=""[^>]*>.*?Preview approve listing/s,
    );
  });
test("approved application without active access, or active access without approval, stays ineligible", () => {
  const records = fixtures();
  records[1].manager.authorization = "none";
  assert.equal(managerState(records[1].manager), "inactive");
  assert.throws(
    () => applyPropertyReview(records, review(), previewReviewer, mode, now),
    /authorisation/,
  );
  records[1].manager.authorization = "active";
  records[1].manager.verificationStatus = "pending";
  assert.equal(managerEligible(records[1].manager), false);
  assert.throws(
    () => applyPropertyReview(records, review(), previewReviewer, mode, now),
    /authorisation/,
  );
});
test("manager application approval neither grants property authorisation nor approves/publishes listings", () => {
  const properties = fixtures(),
    before = structuredClone(properties);
  const apps = createSyntheticApplications();
  applyPreviewReview(
    apps,
    {
      command: {
        p_application: apps[0].application.id,
        p_revision: 1,
        p_decision: "approved",
        p_reason: reason,
      },
      confirmation: "confirmed-in-dialog",
      confirmations: { applicant: true, business: true, authority: true },
    },
    previewReviewer,
    mode,
    now,
  );
  assert.deepEqual(properties, before);
  assert.equal(properties[0].manager.authorization, "none");
  assert.equal(properties[0].status, "awaiting_review");
  assert.equal(properties[1].status, "awaiting_review");
});
for (const item of propertyChecklistItems)
  test(`approval requires ${item.key} reviewer confirmation`, () => {
    const value = review();
    value.confirmations[item.key] = false;
    assert.throws(
      () => applyPropertyReview(fixtures(), value, previewReviewer, mode, now),
      /all six/,
    );
  });
test("new-review checklists are unchecked independent values", () => {
  const first = emptyPropertyConfirmations();
  first.photos = true;
  assert.ok(
    Object.values(emptyPropertyConfirmations()).every(
      (value) => value === false,
    ),
  );
  assert.equal(fixtures()[1].previewDecision, undefined);
});
for (const text of [
  " ",
  "good",
  "okay",
  "yes",
  "approved",
  "a".repeat(40),
  "good ".repeat(10),
  "x".repeat(2001),
])
  test(`invalid property reason ${JSON.stringify(text.slice(0, 20))} is rejected`, () => {
    const value = review();
    value.reason = text;
    assert.throws(
      () => applyPropertyReview(fixtures(), value, previewReviewer, mode, now),
      /reason|placeholders/,
    );
  });
for (const decision of ["changes_requested", "rejected"] as const)
  test(`${decision} permits blocked managers and unchecked checklist, while requiring meaningful feedback`, () => {
    const value = review(decision, "property-oak");
    value.confirmations = emptyPropertyConfirmations();
    assert.equal(
      applyPropertyReview(fixtures(), value, previewReviewer, mode, now)[0]
        .status,
      decision,
    );
    value.reason = "good";
    assert.throws(
      () => applyPropertyReview(fixtures(), value, previewReviewer, mode, now),
      /reason/,
    );
  });
test("confirmed property approval changes only local target/history, never manager access or live publication", () => {
  const records = fixtures(),
    before = structuredClone(records),
    command = review();
  const changed = applyPropertyReview(
    records,
    command,
    previewReviewer,
    mode,
    now,
  );
  assert.equal(changed[1].status, "approved");
  assert.equal(changed[1].revision, 2);
  assert.equal(changed[1].history.at(-1)?.at, now);
  assert.equal(changed[1].history.at(-1)?.source, "session_preview");
  assert.equal(changed[1].previewDecision?.reason, reason);
  assert.deepEqual(changed[1].manager, before[1].manager);
  assert.deepEqual(
    changed.filter((p) => p.id !== command.propertyId),
    before.filter((p) => p.id !== command.propertyId),
  );
  command.confirmations.manager = false;
  assert.equal(changed[1].previewDecision?.confirmations.manager, true);
  assert.deepEqual(records, before);
  assert.throws(
    () => applyPropertyReview(changed, review(), previewReviewer, mode, now),
    /awaiting review/,
  );
  assert.equal(fixtures()[1].status, "awaiting_review");
});
test("stale revision, manager revocation, unconfirmed input, self-review and non-preview execution fail closed", () => {
  const records = fixtures();
  const stale = review();
  stale.revision = 99;
  assert.throws(
    () => applyPropertyReview(records, stale, previewReviewer, mode, now),
    /changed/,
  );
  records[1].manager.authorization = "revoked";
  assert.throws(
    () => applyPropertyReview(records, review(), previewReviewer, mode, now),
    /authorisation/,
  );
  assert.throws(
    () =>
      applyPropertyReview(
        fixtures(),
        {
          ...review(),
          confirmation: "not-confirmed",
        } as unknown as ConfirmedPropertyReview,
        previewReviewer,
        mode,
        now,
      ),
    /dialog/,
  );
  assert.throws(
    () =>
      applyPropertyReview(
        fixtures(),
        review(),
        { ...previewReviewer, id: fixtures()[1].manager.id },
        mode,
        now,
      ),
    /another manager/,
  );
  for (const env of ["test", "production", ""])
    assert.throws(
      () =>
        applyPropertyReview(
          fixtures(),
          review(),
          previewReviewer,
          { nodeEnv: env, optIn: "1" },
          now,
        ),
      /unavailable/,
    );
  assert.throws(
    () =>
      applyPropertyReview(
        fixtures(),
        review(),
        { ...previewReviewer, source: "verified-server" },
        mode,
        now,
      ),
    /unavailable/,
  );
});
test("missing listing evidence blocks approval and gives empty room totals without infinity", () => {
  const records = fixtures();
  records[1].images = [];
  records[1].roomTypes = [];
  assert.deepEqual(roomSummary(records[1]), {
    quantity: 0,
    startingRent: null,
  });
  assert.throws(
    () => applyPropertyReview(records, review(), previewReviewer, mode, now),
    /images and declared room/,
  );
});
test("list/detail routes, overview, rooms, facilities and manager boundaries render readably", () => {
  const list = render(<PropertyReviews />);
  for (const record of fixtures())
    assert.ok(list.includes(`/admin/properties/${record.id}`));
  for (const name of [
    "Listing status",
    "Manager verification / access",
    "synthetic properties",
    "not verified live vacancies",
  ])
    assert.ok(list.includes(name));
  const html = render(
    <PreviewPage path={["properties", "property-hillcrest"]} />,
  );
  for (const text of [
    "Property overview",
    "Property photo gallery",
    "Declared room types",
    "Single Room",
    "Shared Room",
    "Declared capacity",
    "Funding claim",
    "Amenities and facilities",
    "Wi-Fi",
    "Kitchen facilities",
    "Manager verification",
    "Listing review history",
    "manager-visible",
    "Simulated reviewer confirmations",
    "no listing will be published",
  ])
    assert.ok(html.includes(text), text);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 6);
  assert.ok(!html.includes('checked=""'));
  assert.ok(!html.includes("supabase.co"));
});
test("gallery, rooms, amenities and missing routes have useful empty states", () => {
  assert.ok(
    render(<PropertyDetail id="missing" />).includes("Property not found"),
  );
  assert.ok(
    render(
      <PropertyGallery images={[]} label="Empty sample gallery" />,
    ).includes("No sample images available"),
  );
  const record = fixtures()[1];
  record.roomTypes = [];
  record.amenities = [];
  record.images = [];
  const html = render(<PropertyReviewDetails property={record} />);
  for (const text of [
    "No room types supplied",
    "No amenities declared",
    "No sample images available",
  ])
    assert.ok(html.includes(text));
});
test("property reducer keeps notes separate, denies bypass and restores only synthetic session state", () => {
  const previous = process.env;
  try {
    process.env = { ...previous, NODE_ENV: "development" };
    const state = { records: fixtures(), notice: "", error: "" };
    const noted = propertyPreviewReducer(state, {
      type: "note",
      id: "property-hillcrest",
      note: "Internal local reviewer note",
    });
    const bad = review();
    bad.confirmations = emptyPropertyConfirmations();
    assert.equal(
      propertyPreviewReducer(noted, { type: "review", review: bad, now })
        .records,
      noted.records,
    );
    const result = propertyPreviewReducer(noted, {
      type: "review",
      review: review(),
      now,
    });
    assert.equal(result.error, "");
    assert.equal(
      result.records[1].internalNote,
      "Internal local reviewer note",
    );
    assert.equal(result.records[1].previewDecision?.reason, reason);
    assert.deepEqual(
      propertyPreviewReducer(result, { type: "reset" }).records,
      fixtures(),
    );
    process.env = { ...previous, NODE_ENV: "production" };
    assert.equal(
      propertyPreviewReducer(state, { type: "review", review: review(), now })
        .records,
      state.records,
    );
  } finally {
    process.env = previous;
  }
});
test("property preview modules contain no network, storage or privileged backend client calls", () => {
  for (const file of [
    "lib/property-contracts.ts",
    "lib/property-data.ts",
    "lib/property-review.ts",
    "components/property-preview-context.tsx",
    "components/property-detail.tsx",
    "components/property-list.tsx",
    "components/property-decision.tsx",
    "components/property-gallery.tsx",
  ]) {
    const source = readFileSync(
      new URL(`../src/${file}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /\bfetch\s*\(|\bcreateClient\s*\(|\.rpc\s*\(|\.from\s*\(|service_role|localStorage|sessionStorage|indexedDB/,
    );
  }
});
