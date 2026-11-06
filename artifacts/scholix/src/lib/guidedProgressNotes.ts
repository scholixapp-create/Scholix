export const PROGRESS_NOTE_HEADINGS = [
  "What we did today",
  "What's for homework",
  "What we will continue with next week",
] as const;

export type GuidedProgressNotes = [string, string, string];
const NO_PROGRESS_NOTES: GuidedProgressNotes = ["", "", ""];

export function parseGuidedProgressNotes(notes: string | null | undefined): GuidedProgressNotes {
  if (!notes) return [...NO_PROGRESS_NOTES];
  const headingPattern = /(?:^|\n)(What we did today|What's for homework|What we will continue with next week):[ \t]*(?:\n|$)/g;
  const matches = [...notes.matchAll(headingPattern)];

  // Older entries had one free-text notes field. Preserve all of it when edited.
  if (!matches.length) return [notes, "", ""];

  const sections: GuidedProgressNotes = ["", "", ""];
  const headingIndexes = new Map<string, number>(PROGRESS_NOTE_HEADINGS.map((heading, index) => [heading, index]));
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionIndex = headingIndexes.get(match[1]);
    if (sectionIndex === undefined || match.index === undefined) continue;
    const contentStart = match.index + match[0].length;
    const contentEnd = matches[i + 1]?.index ?? notes.length;
    sections[sectionIndex] = notes.slice(contentStart, contentEnd).trim();
  }
  return sections;
}

export function serializeGuidedProgressNotes(sections: GuidedProgressNotes): string {
  if (sections.every((section) => !section.trim())) return "";
  return PROGRESS_NOTE_HEADINGS
    .map((heading, index) => `${heading}:\n${sections[index].trim()}`)
    .join("\n\n");
}
