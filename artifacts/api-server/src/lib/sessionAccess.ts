import { isPendingParent } from "./parentApproval";

type Actor = { id: number; role: string; parentApproved?: boolean };
type Parties = { parentId: number | null; tutorUserId: number };

export function canBookForStudent(actor: Actor, parentId: number | null) {
  return actor.role === "parent" && !isPendingParent(actor) && actor.id === parentId;
}

export function canActOnSession(actor: Actor, parties: Parties, action: "complete" | "cancel" | "pay") {
  if (isPendingParent(actor)) return false;
  if (action === "pay") return canBookForStudent(actor, parties.parentId);
  if (actor.role === "admin") return true;
  if (actor.role === "tutor" && actor.id === parties.tutorUserId) return true;
  return action === "cancel" && canBookForStudent(actor, parties.parentId);
}
