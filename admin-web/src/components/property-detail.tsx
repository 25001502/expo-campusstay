"use client";
import {
  ArrowLeft,
  Bath,
  BedSingle,
  BookOpen,
  Building2,
  Car,
  Check,
  CookingPot,
  Droplets,
  Plug,
  ShieldCheck,
  WashingMachine,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { amenityLabels, type PropertyReview } from "@/lib/property-contracts";
import {
  formatRent,
  managerEligible,
  propertyApprovalBlock,
  roomSummary,
} from "@/lib/property-review";
import { usePropertyPreview } from "./property-preview-context";
import { PropertyGallery } from "./property-gallery";
import { ManagerStateBadge, PropertyStatusBadge } from "./property-ui";
import { PropertyDecisionPanel } from "./property-decision";
import {
  EmptyState,
  SectionHeading,
  StatusBadge,
  formatDate,
  formatTimestamp,
} from "./ui";

const amenityIcons = {
  wifi: Wifi,
  security: ShieldCheck,
  electricity: Plug,
  water: Droplets,
  parking: Car,
  laundry: WashingMachine,
  study: BookOpen,
  bathrooms: Bath,
  kitchen: CookingPot,
};
export function PropertyDetail({ id }: { id: string }) {
  const { state } = usePropertyPreview();
  const property = state.records.find((record) => record.id === id);
  if (!property)
    return (
      <EmptyState
        title="Property not found"
        detail="This synthetic property is unavailable. No listing has been changed."
        action={
          <Link className="button secondary" href="/admin/properties">
            Back to Property Reviews
          </Link>
        }
      />
    );
  return (
    <PropertyReviewDetails
      key={`${property.id}:${property.revision}`}
      property={property}
    />
  );
}
export function PropertyReviewDetails({
  property,
}: {
  property: PropertyReview;
}) {
  const { state, dispatch } = usePropertyPreview();
  const [note, setNote] = useState(property.internalNote);
  const totals = roomSummary(property);
  return (
    <>
      <Link className="back-link" href="/admin/properties">
        <ArrowLeft size={17} aria-hidden="true" />
        Back to Property Reviews
      </Link>
      <div className="application-heading property-heading">
        <span className="metric-icon tone-blue">
          <Building2 size={24} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">
            PROPERTY MODERATION · SYNTHETIC RECORD
          </span>
          <h1>{property.name}</h1>
          <p>{property.city}</p>
        </div>
        <PropertyStatusBadge status={property.status} />
      </div>
      <div className="case-meta">
        <span>Submitted {formatDate(property.submittedAt)}</span>
        <span>Manager: {property.manager.name}</span>
        <span>Revision {property.revision}</span>
      </div>
      {state.notice && (
        <p className="feedback" role="status">
          {state.notice}
        </p>
      )}
      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="detail-columns property-review-columns">
        <div className="detail-primary">
          <section className="panel padded">
            <SectionHeading
              title="Property overview"
              detail="Illustrative listing information, not independently verified."
            />
            <dl className="detail-list">
              <div>
                <dt>Full address</dt>
                <dd>{property.address}</dd>
              </div>
              <div>
                <dt>Property type</dt>
                <dd>{property.category}</dd>
              </div>
              <div>
                <dt>Responsible manager</dt>
                <dd>{property.manager.name}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>
                  {property.contactEmail}
                  <br />
                  {property.contactPhone} · non-deliverable examples
                </dd>
              </div>
              <div>
                <dt>Declared room quantity</dt>
                <dd>
                  {totals.quantity} rooms listed · not verified live vacancies
                </dd>
              </div>
              <div>
                <dt>Indicative starting rent</dt>
                <dd>
                  {totals.startingRent === null
                    ? "Not supplied"
                    : `${formatRent(totals.startingRent)} / month`}
                </dd>
              </div>
            </dl>
            <p className="property-description">{property.description}</p>
          </section>
          <section className="panel padded">
            <SectionHeading
              title="Property photo gallery"
              detail="Local synthetic illustrations only. No real property images are accessed."
            />
            <PropertyGallery
              images={property.images}
              label="Property photo gallery"
            />
          </section>
          <section className="panel padded">
            <SectionHeading
              title="Declared room types"
              detail="Advertised quantities are not verified live vacancies. Prices are indicative monthly ZAR rent."
            />
            {property.roomTypes.length ? (
              <div className="review-room-grid">
                {property.roomTypes.map((room) => (
                  <article key={room.id} className="review-room-card">
                    <h3>
                      <BedSingle size={19} aria-hidden="true" />
                      {room.type}
                    </h3>
                    <p>{room.description}</p>
                    <dl className="compact-definition">
                      <div>
                        <dt>Declared capacity</dt>
                        <dd>
                          {room.capacity}{" "}
                          {room.capacity === 1
                            ? "person · single occupancy"
                            : "people · shared occupancy"}
                        </dd>
                      </div>
                      <div>
                        <dt>Monthly rent</dt>
                        <dd>{formatRent(room.monthlyRent)} / month</dd>
                      </div>
                      <div>
                        <dt>Declared quantity</dt>
                        <dd>{room.quantity} rooms listed</dd>
                      </div>
                      <div>
                        <dt>Furnishing</dt>
                        <dd>{room.furnishing ?? "Not supplied"}</dd>
                      </div>
                    </dl>
                    <p className="small-note">
                      {room.fundingClaim
                        ? `Funding claim: ${room.fundingClaim}`
                        : "No funding compatibility claim supplied. Funding eligibility is not verified."}
                    </p>
                    {room.images.length ? (
                      <PropertyGallery
                        images={room.images}
                        label={`${room.type} sample images`}
                      />
                    ) : (
                      <p className="small-note">No room photos supplied.</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No room types supplied"
                detail="Declared room details are required before listing approval."
              />
            )}
          </section>
          <section className="panel padded">
            <SectionHeading
              title="Amenities and facilities"
              detail="Applicant-supplied example claims. Facilities have not been independently verified or inferred from images."
            />
            {property.amenities.length ? (
              <ul className="review-amenities">
                {property.amenities.map((amenity) => {
                  const Icon = amenityIcons[amenity.type];
                  return (
                    <li key={amenity.type}>
                      <Icon size={19} aria-hidden="true" />
                      <div>
                        <strong>{amenityLabels[amenity.type]}</strong>
                        <p>{amenity.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="No amenities declared"
                detail="No facilities can be inferred from the sample illustrations."
              />
            )}
          </section>
          <section className="panel padded">
            <SectionHeading
              title="Listing review history"
              detail="Sample events and session-only preview decisions; not persistent or immutable audit logs."
            />
            <ol className="timeline">
              {property.history.map((event) => (
                <li key={event.id}>
                  <span className="timeline-dot">
                    <Check size={11} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {event.action === "submitted"
                        ? "Listing submitted"
                        : event.action === "information_requested"
                          ? "Additional information requested"
                          : event.action === "reviewed"
                            ? "Listing reviewed · sample"
                            : event.action === "approved"
                              ? "Listing approved in preview"
                              : event.action === "changes_requested"
                                ? "Changes requested in preview"
                                : "Listing rejected in preview"}
                    </strong>
                    <time dateTime={event.at}>
                      {formatTimestamp(event.at)} ·{" "}
                      {event.source === "sample"
                        ? "Synthetic sample event"
                        : "Session preview decision"}
                    </time>
                    <p>{event.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="detail-secondary">
          <section className="panel padded">
            <SectionHeading
              title="Manager verification"
              detail="Synthetic trusted-authorisation scenario, not a real account permission."
            />
            <ManagerStateBadge manager={property.manager} />
            <dl className="detail-list">
              <div>
                <dt>Manager</dt>
                <dd>{property.manager.name}</dd>
              </div>
              <div>
                  <dt>Verification baseline</dt>
                <dd>
                  <StatusBadge status={property.manager.verificationStatus} />
                </dd>
              </div>
              <div>
                <dt>Manager access</dt>
                <dd>
                  {property.manager.authorization === "none"
                    ? "Not granted"
                    : property.manager.authorization}
                </dd>
              </div>
            </dl>
            <p className="small-note">
              A declaration, manager intent or submitted application is not
              trusted permission. Manager application previews do not grant
              authorisation or publish this property.
            </p>
            <p
              className={
                managerEligible(property.manager) ? "feedback" : "field-error"
              }
            >
              {managerEligible(property.manager)
                ? "This synthetic manager has approved, active access. The listing still requires its own moderation decision. No real permission is granted."
                : propertyApprovalBlock(property)}
            </p>
            {property.manager.applicationId && (
              <Link
                className="text-link"
                href={`/admin/applications/${property.manager.applicationId}`}
              >
                View manager application
              </Link>
            )}
          </section>
          <PropertyDecisionPanel property={property} />
          <section className="panel padded">
            <SectionHeading
              title="Internal property notes"
              detail="Memory-only reviewer draft, separate from manager-visible feedback."
            />
            <label className="field-label" htmlFor="property-note">
              Internal preview note
            </label>
            <textarea
              id="property-note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <button
              className="button secondary note-button"
              onClick={() => dispatch({ type: "note", id: property.id, note })}
            >
              Keep property note in preview
            </button>
            <p className="small-note">
              Not sent to the manager or saved to a service. Nothing entered
              here becomes the review reason.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
