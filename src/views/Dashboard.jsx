import {
  DashboardHeader,
  DashboardKPIs,
  QuickActions,
  DashboardAlerts,
  SalesOverview,
  RecentActivity,
} from "../components/dashboard/index.js";

export default function Dashboard({ state, onNavigate, user }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Operational Status */}
      <DashboardHeader user={user} cafeName={state?.cafeName || "Kado Cafe"} />

      {/* 2. Top Executive KPI Cards */}
      <DashboardKPIs state={state} />

      {/* 3. Touch-Friendly Quick Action Buttons */}
      <QuickActions onNavigate={onNavigate} />

      {/* 4. Real-time Live Operational Status Grid */}
      <DashboardAlerts state={state} />

      {/* 5. Today's Executive Business Insights */}
      <SalesOverview state={state} />

      {/* 6. Recent Activity Feed */}
      <RecentActivity state={state} />
    </div>
  );
}
