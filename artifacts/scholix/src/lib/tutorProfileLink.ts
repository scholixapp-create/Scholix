export interface TutorProfileName {
  id: number;
  firstName: string;
  lastName: string;
}

function letters(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function tutorProfileSlug(tutor: TutorProfileName): string {
  const firstInitial = letters(tutor.firstName)[0] ?? "t";
  const lastNamePrefix = letters(tutor.lastName).slice(0, 3) || "utor";
  return `${firstInitial}${lastNamePrefix}-${tutor.id}`;
}

/** Accepts existing numeric links and the readable name-ID format. */
export function parseTutorProfileId(segment: string): number | null {
  const match = /^(?:[a-z0-9]+-)?([1-9]\d*)$/i.exec(segment);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

export function tutorProfilePath(tutor: TutorProfileName): string {
  return `/tutor/${tutorProfileSlug(tutor)}`;
}

export function tutorProfilePathFromDisplayName(id: number, displayName: string | null | undefined): string {
  const [firstName = "", ...lastNameParts] = displayName?.trim().split(/\s+/) ?? [];
  return tutorProfilePath({ id, firstName, lastName: lastNameParts.join(" ") });
}
