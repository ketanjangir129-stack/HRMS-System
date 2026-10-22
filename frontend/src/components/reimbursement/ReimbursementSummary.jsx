import { FiCheckCircle, FiClock, FiXCircle, FiCreditCard } from "react-icons/fi";
import { formatAmount } from "../../utils/reimbursement/reimbursementUtils";

function ReimbursementSummary({ summary, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ui-card h-36 animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Claimed",
      value: formatAmount(summary.totalAmount),
      subtitle: `${summary.totalClaims} claim${summary.totalClaims !== 1 ? "s" : ""}`,
      icon: <FiCreditCard />,
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Pending",
      value: formatAmount(summary.pendingAmount),
      subtitle: `${summary.pendingClaims} awaiting finance review`,
      icon: <FiClock />,
      color: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Approved",
      value: formatAmount(summary.approvedAmount),
      subtitle: `${summary.approvedClaims} approved`,
      icon: <FiCheckCircle />,
      color: "bg-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Rejected",
      value: formatAmount(summary.rejectedAmount),
      subtitle: `${summary.rejectedClaims} rejected`,
      icon: <FiXCircle />,
      color: "bg-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="ui-card ui-card-interactive group relative overflow-hidden p-6">
          <span className={`absolute left-0 top-0 h-1 w-full ${card.color}`} />
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-subtle">{card.title}</p>
              <h2 className="mt-2 truncate text-2xl font-bold text-ink">{card.value}</h2>
            </div>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition group-hover:scale-110 ${card.iconBg} ${card.iconColor}`}>
              {card.icon}
            </div>
          </div>
          <p className="mt-5 text-sm text-ink-subtle">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

export default ReimbursementSummary;
