import type {
  PropertyImage,
  PropertyManager,
  PropertyReview,
} from "./property-contracts";

export const exteriorIllustration: PropertyImage = {
  id: "exterior",
  src: "/residence.svg",
  alt: "Synthetic residence exterior illustration, not a property photograph",
  caption: "Residence exterior · sample illustration",
};
const singleIllustration: PropertyImage = {
  id: "single",
  src: "/room-single.svg",
  alt: "Synthetic single-room illustration with one bed and a desk",
  caption: "Single room · sample illustration",
};
const sharedIllustration: PropertyImage = {
  id: "shared",
  src: "/room-shared.svg",
  alt: "Synthetic shared-room illustration with two beds and study desks",
  caption: "Shared room · sample illustration",
};
const applicant = (index: number) =>
  `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const application = (index: number) =>
  `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
type Seed = {
  id: string;
  name: string;
  city: string;
  manager: PropertyManager;
  single: number;
  shared: number;
  singleRent: number;
  sharedRent: number;
  status?: PropertyReview["status"];
  noImages?: boolean;
};
const seeds: Seed[] = [
  {
    id: "property-oak",
    name: "Oak House Student Living",
    city: "Pretoria, Gauteng",
    manager: {
      id: applicant(1),
      name: "Naledi Mokoena",
      applicationId: application(1),
      verificationStatus: "pending",
      authorization: "none",
      source: "synthetic",
    },
    single: 8,
    shared: 16,
    singleRent: 3500,
    sharedRent: 2200,
  },
  {
    id: "property-hillcrest",
    name: "Hillcrest House",
    city: "Durban, KwaZulu-Natal",
    manager: {
      id: applicant(4),
      name: "Lerato Molefe",
      applicationId: application(4),
      verificationStatus: "approved",
      authorization: "active",
      source: "synthetic",
    },
    single: 6,
    shared: 12,
    singleRent: 3700,
    sharedRent: 2400,
  },
  {
    id: "property-acacia",
    name: "Acacia Student Village",
    city: "Bloemfontein, Free State",
    manager: {
      id: applicant(6),
      name: "Zanele Dube",
      applicationId: application(6),
      verificationStatus: "approved",
      authorization: "active",
      source: "synthetic",
    },
    single: 12,
    shared: 0,
    singleRent: 3500,
    sharedRent: 0,
    status: "published_example",
  },
  {
    id: "property-courtyard",
    name: "Courtyard House",
    city: "Johannesburg, Gauteng",
    manager: {
      id: "manager-3",
      name: "Sihle Example",
      verificationStatus: "approved",
      authorization: "suspended",
      source: "synthetic",
    },
    single: 4,
    shared: 6,
    singleRent: 3400,
    sharedRent: 2300,
  },
  {
    id: "property-gardens",
    name: "Garden Court Rooms",
    city: "Cape Town, Western Cape",
    manager: {
      id: "manager-4",
      name: "Amara Example",
      verificationStatus: "approved",
      authorization: "revoked",
      source: "synthetic",
    },
    single: 0,
    shared: 8,
    singleRent: 0,
    sharedRent: 2600,
    noImages: true,
  },
  {
    id: "property-west-end",
    name: "West End Living",
    city: "Polokwane, Limpopo",
    manager: {
      id: applicant(7),
      name: "Mpho Khumalo",
      applicationId: application(7),
      verificationStatus: "rejected",
      authorization: "none",
      source: "synthetic",
    },
    single: 6,
    shared: 0,
    singleRent: 3000,
    sharedRent: 0,
  },
];
export function createSyntheticProperties(): PropertyReview[] {
  return seeds.map((seed, i) => {
    const submittedAt = `2026-10-${String(22 - i).padStart(2, "0")}T10:00:00Z`;
    const images = seed.noImages
      ? []
      : [
          exteriorIllustration,
          ...(seed.single ? [singleIllustration] : []),
          ...(seed.shared ? [sharedIllustration] : []),
        ];
    const roomTypes: PropertyReview["roomTypes"] = [];
    if (seed.single)
      roomTypes.push({
        id: `${seed.id}-single`,
        type: "Single Room",
        description:
          "Illustrative single-occupancy room with a dedicated study area.",
        capacity: 1,
        monthlyRent: seed.singleRent,
        quantity: seed.single,
        furnishing: "Advertised furnished: bed, desk and wardrobe",
        fundingClaim:
          "Advertised as accepting NSFAS-funded applicants; eligibility and funding are not verified.",
        images: seed.noImages ? [] : [{ ...singleIllustration }],
      });
    if (seed.shared)
      roomTypes.push({
        id: `${seed.id}-shared`,
        type: "Shared Room",
        description:
          "Illustrative shared room with separate beds and study spaces.",
        capacity: 2,
        monthlyRent: seed.sharedRent,
        quantity: seed.shared,
        furnishing: "Advertised furnished: separate beds, desks and wardrobes",
        fundingClaim: null,
        images: seed.noImages ? [] : [{ ...sharedIllustration }],
      });
    return {
      id: seed.id,
      name: seed.name,
      city: seed.city,
      address: `${12 + i} Example Street, ${seed.city}, South Africa`,
      description:
        "An illustrative student residence with declared study spaces and shared facilities. The example room mix, facilities and illustrations are supplied solely to demonstrate listing review; no real accommodation is represented.",
      category: "Student residence",
      contactEmail: `property-${i + 1}@example.invalid`,
      contactPhone: "+27 00 000 0000",
      submittedAt,
      source: "synthetic",
      manager: { ...seed.manager },
      status: seed.status ?? "awaiting_review",
      revision: 1,
      images: structuredClone(images),
      roomTypes,
      amenities: [
        { type: "wifi", detail: "Advertised shared Wi-Fi" },
        { type: "security", detail: "Advertised controlled entry" },
        { type: "electricity", detail: "Advertised prepaid electricity" },
        { type: "water", detail: "Advertised water included in rent" },
        {
          type: "parking",
          detail: "Advertised limited parking; allocation unconfirmed",
        },
        { type: "laundry", detail: "Advertised shared laundry" },
        { type: "study", detail: "Advertised communal study area" },
        { type: "bathrooms", detail: "Advertised shared bathrooms" },
        { type: "kitchen", detail: "Advertised communal kitchen" },
      ],
      history: [
        {
          id: `${seed.id}-submitted`,
          action: "submitted",
          at: submittedAt,
          reason: "Synthetic listing submitted for illustrative review.",
          source: "sample",
        },
        ...(seed.id === "property-hillcrest"
          ? [
              {
                id: `${seed.id}-information`,
                action: "information_requested" as const,
                at: "2026-10-22T11:00:00Z",
                reason:
                  "Sample request to clarify the declared shared-room capacity; additional information is shown for a new review.",
                source: "sample" as const,
              },
            ]
          : []),
        ...(seed.status === "published_example"
          ? [
              {
                id: `${seed.id}-reviewed`,
                action: "reviewed" as const,
                at: "2026-10-22T12:00:00Z",
                reason:
                  "Illustrative reviewed/published baseline only. No property was published by this dashboard.",
                source: "sample" as const,
              },
            ]
          : []),
      ],
      internalNote: "",
    };
  });
}
