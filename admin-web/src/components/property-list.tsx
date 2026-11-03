"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MapPin, Search } from "lucide-react";
import {
  propertyStatuses,
  propertyStatusLabels,
} from "@/lib/property-contracts";
import { exteriorIllustration } from "@/lib/property-data";
import {
  filterProperties,
  formatRent,
  managerStateLabels,
  roomSummary,
} from "@/lib/property-review";
import { usePropertyPreview } from "./property-preview-context";
import { EmptyState } from "./ui";
import { ManagerStateBadge, PropertyStatusBadge } from "./property-ui";

export function PropertyReviews() {
  const { state } = usePropertyPreview();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [manager, setManager] = useState("all");
  const properties = filterProperties(state.records, query, status, manager);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Property Reviews</h1>
          <p>
            Manager verification and listing approval are separate decisions.
            All properties and manager states shown are synthetic.
          </p>
        </div>
      </div>
      <section
        className="panel property-filters"
        aria-label="Property review filters"
      >
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search property reviews</span>
            <input
              type="search"
              placeholder="Search properties, locations or managers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="select-label">
            Listing status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All listing statuses</option>
              {propertyStatuses.map((value) => (
                <option value={value} key={value}>
                  {propertyStatusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            Manager verification / access
            <select
              value={manager}
              onChange={(event) => setManager(event.target.value)}
            >
              <option value="all">All manager states</option>
              {Object.entries(managerStateLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="result-count" role="status">
          {properties.length} of {state.records.length} synthetic properties
        </p>
      </section>
      {state.notice && (
        <p className="feedback" role="status">
          {state.notice}
        </p>
      )}
      <p className="small-note">
        Declared listed quantities are not verified live vacancies. Rent is
        indicative. Published examples are illustrative baselines, not live
        listings.
      </p>
      <div className="property-grid">
        {properties.map((property, index) => {
          const totals = roomSummary(property);
          const image = property.images[0] ?? exteriorIllustration;
          return (
            <article className="panel property-card" key={property.id}>
              <div className="property-illustration">
                <Image
                  src={image.src}
                  alt={
                    property.images.length
                      ? image.alt
                      : "Placeholder residence illustration; no property photos supplied"
                  }
                  width={520}
                  height={220}
                  loading={index === 0 ? "eager" : "lazy"}
                />
                <span>
                  {property.images.length
                    ? "Example illustration"
                    : "No images supplied · placeholder"}
                </span>
              </div>
              <div className="property-card-body">
                <PropertyStatusBadge status={property.status} />
                <h2>{property.name}</h2>
                <p className="location-line">
                  <MapPin size={15} aria-hidden="true" />
                  {property.city}
                </p>
                <dl className="compact-definition">
                  <div>
                    <dt>Manager</dt>
                    <dd>{property.manager.name}</dd>
                  </div>
                  <div>
                    <dt>Manager verification</dt>
                    <dd>
                      <ManagerStateBadge manager={property.manager} />
                    </dd>
                  </div>
                  <div>
                    <dt>Rooms listed</dt>
                    <dd>{totals.quantity} declared rooms</dd>
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
                <Link
                  className="button secondary property-details-link"
                  href={`/admin/properties/${property.id}`}
                  aria-label={`View ${property.name} property details`}
                >
                  View Details
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      {!properties.length && (
        <EmptyState
          title="No properties found"
          detail="Try a different search, listing status or manager state."
          action={
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setManager("all");
              }}
            >
              Clear property filters
            </button>
          }
        />
      )}
    </>
  );
}
