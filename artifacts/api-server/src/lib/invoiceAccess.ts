export interface InvoiceActor {
  id: number;
  role: string;
}

type ParsedId = { ok: true; id?: number } | { ok: false };

export type InvoiceListScope =
  | { ok: true; kind: "parent" | "tutor"; userId: number }
  | { ok: false; status: 400 | 403; message: string };

function parseOptionalId(value: unknown): ParsedId {
  if (value === undefined) return { ok: true };
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return { ok: false };
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2_147_483_647
    ? { ok: true, id }
    : { ok: false };
}

export function parseInvoiceId(value: string): number | null {
  const parsed = parseOptionalId(value);
  return parsed.ok && parsed.id !== undefined ? parsed.id : null;
}

export function resolveInvoiceListScope(
  actor: InvoiceActor,
  query: { parentId?: unknown; tutorId?: unknown },
): InvoiceListScope {
  const requestedParent = parseOptionalId(query.parentId);
  const requestedTutor = parseOptionalId(query.tutorId);

  if (!requestedParent.ok || !requestedTutor.ok) {
    return { ok: false, status: 400, message: "Invalid invoice owner ID" };
  }

  if (actor.role === "parent") {
    if (
      requestedTutor.id !== undefined ||
      (requestedParent.id !== undefined && requestedParent.id !== actor.id)
    ) {
      return { ok: false, status: 403, message: "Invoice access denied" };
    }
    return { ok: true, kind: "parent", userId: actor.id };
  }

  if (actor.role === "tutor") {
    if (
      requestedParent.id !== undefined ||
      (requestedTutor.id !== undefined && requestedTutor.id !== actor.id)
    ) {
      return { ok: false, status: 403, message: "Invoice access denied" };
    }
    return { ok: true, kind: "tutor", userId: actor.id };
  }

  return { ok: false, status: 403, message: "Invoice access denied" };
}

export function canAccessInvoice(
  actor: InvoiceActor,
  owners: { parentId?: number | null; tutorUserId?: number | null },
): boolean {
  if (actor.role === "parent") return owners.parentId === actor.id;
  if (actor.role === "tutor") return owners.tutorUserId === actor.id;
  return false;
}
