---
name: Account and qualification approval policy
description: Why new parents and tutor qualification changes require separate admin approval.
---

New parent signups require manual admin approval before booking, reviewing or using protected business features. They can verify their email, sign in and check approval status while waiting. Existing parents remain approved rather than being retroactively blocked.

**Why:** The user said new parent signups must require approval so bots or arbitrary signups cannot skew bookings and reviews. The rollout preserves existing families' access while introducing this rule for new signups.

**How to apply:** Enforce approval against the current database record on the server, not just dashboard visibility. Email OTP verification and admin account approval are separate checks.

Tutor education and qualification changes require admin approval before replacing published information. Keep existing approved qualifications public while a proposal is reviewed, and do not revoke tutor verification merely because qualifications are being edited.

**Why:** The user requires qualification approval but also expects already verified tutors to access their verification documents and edit qualifications without becoming pending again.

**How to apply:** Treat qualification proposals as a separate review lifecycle from initial tutor identity and Working With Children Check approval.

Inactive parent and tutor accounts may reapply using the same email and existing role, retaining their identity and all business history. Email verification submits a request; it does not sign them in or reactivate them. A requested replacement password takes effect only after admin approval. Public reapplication cannot restore an administrator or change an account's role.

**Why:** The user wants deactivated accounts to be able to sign up again or reapply, without allowing self-service signup to undo an administrator's deactivation or create duplicate business identities.

**How to apply:** Keep reapplication separate from normal sign-in and new-account signup. Only the existing admin-controlled reactivation process can restore access.

Previously revoked authentication tokens must remain revoked after account reactivation.

**Why:** Checking only active status would revive an otherwise unexpired token when a deactivated account is approved again.

**How to apply:** Enforce a database-backed revocation generation in every shared bearer-token validation path and advance it on status changes.

Deactivated tutors cannot receive new bookings or payment confirmations, but existing bookings and financial history must remain intact.

**Why:** The user explicitly asked to prevent bookings with deactivated tutors.

**How to apply:** Hide inactive tutors from public discovery and availability, and enforce current account status at the final booking/payment write, including concurrent deactivation.

Parent account removal must also address all associated student profiles and any linked student sign-ins, rather than leaving usable child accounts behind.

**Why:** The user explicitly stated that deleting a parent should also delete its associated student accounts.

**How to apply:** Treat removal as a family-level workflow; required business history must not be silently cascade-deleted.

Account removal uses restricted archival where history must survive. Unused child profiles may be permanently removed; linked sign-in access must end in either case. Archived removal is distinct from temporary deactivation and must not be undone by public reapplication.

**Why:** The user approved removal with restricted archival rather than destroying financial, lesson, dispute or audit records.

**How to apply:** Explain retention before confirmation, resolve outstanding lessons before processing, and retain only necessary records with restricted access. Do not represent archival as complete erasure or promise an unimplemented retention-expiry schedule.
