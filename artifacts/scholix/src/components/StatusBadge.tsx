interface StatusBadgeProps {
  status: "scheduled" | "completed" | "cancelled" | "paid" | "pending" | "refunded";
}

const configs: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-700" },
  pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700" },
  refunded: { label: "Refunded", cls: "bg-gray-100 text-gray-600" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = configs[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
