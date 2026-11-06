interface StatusBadgeProps {
  status: string;
}

const configs: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Checkout pending", cls: "bg-gray-100 text-gray-700" },
  pending_confirmation: { label: "Awaiting tutor", cls: "bg-amber-100 text-amber-800" },
  scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600" },
  authorized: { label: "Hold placed", cls: "bg-amber-100 text-amber-800" },
  released: { label: "Hold released", cls: "bg-gray-100 text-gray-600" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-800" },
  pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700" },
  refunded: { label: "Refunded", cls: "bg-gray-100 text-gray-600" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = configs[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span data-status-badge={status} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-300 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
