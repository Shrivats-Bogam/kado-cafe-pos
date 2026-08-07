import { Phone, ChevronRight, Clock } from "lucide-react";
import { Card, Pill } from "../ui/index.js";
import { currency } from "../../lib/currency.js";
import { daysUntilBirthday } from "../../lib/loyalty.js";

/**
 * Deterministic tier calculator based on lifetime spend and points.
 */
export function getCustomerTier(spent = 0, points = 0) {
  if (spent >= 15000 || points >= 500) return { name: "Platinum", tone: "purple", icon: "👑" };
  if (spent >= 5000 || points >= 200) return { name: "Gold", tone: "amber", icon: "⭐" };
  if (spent >= 1000 || points >= 50) return { name: "Silver", tone: "slate", icon: "🥈" };
  return { name: "Bronze", tone: "emerald", icon: "🥉" };
}

/**
 * Format relative date (Today, Yesterday, 3 days ago, etc.)
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export function CustomerCard({ customer, lifetimeSpend = 0, onClick }) {
  const tier = getCustomerTier(lifetimeSpend, customer.points || 0);
  const bdayDays = daysUntilBirthday(customer.birthday);
  
  // Avatar initials
  const initials = (customer.name || "C")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Card
      onClick={onClick}
      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500/50 hover:bg-stone-850/80 transition-all group"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500/20 to-stone-800 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300 text-sm shadow-inner">
            {initials}
          </div>
          <span className="absolute -bottom-1 -right-1 text-xs" title={`Tier: ${tier.name}`}>
            {tier.icon}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-stone-100 text-base truncate group-hover:text-amber-300 transition-colors">
              {customer.name}
            </h3>
            <Pill tone={tier.tone} className="text-[10px] px-2 py-0.5 font-medium shrink-0">
              {tier.name}
            </Pill>
            {bdayDays !== null && bdayDays <= 7 && (
              <span className="text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/40 rounded-full px-2 py-0.5">
                🎂 {bdayDays === 0 ? "Birthday Today!" : `In ${bdayDays}d`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-400 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-stone-300">
              <Phone size={12} className="text-stone-500 shrink-0" />
              {customer.phone || "No phone"}
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-amber-400/90 font-medium">
              {customer.points || 0} pts
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-emerald-400 font-medium">
              {currency(lifetimeSpend)} lifetime
            </span>
          </div>

          <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1.5">
            <Clock size={11} className="shrink-0" />
            <span>Last Visit: {formatRelativeDate(customer.lastVisit)}</span>
            {customer.totalOrders > 0 && (
              <>
                <span>•</span>
                <span>{customer.totalOrders} order{customer.totalOrders > 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action indication */}
      <div 
        role="button"
        tabIndex={0}
        aria-label={`View ${customer?.name || "customer"} profile`}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        className="shrink-0 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
      >
        <ChevronRight size={18} />
      </div>
    </Card>
  );
}
