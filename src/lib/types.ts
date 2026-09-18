export type RefRole = { id: string; name: "EB_TEAM" | "LCD" | "MM"; label: string };
export type RefFunction = { id: string; key: string; label: string; color: string | null; active: boolean };
export type RefPerson = {
  id: string;
  name: string;
  position: string | null;
  roleId: string;
  functionId: string;
  active: boolean;
  role: RefRole;
  function: RefFunction;
};
export type RefRoom = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  requiresPassword: boolean;
  active: boolean;
};
export type RefRoleFunctionLink = { roleId: string; functionId: string };
export type RefRoomPermission = { roomId: string; roleId: string };

export type ClientSettings = {
  bookingStartDate: string;
  bookingEndDate: string;
  minBookingMinutes: number;
  maxBookingMinutes: number;
  checkInWindowBeforeMinutes: number;
  checkInWindowAfterMinutes: number;
  lateCheckInPolicy: "ALLOW" | "BLOCK" | "ALLOW_WITH_WARNING";
  noShowGraceMinutes: number;
  cancellationCutoffMinutes: number;
};

export type BookingReferenceBundle = {
  people: RefPerson[];
  roles: RefRole[];
  functions: RefFunction[];
  rooms: RefRoom[];
  roleFunctionLinks: RefRoleFunctionLink[];
  roomPermissions: RefRoomPermission[];
  settings: ClientSettings;
};

export type BookedSlot = { startTime: string; endTime: string; status: string };
