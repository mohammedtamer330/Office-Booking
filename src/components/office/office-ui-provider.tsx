"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BookingDialog, type BookingDialogState } from "@/components/office/booking-dialog";
import { BookRoomDialog, type BookPrefill } from "@/components/office/book-room-dialog";
import type { BookingReferenceBundle } from "@/lib/types";

// Same key the My bookings person picker already uses, so "who am I on this device" is one thing.
const PERSON_KEY = "aiesec-booking:last-person-id";

// "Who am I on this device" lives in localStorage; a tiny external store keeps every reader in sync.
const personListeners = new Set<() => void>();
function subscribePerson(cb: () => void) {
  personListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    personListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readPerson(): string | null {
  try {
    return localStorage.getItem(PERSON_KEY);
  } catch {
    return null; // storage unavailable (private mode) — Manage booking simply won't show
  }
}

type OfficeUi = {
  /** Open the booking details modal. */
  openDetails: (bookingId: string) => void;
  /** Open the check-in modal for a booking. Every Check in button in the app calls this. */
  openCheckIn: (bookingId: string) => void;
  /** Open the guided booking flow, optionally pre-filled from an available slot. */
  openBooking: (prefill?: BookPrefill) => void;
  /** Whether the booking flow is available (it needs the reference data). */
  canBook: boolean;
  /** Bumps whenever something changed (a booking, a check-in) so views can refetch. */
  version: number;
  notifyChange: () => void;
  /** The person this device last booked/looked up as — used only to show "Manage booking" on your own bookings. */
  myPersonId: string | null;
  rememberPerson: (personId: string) => void;
};

const Ctx = createContext<OfficeUi | null>(null);

export function useOfficeUi(): OfficeUi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOfficeUi must be used inside <OfficeUiProvider>");
  return ctx;
}

/**
 * Mounts the booking modal and the booking flow ONCE for every page in the
 * (booking) area, so a "Check in" button on the homepage, the timeline,
 * My bookings or the QR page all open the same thing.
 */
export function OfficeUiProvider({
  bundle,
  children,
}: {
  bundle: BookingReferenceBundle | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<BookingDialogState>(null);
  const [book, setBook] = useState<{ open: boolean; prefill?: BookPrefill; key: number }>({ open: false, key: 0 });
  const [version, setVersion] = useState(0);
  const myPersonId = useSyncExternalStore(subscribePerson, readPerson, () => null);

  const openBooking = useCallback(
    (prefill?: BookPrefill) => {
      if (!bundle) return;
      setBook((b) => ({ open: true, prefill, key: b.key + 1 }));
    },
    [bundle],
  );

  // /?book=1 (e.g. from a link in another page) opens the flow on arrival.
  useEffect(() => {
    if (!bundle) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("book") !== "1") return;
    const t = setTimeout(() => {
      url.searchParams.delete("book");
      window.history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
      openBooking();
    }, 0);
    return () => clearTimeout(t);
  }, [bundle, openBooking]);

  const notifyChange = useCallback(() => {
    setVersion((v) => v + 1);
    router.refresh(); // re-run the server data (Today, Upcoming, room status)
  }, [router]);

  const rememberPerson = useCallback((personId: string) => {
    try {
      localStorage.setItem(PERSON_KEY, personId);
    } catch {
      /* ignore */
    }
    personListeners.forEach((cb) => cb());
  }, []);

  const value = useMemo<OfficeUi>(
    () => ({
      openDetails: (id) => setDialog({ bookingId: id, view: "details" }),
      openCheckIn: (id) => setDialog({ bookingId: id, view: "checkin" }),
      openBooking,
      canBook: !!bundle,
      version,
      notifyChange,
      myPersonId,
      rememberPerson,
    }),
    [openBooking, bundle, version, notifyChange, myPersonId, rememberPerson],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <BookingDialog
        state={dialog}
        onStateChange={setDialog}
        version={version}
        myPersonId={myPersonId}
        onChanged={notifyChange}
      />
      {bundle && (
        <BookRoomDialog
          key={book.key}
          bundle={bundle}
          open={book.open}
          onOpenChange={(o) => setBook((b) => ({ ...b, open: o }))}
          prefill={book.prefill}
          myPersonId={myPersonId}
          onBooked={(personId) => {
            rememberPerson(personId);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </Ctx.Provider>
  );
}
