import React, { useMemo, useState, useEffect } from "react";
import { ScrollText, ShieldAlert, Cloud, RefreshCw } from "lucide-react";
import { fetchActivityLogs, fetchActivityLogsFromLedger, isCloudEnabled } from "../lib/storage.js";

const PAGE_SIZE = 100;

const MODULE_COLORS = {
  Auth: "bg-violet-100 text-violet-700",
  Billing: "bg-emerald-100 text-emerald-700",
  Inventory: "bg-amber-100 text-amber-700",
  CRM: "bg-sky-100 text-sky-700",
  Settings: "bg-stone-200 text-stone-700",
  System: "bg-stone-100 text-stone-600",
};

export default function ActivityLogView({ state, currentUser }) {
  // Defense-in-depth: if accessed directly by non-owner
  if (currentUser && currentUser.role !== "Owner") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-8 text-center text-stone-400">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-500 mb-2" />
          <h3 className="text-base font-semibold text-stone-200">Owner Access Required</h3>
          <p className="text-sm mt-1 text-stone-500">Only the cafe Owner has permission to view the activity audit logs.</p>
        </div>
      </div>
    );
  }

  const [module, setModule] = useState("");
  const [employee, setEmployee] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [cloudLogs, setCloudLogs] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allLogs = state?.activityLogs || [];

  const modules = useMemo(
    () => [...new Set(allLogs.map((l) => l.module).filter(Boolean))].sort(),
    [allLogs]
  );
  const employees = useMemo(
    () => [...new Set(allLogs.map((l) => l.employeeName).filter(Boolean))].sort(),
    [allLogs]
  );

  const localFiltered = useMemo(
    () =>
      fetchActivityLogs(state, {
        module: module || undefined,
        employee: employee || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        // include the whole "to" day
        to: to ? new Date(to + "T23:59:59.999").toISOString() : undefined,
        search: search || undefined,
      }),
    [state, module, employee, from, to, search]
  );

  const loadCloudLogs = () => {
    if (isCloudEnabled && currentUser?.role === "Owner") {
      setIsRefreshing(true);
      fetchActivityLogsFromLedger({
        module: module || undefined,
        employee: employee || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + "T23:59:59.999").toISOString() : undefined,
        search: search || undefined,
        limit: 500,
      })
        .then((rows) => {
          if (rows && rows.length > 0) {
            setCloudLogs(rows);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsRefreshing(false);
        });
    }
  };

  useEffect(() => {
    loadCloudLogs();
  }, [module, employee, from, to, search, currentUser]);

  const activeLogSource = cloudLogs !== null ? cloudLogs : localFiltered;
  const visible = activeLogSource.slice(0, shown);
  const inputCls =
    "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-stone-400" />
          <h2 className="text-lg font-semibold text-stone-100">Activity Log</h2>
          <span className="text-sm text-stone-400">({activeLogSource.length} entries)</span>
          {cloudLogs !== null && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <Cloud size={12} /> Cloud Ledger
            </span>
          )}
        </div>
        {isCloudEnabled && (
          <button
            onClick={loadCloudLogs}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200 bg-stone-900 border border-stone-800 rounded-lg hover:bg-stone-800 transition cursor-pointer"
            title="Refresh logs from cloud ledger"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin text-amber-500" : ""} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={module} onChange={(e) => { setModule(e.target.value); setShown(PAGE_SIZE); }} className={inputCls}>
          <option value="">All modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={employee} onChange={(e) => { setEmployee(e.target.value); setShown(PAGE_SIZE); }} className={inputCls}>
          <option value="">All employees</option>
          {employees.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setShown(PAGE_SIZE); }} className={inputCls} aria-label="From date" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setShown(PAGE_SIZE); }} className={inputCls} aria-label="To date" />
        <input
          type="search" value={search} placeholder="Search actions…"
          onChange={(e) => { setSearch(e.target.value); setShown(PAGE_SIZE); }}
          className={`${inputCls} min-w-[180px] flex-1`}
        />
      </div>

      {/* Log list */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-stone-400">No activity matches these filters.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {visible.map((log) => (
              <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${MODULE_COLORS[log.module] || MODULE_COLORS.System}`}>
                  {log.module}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-800">{log.action}</p>
                  {log.details && <p className="mt-0.5 truncate text-xs text-stone-500">{log.details}</p>}
                  <p className="mt-0.5 text-xs text-stone-400">{log.employeeName}</p>
                </div>
                <time className="shrink-0 text-xs text-stone-400">
                  {new Date(log.timestamp).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeLogSource.length > shown && (
        <button
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="mt-3 w-full rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          Show more ({activeLogSource.length - shown} remaining)
        </button>
      )}
    </div>
  );
}
