-- Version all existing memberships without changing their current role or access.
-- Revocation, role change and restoration must increment this version atomically.
ALTER TABLE memberships ADD COLUMN row_version integer NOT NULL DEFAULT 1;
ALTER TABLE memberships ADD CONSTRAINT membership_row_version_positive CHECK (row_version > 0);
