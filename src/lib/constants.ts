export const TRACKS = [
  {
    id: "education",
    name: "Education / EdTech",
    short: "EdTech",
    description:
      "Reimagine how India learns — adaptive tutoring, vernacular content, assessment tools and classroom platforms that reach beyond metro classrooms.",
    icon: "graduation",
  },
  {
    id: "ai",
    name: "AI Innovation",
    short: "AI",
    description:
      "Build with foundation models, agents, computer vision or applied ML. Ship something that reasons, predicts or automates in a way that matters.",
    icon: "brain",
  },
  {
    id: "healthcare",
    name: "Healthcare",
    short: "Health",
    description:
      "Improve access, diagnosis or follow-up care — from triage assistants to records interoperability and remote monitoring for underserved regions.",
    icon: "heart",
  },
  {
    id: "business",
    name: "Business",
    short: "Business",
    description:
      "Solve for commerce, fintech, logistics or operations. Tools that help small businesses and teams work faster with less friction.",
    icon: "briefcase",
  },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];
export const TRACK_IDS = TRACKS.map((t) => t.id) as [TrackId, ...TrackId[]];

export const TEAM_SIZES = [2, 3, 4] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export const MEMBER_ROLES = [
  "Team Leader",
  "Full-Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI / ML Engineer",
  "UI / UX Designer",
  "Data Analyst",
  "Presenter / Researcher",
  "Other",
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export const REGISTRATION_STATUSES = ["pending_payment", "confirmed", "cancelled"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "successful",
  "failed",
  "cancelled",
  "expired",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  pending: "Pending",
  successful: "Successful",
  failed: "Failed",
  expired: "Expired",
  sent: "Sent",
  "not-sent": "Not sent",
};
