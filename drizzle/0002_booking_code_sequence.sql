-- Booking codes (BK-2026-0001 etc.) need to be unique under real concurrency.
-- A count-based or randomized number can collide when many requests race;
-- a database sequence is atomic by construction and never collides.
CREATE SEQUENCE IF NOT EXISTS booking_code_seq START WITH 1;
