import { useMemo } from "react";
import StaffApp from "./components/StaffApp.jsx";
import CustomerOrderPage from "./views/CustomerOrderPage.jsx";

// The app has two top-level modes:
//   /                    → Staff facing POS (login, dashboard, tables, kitchen, etc.)
//   /?table=<id>         → Customer-facing scan-to-order page (opened via QR on the table)
//
// Deciding via URL keeps things simple, has no router dependency, and works on
// a plain device with no build polyfills required.

export default function App() {
  const tableParam = useMemo(
    () => new URLSearchParams(window.location.search).get("table"),
    []
  );

  if (tableParam) return <CustomerOrderPage tableId={tableParam} />;
  return <StaffApp />;
}
