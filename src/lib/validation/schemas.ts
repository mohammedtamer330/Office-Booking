import { z } from "zod";

// Every one of these is re-validated on the server. The client uses the same
// schema only for immediate form feedback — it is never trusted on its own.

export const createBookingSchema = z.object({
  personId: z.string().uuid(),
  roomId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
  ebRoomPassword: z.string().optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const availabilityQuerySchema = z.object({
  roomId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const checkInSchema = z.object({
  bookingId: z.string().uuid().optional(),
  token: z.string().min(10).optional(),
  method: z.enum(["QR", "BOOKING_PAGE", "ADMIN_MANUAL"]),
});

export const checkOutSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(["QR", "BOOKING_PAGE", "ADMIN_MANUAL"]),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  cancelledBy: z.enum(["user", "admin"]),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1),
});

export const settingsUpdateSchema = z.object({
  bookingStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bookingEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minBookingMinutes: z.number().int().min(5).max(1440),
  maxBookingMinutes: z.number().int().min(5).max(1440),
  checkInWindowBeforeMinutes: z.number().int().min(0).max(120),
  checkInWindowAfterMinutes: z.number().int().min(0).max(120),
  lateCheckInPolicy: z.enum(["ALLOW", "BLOCK", "ALLOW_WITH_WARNING"]),
  noShowGraceMinutes: z.number().int().min(1).max(240),
  cancellationCutoffMinutes: z.number().int().min(0).max(1440),
});

export const changeEbRoomPasswordSchema = z.object({
  newPassword: z.string().min(4, "Password must be at least 4 characters"),
});

export const personUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  position: z.string().max(120).optional().nullable(),
  roleId: z.string().uuid(),
  functionId: z.string().uuid(),
  active: z.boolean().default(true),
});
