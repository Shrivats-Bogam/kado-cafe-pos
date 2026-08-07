import { Plus, Coffee, Package, ChefHat, CreditCard, Users, BarChart3, ArrowUpRight } from "lucide-react";

export function QuickActions({ onNavigate }) {
  const handleAction = (tab) => {
    if (onNavigate) {
      onNavigate(tab);
    }
    window.dispatchEvent(new CustomEvent("kado-navigate-tab", { detail: tab }));
  };

  const actions = [
    {
      id: "tables",
      label: "Start Table",
      desc: "Open table & take order",
      icon: Coffee,
      tone: "bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/10",
      iconTone: "bg-stone-950/20 text-stone-950",
    },
    {
      id: "parcel",
      label: "Takeaway Parcel",
      desc: "Quick express checkout",
      icon: Package,
      tone: "bg-stone-850 hover:bg-stone-800 text-stone-50 border border-stone-750 hover:border-amber-500/50",
      iconTone: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    {
      id: "kitchen",
      label: "Kitchen KDS",
      desc: "Active cooking tickets",
      icon: ChefHat,
      tone: "bg-stone-850 hover:bg-stone-800 text-stone-50 border border-stone-750 hover:border-purple-500/50",
      iconTone: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    },
    {
      id: "tables",
      label: "Bill Checkout",
      desc: "Collect payment & print",
      icon: CreditCard,
      tone: "bg-stone-850 hover:bg-stone-800 text-stone-50 border border-stone-750 hover:border-emerald-500/50",
      iconTone: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      id: "customers",
      label: "Customer CRM",
      desc: "Loyalty & staff notes",
      icon: Users,
      tone: "bg-stone-850 hover:bg-stone-800 text-stone-50 border border-stone-750 hover:border-blue-500/50",
      iconTone: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    },
    {
      id: "reports",
      label: "Business Reports",
      desc: "Analytics & revenue",
      icon: BarChart3,
      tone: "bg-stone-850 hover:bg-stone-800 text-stone-50 border border-stone-750 hover:border-amber-500/50",
      iconTone: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
          <span>⚡</span> Quick App Launchers
        </h2>
        <span className="text-xs text-stone-400">Tap to launch module</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {actions.map((act, index) => {
          const Icon = act.icon;
          return (
            <button
              key={`${act.id}-${index}`}
              onClick={() => handleAction(act.id)}
              className={`p-4 rounded-2xl flex flex-col justify-between items-start min-h-[100px] transition-all duration-200 hover:-translate-y-1 active:scale-95 shadow-md hover:shadow-xl cursor-pointer group w-full ${act.tone}`}
            >
              <div className="flex justify-between items-center w-full">
                <div className={`p-2.5 rounded-xl ${act.iconTone} transition-transform group-hover:scale-110 shrink-0`}>
                  <Icon size={24} />
                </div>
                <ArrowUpRight size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>

              <div className="text-left mt-3 min-w-0 w-full">
                <p className="font-bold text-sm tracking-tight truncate leading-tight">
                  {act.label}
                </p>
                <p className="text-[11px] opacity-75 truncate mt-0.5 font-medium">
                  {act.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
