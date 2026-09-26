-- Expand invitation records with explicit provenance. Existing invitations remain
-- untrusted and cannot be accepted through the controlled lifecycle.
ALTER TABLE user_invitations
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'legacy_unverified',
  ADD COLUMN audience text,
  ADD COLUMN invited_by uuid REFERENCES users(id),
  ADD COLUMN inviter_membership_id uuid REFERENCES memberships(id),
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancelled_by uuid REFERENCES users(id),
  ADD COLUMN accepted_by uuid REFERENCES users(id),
  ADD COLUMN acceptance_mode text,
  ADD COLUMN delivery_event_id text,
  ADD COLUMN reason text;

ALTER TABLE user_invitations ADD CONSTRAINT invitation_lifecycle_status_check
  CHECK (lifecycle_status IN ('legacy_unverified', 'pending', 'accepted', 'cancelled'));
ALTER TABLE user_invitations ADD CONSTRAINT invitation_acceptance_mode_check
  CHECK (acceptance_mode IS NULL OR acceptance_mode IN ('new', 'existing'));
ALTER TABLE user_invitations ADD CONSTRAINT controlled_invitation_provenance_check
  CHECK (lifecycle_status = 'legacy_unverified' OR
    (invited_by IS NOT NULL AND inviter_membership_id IS NOT NULL AND token_hash IS NOT NULL
     AND audience IS NOT NULL AND audience IN ('internal', 'client') AND reason IS NOT NULL AND token IS NULL));
CREATE INDEX invitation_org_lifecycle_created_idx ON user_invitations(organisation_id, lifecycle_status, created_at DESC);
