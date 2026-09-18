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
] as const;

export type FunctionKey = (typeof FUNCTIONS)[number]["key"];

// Which functions each role may see/use. UI reads this to filter the
// function picker; the server independently re-checks it on every booking.
export const ROLE_FUNCTION_MATRIX: Record<RoleKey, FunctionKey[]> = {
  EB_TEAM: ["FandL", "TM", "oGV", "oGTa", "B2C"],
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
}[] = [
  // EB Team
  { name: "Mayar Halfaya", role: "EB_TEAM", function: "FandL", position: "LCP" },
  { name: "Tito", role: "EB_TEAM", function: "FandL", position: "LCVP F&L" },
  { name: "Farah", role: "EB_TEAM", function: "TM", position: "LCVP TM" },
  { name: "Body Kamal", role: "EB_TEAM", function: "oGV", position: "LCVP oGV" },
  { name: "Borio", role: "EB_TEAM", function: "oGTa", position: "LCVP oGTa" },
  { name: "Galal", role: "EB_TEAM", function: "B2C", position: "LCVP B2C" },

  // LCD
  { name: "Pascal", role: "LCD", function: "iGV", position: "LCD iGV" },
  { name: "Ziad Abo Bakr", role: "LCD", function: "iGTe", position: "LCD iGTe" },

  // MM — oGV
  { name: "Razan", role: "MM", function: "oGV" },
  { name: "Ezz", role: "MM", function: "oGV" },
  { name: "Ahmed Samir", role: "MM", function: "oGV" },
  { name: "Yasmine Sharaf", role: "MM", function: "oGV" },

  // MM — oGTa
  { name: "Ziad Mamdouh", role: "MM", function: "oGTa" },
  { name: "Merna Mamdouh", role: "MM", function: "oGTa" },

  // MM — B2C
  { name: "Madaa", role: "MM", function: "B2C" },
  { name: "Samaa", role: "MM", function: "B2C" },
  { name: "Raghad", role: "MM", function: "B2C" },

  // MM — TM
  { name: "Habiba Adel", role: "MM", function: "TM" },

  // MM — Finance
  { name: "Nour", role: "MM", function: "Finance" },

  // MM — iGV
  { name: "CJ", role: "MM", function: "iGV" },
  { name: "Amr Zohair", role: "MM", function: "iGV" },
  { name: "Ali Adel", role: "MM", function: "iGV" },
];
