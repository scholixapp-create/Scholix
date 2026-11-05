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
