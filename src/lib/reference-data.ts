import { db } from "@/db";
import { people, roles, functions, rooms, roleFunctionLinks, roomPermissions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getBookingReferenceData() {
  const [allPeople, allRoles, allFunctions, allRooms, links, roomPerms, settingsRow] = await Promise.all([
    db.query.people.findMany({
      where: eq(people.active, true),
      with: { role: true, function: true },
      orderBy: (t, { asc }) => asc(t.name),
    }),
    db.select().from(roles),
    db.select().from(functions),
    db.query.rooms.findMany({ where: eq(rooms.active, true) }),
    db.select().from(roleFunctionLinks),
    db.select().from(roomPermissions),
    db.query.settings.findFirst(),
  ]);

  return {
    people: allPeople,
    roles: allRoles,
    functions: allFunctions,
    rooms: allRooms,
    roleFunctionLinks: links,
    roomPermissions: roomPerms,
    settings: settingsRow,
  };
}
