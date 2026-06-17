import { useState, useEffect } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "scholix_testmode_dismissed";

export default function TestModeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 z-50">
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="text-amber-600 text-sm font-medium leading-snug text-center">
          ⚠️ Scholix is currently in beta. Payments are simulated — no real charges are made.
        </span>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 p-2 rounded hover:bg-amber-100 transition-colors text-amber-500 hover:text-amber-700 touch-manipulation"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
