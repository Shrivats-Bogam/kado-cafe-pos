import { useMemo, lazy, Suspense } from "react";
import StaffApp from "./components/StaffApp.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { OfflineBanner } from "./components/OfflineBanner.jsx";

const CustomerOrderPage = lazy(() => import("./views/CustomerOrderPage.jsx"));

// The app has two top-level modes:
//   /                    → Staff facing POS (login, dashboard, tables, kitchen, etc.)
//   /?table=<id>         → Customer-facing scan-to-order page (opened via QR on the table)

export default function App() {
  const tableParam = useMemo(
    () => new URLSearchParams(window.location.search).get("table"),
    []
  );

  return (
    <ErrorBoundary>
      <OfflineBanner />
      {tableParam ? (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen p-10 text-stone-400">Loading…</div>}>
          <CustomerOrderPage tableId={tableParam} />
        </Suspense>
      ) : (
        <StaffApp />
      )}
    </ErrorBoundary>
  );
}
