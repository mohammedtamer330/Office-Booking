import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  time,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleNameEnum = pgEnum("role_name", ["EB_TEAM", "LCD", "MM"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "UPCOMING",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const checkInMethodEnum = pgEnum("check_in_method", [
  "QR",
  "BOOKING_PAGE",
  "ADMIN_MANUAL",
]);

// How punctual an individual attendee was, judged by the same check-in window
// the booking-level check-in uses (settings.checkInWindowAfterMinutes).
export const attendanceStatusEnum = pgEnum("attendance_status", ["ON_TIME", "LATE"]);

export const auditActionEnum = pgEnum("audit_action", [
  "BOOKING_CREATED",
  "BOOKING_EDITED",
  "BOOKING_CANCELLED",
  "CHECK_IN",
  "CHECK_OUT",
  "NO_SHOW",
  "PERSON_ADDED",
  "PERSON_EDITED",
  "PERSON_DEACTIVATED",
  "ROOM_CHANGED",
  "PERMISSION_CHANGED",
  "SETTINGS_CHANGED",
  "PASSWORD_CHANGED",
  "ADMIN_LOGIN",
]);

// ---------------------------------------------------------------------------
// Core reference tables
// ---------------------------------------------------------------------------

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: roleNameEnum("name").notNull().unique(),
  label: text("label").notNull(),
});

export const functions = pgTable("functions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // e.g. "oGV", "B2C"
  label: text("label").notNull(),
  color: text("color"), // hex, null = use neutral default theme
  active: boolean("active").notNull().default(true),
});

// which (role, function) pairs are valid — drives both UI + server validation
export const roleFunctionLinks = pgTable("role_function_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  functionId: uuid("function_id")
    .notNull()
    .references(() => functions.id, { onDelete: "cascade" }),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(), // "eb-room" | "room-2" | "hall"
  description: text("description"),
  requiresPassword: boolean("requires_password").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

// which roles may access which rooms — enforced server-side, never trust the client
export const roomPermissions = pgTable("room_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
});

export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // AIESEC Workspace email (@aiesec.net), used as the Google-auth identity
  // key. Nullable at the DB level so existing/historical rows never break a
  // migration — but every ACTIVE person going through the seed or admin
  // "Add Person" flow is expected to have one (enforced in application
  // code, not a NOT NULL constraint, since retroactively backfilling every
  // historical row isn't guaranteed). Always store it lowercased/trimmed —
  // see normalizeEmail() in src/lib/auth/member-config.ts — so lookups are
  // a plain equality check, never case-insensitive SQL, at every call site.
  email: text("email").unique(),
  position: text("position"),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  functionId: uuid("function_id")
    .notNull()
    .references(() => functions.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

// NOTE: A database-level EXCLUDE constraint that makes overlapping bookings for
// the same room physically impossible (even under a race condition or a direct,
// manipulated API request) is added via a hand-written SQL migration — see
// drizzle/0001_booking_overlap_guard.sql. Drizzle's schema builder can't express
// a GiST exclusion constraint declaratively, so it's layered on after `drizzle-kit
// generate` rather than being part of this table definition.
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingCode: text("booking_code").notNull().unique(), // e.g. BK-2026-0001
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: bookingStatusEnum("status").notNull().default("UPCOMING"),
  qrToken: text("qr_token").notNull().unique(),
  actualCheckInAt: timestamp("actual_check_in_at", { withTimezone: true }),
  actualCheckOutAt: timestamp("actual_check_out_at", { withTimezone: true }),
  lateCheckIn: boolean("late_check_in").notNull().default(false),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledBy: text("cancelled_by"), // "user" | "admin"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const checkIns = pgTable("check_ins", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  method: checkInMethodEnum("method").notNull(),
  actorId: text("actor_id"), // person id or "admin"
});

export const checkOuts = pgTable("check_outs", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  method: checkInMethodEnum("method").notNull(),
  actorId: text("actor_id"),
});

// One row per person who checked in to a booking. The booking itself still
// belongs to a single owner (bookings.personId); attendees are whoever walks
// in and checks in with their own name. Everything else about the booking —
// owner, function, room, date, scheduled start/end — is reached through
// booking_id rather than copied here, so it can never drift out of sync.
// (bookings.actualCheckInAt/status still record the FIRST arrival, exactly as
// before, so no-show detection and existing analytics keep working.)
//
// The unique (booking_id, name_key) index in drizzle/0003_booking_attendance.sql
// is what makes a duplicate check-in impossible even under a race.
export const bookingAttendees = pgTable("booking_attendees", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  attendeeName: text("attendee_name").notNull(), // as typed (trimmed, spaces collapsed)
  nameKey: text("name_key").notNull(), // normalized form used for duplicate detection
  personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }), // set only when the name matches a known person exactly
  status: attendanceStatusEnum("status").notNull().default("ON_TIME"),
  method: checkInMethodEnum("method").notNull().default("BOOKING_PAGE"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id").notNull(), // person id, "admin", or "system"
  actorLabel: text("actor_label").notNull(),
  action: auditActionEnum("action").notNull(),
  entityType: text("entity_type").notNull(), // "booking" | "person" | "room" | "settings" ...
  entityId: text("entity_id"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Settings (singleton row, id = 1)
// ---------------------------------------------------------------------------

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  bookingStartDate: date("booking_start_date").notNull(),
  bookingEndDate: date("booking_end_date").notNull(),
  minBookingMinutes: integer("min_booking_minutes").notNull().default(30),
  maxBookingMinutes: integer("max_booking_minutes").notNull().default(240),
  checkInWindowBeforeMinutes: integer("check_in_window_before_minutes").notNull().default(15),
  checkInWindowAfterMinutes: integer("check_in_window_after_minutes").notNull().default(15),
  lateCheckInPolicy: text("late_check_in_policy").notNull().default("ALLOW_WITH_WARNING"), // ALLOW | BLOCK | ALLOW_WITH_WARNING
  noShowGraceMinutes: integer("no_show_grace_minutes").notNull().default(20),
  cancellationCutoffMinutes: integer("cancellation_cutoff_minutes").notNull().default(30),
  ebRoomPasswordHash: text("eb_room_password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const rolesRelations = relations(roles, ({ many }) => ({
  people: many(people),
  roleFunctionLinks: many(roleFunctionLinks),
  roomPermissions: many(roomPermissions),
}));

export const functionsRelations = relations(functions, ({ many }) => ({
  people: many(people),
  roleFunctionLinks: many(roleFunctionLinks),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  role: one(roles, { fields: [people.roleId], references: [roles.id] }),
  function: one(functions, { fields: [people.functionId], references: [functions.id] }),
  bookings: many(bookings),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  bookings: many(bookings),
  roomPermissions: many(roomPermissions),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  person: one(people, { fields: [bookings.personId], references: [people.id] }),
  room: one(rooms, { fields: [bookings.roomId], references: [rooms.id] }),
  checkIns: many(checkIns),
  checkOuts: many(checkOuts),
  attendees: many(bookingAttendees),
}));

export const bookingAttendeesRelations = relations(bookingAttendees, ({ one }) => ({
  booking: one(bookings, { fields: [bookingAttendees.bookingId], references: [bookings.id] }),
  person: one(people, { fields: [bookingAttendees.personId], references: [people.id] }),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  booking: one(bookings, { fields: [checkIns.bookingId], references: [bookings.id] }),
}));

export const checkOutsRelations = relations(checkOuts, ({ one }) => ({
  booking: one(bookings, { fields: [checkOuts.bookingId], references: [bookings.id] }),
}));
