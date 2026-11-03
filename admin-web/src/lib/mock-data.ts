import { createSyntheticProperties } from "./property-data";
import type {
  ApplicationStatus,
  ApplicationView,
  AuthorizationState,
  ReviewerIdentity,
} from "./contracts";
export const previewNotice = "Demo preview — no changes saved to Supabase";
export const previewReviewer: ReviewerIdentity = {
  id: "90000000-0000-4000-8000-000000000001",
  label: "Preview reviewer",
  source: "synthetic",
};
const records: {
  name: string;
  business: string;
  city: string;
  initials: string;
  status: ApplicationStatus;
  relationship: "owner" | "authorised_manager";
}[] = [
  {
    name: "Naledi Mokoena",
    business: "Oak House Student Living",
    city: "Pretoria, Gauteng",
    initials: "NM",
    status: "pending",
    relationship: "owner",
  },
  {
    name: "Thabo Nkosi",
    business: "Parkside Residences",
    city: "Johannesburg, Gauteng",
    initials: "TN",
    status: "pending",
    relationship: "authorised_manager",
  },
  {
    name: "Ayesha Jacobs",
    business: "Cedar Student Lodge",
    city: "Cape Town, Western Cape",
    initials: "AJ",
    status: "needs_information",
    relationship: "owner",
  },
  {
    name: "Lerato Molefe",
    business: "Hillcrest House",
    city: "Durban, KwaZulu-Natal",
    initials: "LM",
    status: "approved",
    relationship: "owner",
  },
  {
    name: "Daniel Adams",
    business: "The Study Quarter",
    city: "Stellenbosch, Western Cape",
    initials: "DA",
    status: "pending",
    relationship: "authorised_manager",
  },
  {
    name: "Zanele Dube",
    business: "Acacia Student Village",
    city: "Bloemfontein, Free State",
    initials: "ZD",
    status: "approved",
    relationship: "owner",
  },
  {
    name: "Mpho Khumalo",
    business: "West End Living",
    city: "Polokwane, Limpopo",
    initials: "MK",
    status: "rejected",
    relationship: "authorised_manager",
  },
  {
    name: "Sara Petersen",
    business: "Riverside Rooms",
    city: "Gqeberha, Eastern Cape",
    initials: "SP",
    status: "draft",
    relationship: "owner",
  },
];
export function createSyntheticApplications(): ApplicationView[] {
  return records.map((r, i) => {
    const id = `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const submitted =
      r.status === "draft"
        ? null
        : `2026-10-${String(22 - i).padStart(2, "0")}T09:00:00Z`;
    const reviewed = ["approved", "rejected", "needs_information"].includes(
      r.status,
    );
    const reason =
      r.status === "needs_information"
        ? "Please clarify the authorised-manager declaration."
        : r.status === "rejected"
          ? "The example evidence does not demonstrate authority to manage the property."
          : reviewed
            ? "Example review completed against the illustrative checklist."
            : null;
    return {
      application: {
        id,
        applicant_id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        full_name: r.name,
        phone: "+27 00 000 0000",
        business_name: r.business,
        property_location: `${12 + i} Example Street, ${r.city}`,
        relationship: r.relationship,
        status: r.status,
        revision: reviewed ? 3 : 1,
        submitted_at: submitted,
        reviewed_at: reviewed ? "2026-10-22T13:30:00Z" : null,
        review_reason: reason,
        proof:
          r.status === "draft"
            ? null
            : {
                id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
                file_name: "example-authority-letter.pdf",
                mime_type: "application/pdf",
                byte_size: 184320,
              },
      },
      contactEmail: `${r.name.toLowerCase().replaceAll(" ", ".")}@example.invalid`,
      city: r.city,
      initials: r.initials,
      internalNote: "",
      history: submitted
        ? [
            {
              id: `sample-${i}-submitted`,
              application_id: id,
              actor_id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
              action: "submitted" as const,
              occurred_at: submitted,
              reason: "Synthetic application submitted for the preview.",
              revision: 1,
            },
            ...(reviewed
              ? [
                  {
                    id: `sample-${i}-reviewed`,
                    application_id: id,
                    actor_id: previewReviewer.id,
                    action: r.status as
                      "approved" | "rejected" | "needs_information",
                    occurred_at: "2026-10-22T13:30:00Z",
                    reason,
                    revision: 3,
                  },
                ]
              : []),
          ]
        : [],
    };
  });
}
// Compatibility snapshot for existing adapter isolation tests; UI uses its session provider.
export const sampleProperties = createSyntheticProperties();
export const sampleUsers: {
  id: string;
  name: string;
  role: string;
  access: AuthorizationState;
  joined: string;
}[] = [
  {
    id: "student-1",
    name: "Nandi Example",
    role: "Student",
    access: "none",
    joined: "20 Oct 2026",
  },
  {
    id: "student-2",
    name: "James Example",
    role: "Student",
    access: "none",
    joined: "19 Oct 2026",
  },
  ...createSyntheticApplications().map((r) => ({
    id: r.application.applicant_id,
    name: r.application.full_name,
    role:
      r.application.status === "approved"
        ? "Approved manager"
        : "Manager applicant",
    access:
      r.application.status === "approved"
        ? ("active" as const)
        : ("none" as const),
    joined: "18 Oct 2026",
  })),
  {
    id: "manager-3",
    name: "Sihle Example",
    role: "Manager",
    access: "suspended",
    joined: "16 Oct 2026",
  },
  {
    id: "manager-4",
    name: "Amara Example",
    role: "Manager",
    access: "revoked",
    joined: "15 Oct 2026",
  },
];
