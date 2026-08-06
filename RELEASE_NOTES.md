# 🚀 Kado Cafe POS - Version 1.0 Release Notes

Welcome to the commercial production release of **Kado Cafe POS**. This release represents 10 complete engineering sprints transforming Kado Cafe into a fast, commercial-grade Kitchen Display System (KDS), Billing & Checkout System, Inventory & Recipe Manager, Customer CRM & Loyalty Platform, Owner Analytics Dashboard, RBAC Employee Manager, and QR Customer Self-Service application.

---

## 🌟 Key Highlights & Sprint Overview

### Sprint 1: Tables 2.0
- Grid layout with real-time status indicators (Available, Ordering, Preparing, Ready, Billing, Reserved, Cleaning).
- Table Transfer, Table Merge, Table Split, and Order Duplication workflows.
- Visual seat capacity badges and active order timer tracking.

### Sprint 2: Parcel 2.0
- Complete Takeaway & Parcel order management.
- Dynamic urgency timers and status pipeline (`Preparing` -> `Ready` -> `Delivered`).
- Parcel customer notes and phone tracking.

### Sprint 3 & 3.5: Kitchen 2.0 & Release Candidate 1 (RC-1)
- Commercial Kitchen Display System (KDS) matching Toast/Petpooja standards.
- Audio alerts on new orders and status updates.
- Incremental kitchen order delta tracking for additional table rounds.

### Sprint 4 & 4.5: Billing & Checkout 2.0
- Instant cashier checkout panel with Cash, UPI, Card, Split, and Pending payment options.
- Automated GST, Round-Off, and custom discount calculation.
- Printable thermal receipts and invoice history.

### Sprint 5: Inventory & Recipe Management
- Automatic stock deduction upon completed billing based on item recipes.
- Low stock and out-of-stock threshold alerts.
- Stock adjustment logs and purchase entry records.

### Sprint 6 & 6.5: Customer CRM & Loyalty System (RC-5)
- Automatic Customer Recognition by phone number.
- Dynamic Membership Tiers: Silver (₹0-₹9.9k), Gold (₹10k-₹49.9k), Platinum (₹50k+).
- Loyalty points pool (1 pt per ₹20 spent) with point redemption during checkout.
- Customer Profile takeover with Top 5 Favorite Items, order history, and birthday/anniversary reminders.

### Sprint 7: Reports & Owner Control Center
- Real-time Owner Dashboard with 14 analytical modules.
- Interactive Recharts Area & Bar trends for hourly, daily, and monthly revenue.
- Peak Hours density heatmap, Table Turnaround analytics, and Slow Moving Item recommendations.
- CSV Data Export and native print support.

### Sprint 8: Employee Management & Role-Based Access Control (RBAC)
- Multi-role permission matrix for Owner, Manager, Cashier, Staff, Waiter, and Kitchen.
- PIN authentication with security blocks for disabled accounts.
- Shift Manager (Clock-In / Clock-Out) and real-time System Activity Audit Trail.

### Sprint 9: QR Ordering & Customer Self-Service
- Scan-to-Order table web app with multi-language support (English, Hindi, Marathi).
- Item customization notes ("Less sugar", "No onion").
- Real-time Order Progress Tracker (`New` -> `Cooking` -> `Ready` -> `Served`).
- Call Waiter & Request Bill instant staff alerts.
- Customer Feedback rating system and WhatsApp Digital Receipt sharing.

### Sprint 10: Production Hardening & Enterprise Readiness
- Global Error Boundary fallback to prevent white screens.
- Real-time Offline Mode detection banner.
- Double-click debounce protection on all primary buttons.
- 80mm thermal receipt print CSS formatting.
- Complete data integrity and browser persistence.

---

## 🔒 Security & RBAC Roles

| Role | Access Scope |
| :--- | :--- |
| **Owner** | Full unrestricted access to all modules, RBAC permissions matrix, and settings. |
| **Manager** | Full operational access to Dashboard, Tables, Kitchen, Parcel, Menu, Customers, Insights, Reports, and Employees. |
| **Cashier / Staff** | Operational access to Tables, Parcel, Kitchen, and Billing. |
| **Waiter** | Access to Tables, Kitchen, and Parcel. |
| **Kitchen** | Dedicated KDS station view (`Kitchen` only). |

---

## 📦 Tech Stack
- **Core**: React 18, Vite 5, TailwindCSS 3
- **Icons & Visuals**: Lucide React
- **Charts**: Recharts
- **Storage**: LocalStorage with optional Supabase Realtime synchronization
