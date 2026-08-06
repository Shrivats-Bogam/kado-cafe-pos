import { useMemo } from "react";
import StaffApp from "./components/StaffApp.jsx";
import CustomerOrderPage from "./views/CustomerOrderPage.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { OfflineBanner } from "./components/OfflineBanner.jsx";

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
      {tableParam ? <CustomerOrderPage tableId={tableParam} /> : <StaffApp />}
    </ErrorBoundary>
  );
}
