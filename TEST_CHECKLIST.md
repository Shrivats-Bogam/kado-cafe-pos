# 🧪 Kado Cafe POS - Release Candidate Test Checklist

This document outlines the step-by-step end-to-end verification checklist for Kado Cafe POS deployment.

---

## 1. Authentication & Role Access
- [x] **Owner Login**: Enter PIN `1234` -> Verify access to all 9 tabs + Settings.
- [x] **Manager Login**: Enter PIN `0000` -> Verify access to operational tabs.
- [x] **Kitchen Login**: Enter PIN `5555` -> Verify navigation locks to Kitchen view only.
- [x] **Disabled Employee Block**: Set employee status to "Disabled" -> Attempt login -> Verify system displays "Account Disabled" toast notification and blocks access.

## 2. Table Management
- [x] **Open Table**: Click an available table (e.g. Table 1) -> Add items -> Save Order -> Verify table status changes to "Preparing".
- [x] **Incremental Orders**: Open Table 1 again -> Add additional items -> Save Order -> Verify Kitchen receives ONLY new items in incremental ticket (`kitchenTickets`).
- [x] **Table Actions**: Test Table Transfer, Merge, Split, and Reserve actions.

## 3. Kitchen Display System (KDS)
- [x] **Real-time Order Receipt**: Place a table or parcel order -> Verify order appears in Kitchen queue immediately.
- [x] **Status Progression**: Click `Start Cooking` -> `Ready` -> `Served` -> Verify live status updates on table card.
- [x] **Sound Notifications**: Verify audio chime triggers when a new order arrives.

## 4. Billing & Checkout
- [x] **Generate Bill**: Click "Generate Bill" on a table -> Verify Invoice preview opens with correct Subtotal, GST, and Round-Off.
- [x] **Payment Modes**: Complete payment via Cash / UPI / Card -> Verify order moves to `orderHistory` and table resets to Available.
- [x] **Stock Deduction**: Verify inventory stock levels automatically deduct based on sold item recipes.

## 5. Customer CRM & Loyalty
- [x] **Auto Customer Lookup**: Enter phone `9876543210` during billing -> Verify customer details and loyalty points load automatically.
- [x] **Loyalty Points**: Complete bill -> Verify 1 point is earned per ₹20 spent.
- [x] **Tier Upgrades**: Cross ₹10,000 lifetime spend -> Verify tier upgrades to Gold 🥇; cross ₹50,000 -> Platinum 💎.

## 6. Reports & Owner Dashboard
- [x] **Revenue Metrics**: Open "Reports" tab -> Verify Today's Revenue, Average Order Value, and Sales Trend chart match billed totals.
- [x] **Filters**: Switch range between Today, Yesterday, This Week, and This Month -> Verify charts and KPIs update instantly.
- [x] **CSV Export**: Click "Export CSV" -> Verify success toast triggers and file downloads.

## 7. Employee Management & RBAC
- [x] **Employee Directory**: Add new employee -> Edit role/PIN -> Verify state updates cleanly.
- [x] **RBAC Matrix**: Toggle permissions for Manager/Cashier -> Verify allowed tabs update dynamically on login.
- [x] **Shift Manager**: Clock In / Clock Out -> Verify shift logs track timestamps.
- [x] **Activity Log**: Verify system events (Login, Bill Creation, Employee Update) append to audit trail.

## 8. QR Ordering & Self-Service
- [x] **Customer Menu Scan**: Open URL `?table=t1` -> Verify Customer Order Page loads with cafe name and table badge.
- [x] **Language Switching**: Toggle between EN, HI (हिंदी), and MR (मराठी) -> Verify translations update.
- [x] **Item Customization**: Add item with notes ("Less sugar") -> Send to Kitchen -> Verify Kitchen ticket includes item notes.
- [x] **Call Waiter & Request Bill**: Click "Call Waiter" -> Verify staff assistance alert triggers.

## 9. Production Hardening (Sprint 10)
- [x] **Error Boundary**: Trigger JS error -> Verify fallback screen displays "Something went wrong" with "Try Again" button.
- [x] **Offline Detection**: Toggle offline mode -> Verify amber warning banner appears at the top.
- [x] **Double-Click Protection**: Rapidly double-click primary action buttons -> Verify second click is throttled.
- [x] **Thermal Print**: Click "Print Receipt" -> Verify clean black-and-white 80mm receipt format.
