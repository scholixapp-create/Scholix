export function cleanStudentAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const address = value.trim();
  return address.length > 0 && address.length <= 500 ? address : null;
}
