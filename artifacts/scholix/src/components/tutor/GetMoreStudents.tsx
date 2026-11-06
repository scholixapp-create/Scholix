import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyPromotion,
  useUpdateMyPromotion,
  getGetMyPromotionQueryKey,
  type TutorPromotion,
  type PromotionActionUpdateAction,
} from "@workspace/api-client-react";
import { UserPlus, ChevronRight, Check, Copy, Share2, Mail, Megaphone } from "lucide-react";
import { tutorProfilePath } from "@/lib/tutorProfileLink";

type ActionKey = PromotionActionUpdateAction;

function buildText(action: ActionKey, url: string) {
  if (action === "invite_family") {
    return `Hi, I now tutor through Scholix, where every tutor is individually verified. You can see my profile, availability and book a session here: ${url}`;
  }
  if (action === "social_intro") {
    return `I'm tutoring on Scholix, an Australian platform where families book individually verified tutors. Find my profile and availability here: ${url}`;
  }
  return url;
}

const ACTIONS: { key: ActionKey; label: string; doneLabel: string; title: string; icon: typeof Share2 }[] = [
  { key: "share_profile", label: "I have shared my profile link", doneLabel: "Profile link", title: "Scholix tutor profile", icon: Share2 },
  { key: "invite_family", label: "I have invited a family or student", doneLabel: "Family invitation", title: "Book a session with me on Scholix", icon: Mail },
  { key: "social_intro", label: "I have posted a social introduction", doneLabel: "Social introduction", title: "Tutoring on Scholix", icon: Megaphone },
];

const PROMPTS: Record<ActionKey, string> = {
  share_profile: "Share your Scholix profile link with students",
  invite_family: "Invite a family or student you already know",
  social_intro: "Post a short introduction on your social channels",
};

function Dot({ done }: { done: boolean }) {
  return (
    <span aria-hidden="true" className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${done ? "bg-accent border-accent" : "border-muted-foreground/40"}`}>
      {done && <Check size={9} className="text-white" strokeWidth={3} />}
    </span>
  );
}

export default function GetMoreStudents({ tutorId, profileComplete, hasAvailability }: { tutorId: number; profileComplete: boolean; hasAvailability: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const promotion = useGetMyPromotion();
  const update = useUpdateMyPromotion();
  const [feedback, setFeedback] = useState<Partial<Record<ActionKey, { text: string; error?: boolean }>>>({});
  const [savingKey, setSavingKey] = useState<ActionKey | null>(null);

  const completed = new Set<string>(promotion.data?.completedActions ?? []);
  const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}${tutorProfilePath({
    id: tutorId, firstName: user?.firstName ?? "", lastName: user?.lastName ?? "",
  })}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const setMsg = (key: ActionKey, text: string, error = false) => setFeedback((f) => ({ ...f, [key]: { text, error } }));

  const copy = async (key: ActionKey) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(buildText(key, url));
      setMsg(key, key === "share_profile" ? "Link copied. Paste it wherever you'd like to share it." : "Message copied. Paste it into a message or post.");
    } catch {
      setMsg(key, "Copying failed. Select and copy the text manually.", true);
    }
  };

  const share = async (key: ActionKey, title: string) => {
    try {
      await navigator.share({ title, text: key === "share_profile" ? undefined : buildText(key, ""), url });
      setMsg(key, "Share sheet completed. Tick the box below if you sent it.");
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        setMsg(key, "Sharing cancelled.");
      } else {
        setMsg(key, "Sharing is unavailable here. Use Copy instead.", true);
      }
    }
  };

  const toggle = (key: ActionKey, value: boolean) => {
    setSavingKey(key);
    update.mutate(
      { data: { action: key, completed: value } },
      {
        onSuccess: (data) => {
          qc.setQueryData<TutorPromotion>(getGetMyPromotionQueryKey(), data);
        },
        onError: () => setMsg(key, "Could not save your progress. Please try again.", true),
        onSettled: () => setSavingKey(null),
      },
    );
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid="card-get-more-students">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <UserPlus size={14} className="text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">Get More Students</p>
      </div>

      <ul className="space-y-2 mb-3">
        <li>
          <Link href="/tutor/profile" className="flex items-start gap-2 rounded-md hover:bg-muted/50 -mx-1 px-1 py-0.5" data-testid="link-checklist-profile">
            <Dot done={profileComplete} />
            <span className={`text-xs leading-relaxed flex-1 ${profileComplete ? "text-muted-foreground" : "text-foreground"}`}>
              Complete your profile with a bio and subjects
              <span className="sr-only">{profileComplete ? " (done)" : " (not done)"}</span>
            </span>
            <ChevronRight size={12} className="text-muted-foreground mt-1" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link href="/tutor/availability" className="flex items-start gap-2 rounded-md hover:bg-muted/50 -mx-1 px-1 py-0.5" data-testid="link-checklist-availability">
            <Dot done={hasAvailability} />
            <span className={`text-xs leading-relaxed flex-1 ${hasAvailability ? "text-muted-foreground" : "text-foreground"}`}>
              Set your weekly availability
              <span className="sr-only">{hasAvailability ? " (done)" : " (not done)"}</span>
            </span>
            <ChevronRight size={12} className="text-muted-foreground mt-1" aria-hidden="true" />
          </Link>
        </li>
      </ul>

      {promotion.isError && (
        <p role="alert" className="text-xs text-destructive mb-2">
          Could not load your sharing progress.{" "}
          <button type="button" onClick={() => promotion.refetch()} className="underline font-semibold">Try again</button>
        </p>
      )}

      <div className="space-y-3">
        {ACTIONS.map(({ key, label, title, icon: Icon }) => {
          const done = completed.has(key);
          const msg = feedback[key];
          const checkboxId = `promo-${key}`;
          return (
            <div key={key} className="rounded-lg border border-border p-3" data-testid={`row-promotion-${key}`}>
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Icon size={12} className="text-primary" aria-hidden="true" /> {PROMPTS[key]}
              </p>
              {key !== "share_profile" && (
                <p className="mt-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5 break-words select-all" data-testid={`text-promotion-message-${key}`}>
                  {buildText(key, url)}
                </p>
              )}
              {key === "share_profile" && (
                <p className="mt-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5 break-all select-all">{url}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={() => copy(key)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[11px] font-semibold hover:bg-muted" data-testid={`button-copy-${key}`}>
                  <Copy size={11} aria-hidden="true" /> {key === "share_profile" ? "Copy link" : "Copy message"}
                </button>
                {canShare && (
                  <button type="button" onClick={() => share(key, title)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[11px] font-semibold hover:bg-muted" data-testid={`button-share-${key}`}>
                    <Share2 size={11} aria-hidden="true" /> Share
                  </button>
                )}
              </div>
              {msg && (
                <p role={msg.error ? "alert" : "status"} className={`mt-1.5 text-[11px] ${msg.error ? "text-destructive" : "text-muted-foreground"}`}>{msg.text}</p>
              )}
              <label htmlFor={checkboxId} className="mt-2 flex items-center gap-2 text-[11px] text-foreground cursor-pointer">
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={done}
                  disabled={promotion.isLoading || promotion.isError || savingKey === key}
                  onChange={(e) => toggle(key, e.target.checked)}
                  className="h-3.5 w-3.5 accent-[hsl(var(--accent))]"
                  data-testid={`checkbox-promotion-${key}`}
                />
                {label}
                {savingKey === key && <span className="text-muted-foreground">Saving...</span>}
              </label>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Ticks are self-reported and only visible to you.</p>
    </div>
  );
}
