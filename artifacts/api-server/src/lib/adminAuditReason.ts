const CREDENTIAL_ASSIGNMENT =
  /\b(?:password|passcode|otp|one[- ]time code|verification code|token|secret|api key)\b\s*[:=]\s*\S+/i;
const SIGNED_TOKEN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/;
const COMMON_ACCESS_TOKEN =
  /\b(?:github_pat_|gh[pousr]_|xox[baprs]-|sk_(?:live|test)_)[A-Za-z0-9_-]{12,}\b/i;
const LONG_OPAQUE_VALUE = /\b[A-Za-z0-9_-]{40,}\b/;
const STANDALONE_OTP = /\b\d{6}\b/;

export function isSafeAdminAuditReason(reason: string, currentPassword?: string): boolean {
  const trimmedReason = reason.trim();
  if (
    CREDENTIAL_ASSIGNMENT.test(trimmedReason)
    || SIGNED_TOKEN.test(trimmedReason)
    || COMMON_ACCESS_TOKEN.test(trimmedReason)
    || LONG_OPAQUE_VALUE.test(trimmedReason)
    || STANDALONE_OTP.test(trimmedReason)
  ) {
    return false;
  }

  return !currentPassword
    || currentPassword.length < 4
    || !trimmedReason.includes(currentPassword);
}
