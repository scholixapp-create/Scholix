import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";

export default function TestModeBanner() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [location]);

  if (!visible) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 z-50">
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="text-amber-600 text-sm font-medium leading-snug text-center">
          ⚠️ Scholix is currently in beta. Payments are simulated — no real charges are made.
        </span>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 p-2 rounded hover:bg-amber-100 transition-colors text-amber-500 hover:text-amber-700 touch-manipulation"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
