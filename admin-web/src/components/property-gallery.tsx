"use client";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import type { PropertyImage } from "@/lib/property-contracts";
import { EmptyState } from "./ui";

export function PropertyGallery({
  images,
  label,
}: {
  images: PropertyImage[];
  label: string;
}) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const modal = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const available = images.filter((image) => !failed.includes(image.id));
  const index = selected < available.length ? selected : 0;
  const current = available[index];
  if (!current)
    return (
      <EmptyState
        title="No sample images available"
        detail="No photo evidence can be reviewed here. Missing images must be supplied before listing approval."
      />
    );
  const imageFailed = () =>
    setFailed((current) => [...current, available[index].id]);
  const step = (direction: number) =>
    setSelected((index + direction + available.length) % available.length);
  return (
    <div className="property-gallery" role="group" aria-label={label}>
      <button
        className="gallery-stage"
        onClick={() => modal.current?.showModal()}
        aria-label={`Open full image: ${current.caption}`}
      >
        <Image
          src={current.src}
          alt={current.alt}
          width={520}
          height={260}
          onError={imageFailed}
        />
        <span>
          <Expand size={15} aria-hidden="true" />
          {current.caption}
        </span>
      </button>
      <div
        className="gallery-thumbnails"
        role="group"
        aria-label={`${label} thumbnails`}
      >
        {available.map((image, i) => (
          <button
            key={image.id}
            aria-pressed={index === i}
            aria-label={`Select image ${i + 1}: ${image.caption}`}
            onClick={() => setSelected(i)}
          >
            <Image src={image.src} alt="" width={80} height={48} />
            <span className="sr-only">{image.caption}</span>
          </button>
        ))}
      </div>
      <p className="small-note">
        Image {index + 1} of {available.length} · Local synthetic illustrations,
        not photographs of real accommodation.
      </p>
      <dialog
        className="confirmation-dialog gallery-lightbox"
        ref={modal}
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            step(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div className="gallery-lightbox-heading">
          <h2 id={titleId}>{label}</h2>
          <button
            className="icon-button"
            autoFocus
            onClick={() => modal.current?.close()}
            aria-label="Close image preview"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <Image src={current.src} alt={current.alt} width={1040} height={520} />
        <p aria-live="polite">
          {current.caption} · Image {index + 1} of {available.length}
        </p>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={available.length < 2}
            onClick={() => step(-1)}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Previous image
          </button>
          <button
            className="button secondary"
            disabled={available.length < 2}
            onClick={() => step(1)}
          >
            Next image
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="small-note">
          Sample illustrations only. No real property images or private
          documents are loaded.
        </p>
      </dialog>
    </div>
  );
}
