/**
 * This file is the single source of truth for the organization's initial
 * structure — roles, functions, the role→function access matrix, rooms, room
 * permissions, and the people list. The seed script (scripts/seed.ts) writes
 * this into the database; nothing else in the app should hardcode these
 * relationships again. Change it here and re-run `npm run db:seed`
 * (safe to re-run — it upserts).
 */

export type RoleKey = "EB_TEAM" | "LCD" | "MM";

export const ROLES: { key: RoleKey; label: string }[] = [
  { key: "EB_TEAM", label: "EB Team" },
  { key: "LCD", label: "LCD" },
  { key: "MM", label: "MM" },
];

export const FUNCTIONS = [
  { key: "oGV", label: "oGV", color: "#F85A40" },
  { key: "oGTa", label: "oGTa", color: "#0CB9C1" },
  { key: "iGV", label: "iGV", color: "#F85A40" },
  { key: "iGTe", label: "iGTe", color: "#F48924" },
  { key: "FandL", label: "F&L", color: null }, // neutral theme until configured
  { key: "TM", label: "TM", color: null },
  { key: "B2C", label: "B2C", color: "#037EF3" },
  { key: "Finance", label: "Finance", color: null },
  { key: "LCP", label: "LCP", color: "#7C3AED" }, // separated out — the LCP is not part of F&L
] as const;

export type FunctionKey = (typeof FUNCTIONS)[number]["key"];

// Which functions each role may see/use. UI reads this to filter the
// function picker; the server independently re-checks it on every booking.
export const ROLE_FUNCTION_MATRIX: Record<RoleKey, FunctionKey[]> = {
  EB_TEAM: ["LCP", "FandL", "TM", "oGV", "oGTa", "B2C"],
  LCD: ["iGV", "iGTe"],
  MM: ["oGV", "oGTa", "B2C", "TM", "Finance", "iGV"],
};

export const ROOMS = [
  {
    slug: "eb-room",
    name: "EB Room",
    description: "Restricted room — EB Team & LCD only. Password required.",
    requiresPassword: true,
    allowedRoles: ["EB_TEAM", "LCD"] as RoleKey[],
  },
  {
    slug: "room-2",
    name: "Room 2",
    description: "Open to all.",
    requiresPassword: false,
    allowedRoles: ["EB_TEAM", "LCD", "MM"] as RoleKey[],
  },
  {
    slug: "hall",
    name: "Hall",
    description: "Open to all.",
    requiresPassword: false,
    allowedRoles: ["EB_TEAM", "LCD", "MM"] as RoleKey[],
  },
];

export const PEOPLE: {
  name: string;
  role: RoleKey;
  function: FunctionKey;
  position?: string;
  /** AIESEC Workspace email — the Google-auth identity key. Always store/compare lowercased. */
  email: string;
}[] = [
  // EB Team
  { name: "Mayar Halfaya", role: "EB_TEAM", function: "LCP", position: "LCP", email: "mayarhalfaya@aiesec.net" },
  { name: "Tito", role: "EB_TEAM", function: "FandL", position: "LCVP F&L", email: "mohammedtamer@aiesec.net" },
  { name: "Farah", role: "EB_TEAM", function: "TM", position: "LCVP TM", email: "farahamgad@aiesec.net" },
  { name: "Body Kamal", role: "EB_TEAM", function: "oGV", position: "LCVP oGV", email: "abdullrhmankamal@aiesec.net" },
  { name: "Borio", role: "EB_TEAM", function: "oGTa", position: "LCVP oGTa", email: "eyadalaa@aiesec.net" },
  { name: "Galal", role: "EB_TEAM", function: "B2C", position: "LCVP B2C", email: "muhamedgalal@aiesec.net" },

  // LCD
  { name: "Pascal", role: "LCD", function: "iGV", position: "LCD iGV", email: "yousifayman@aiesec.net" },
  { name: "Ziad Abo Bakr", role: "LCD", function: "iGTe", position: "LCD iGTe", email: "ziadabobakr@aiesec.net" },

  // MM — oGV
  { name: "Razan", role: "MM", function: "oGV", email: "razanmohamed@aiesec.net" },
  { name: "Ezz", role: "MM", function: "oGV", email: "ezzaldenadel@aiesec.net" },
  { name: "Ahmed Samir", role: "MM", function: "oGV", email: "ahmedsamir@aiesec.net" },
  { name: "Yasmine Sharaf", role: "MM", function: "oGV", email: "yasminesharaf@aiesec.net" },

  // MM — oGTa
  { name: "Ziad Mamdouh", role: "MM", function: "oGTa", email: "ziadmamdoh@aiesec.net" },
  { name: "Merna Mamdouh", role: "MM", function: "oGTa", email: "mernamamdoh@aiesec.net" },

  // MM — B2C
  { name: "Madaa", role: "MM", function: "B2C", email: "mohamedhany@aiesec.net" },
  { name: "Samaa", role: "MM", function: "B2C", email: "samaamohamed@aiesec.net" },
  { name: "Raghad", role: "MM", function: "B2C", email: "raghaddawood@aiesec.net" },

  // MM — TM
  { name: "Habiba Adel", role: "MM", function: "TM", email: "habibaadel@aiesec.net" },

  // MM — Finance
  { name: "Nour", role: "MM", function: "Finance", email: "nourelden@aiesec.net" },

  // MM — iGV
  { name: "CJ", role: "MM", function: "iGV", email: "abdelrahmanzuelhema@aiesec.net" },
  { name: "Amr Zohair", role: "MM", function: "iGV", email: "amrzohier@aiesec.net" },
  { name: "Ali Adel", role: "MM", function: "iGV", email: "aliadel@aiesec.net" },
];

/** Domain allowed to authenticate as a member (see src/lib/auth/member-config.ts). */
export const AIESEC_EMAIL_DOMAIN = "aiesec.net";
