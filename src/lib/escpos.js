// src/lib/escpos.js
// High-performance binary ESC/POS bytecode builder and receipt formatters
// Designed for 58mm and 80mm thermal receipt printers.

const ESC = 0x1b;
const GS = 0x1d;

export class EscPosBuilder {
  constructor(charWidth = 48) {
    this.charWidth = charWidth; // 48 chars for 80mm, 32 chars for 58mm
    this.buffer = [];
  }

  // Raw byte ingestion
  appendBytes(...bytes) {
    this.buffer.push(...bytes);
    return this;
  }

  // Encodes UTF-8 / ASCII text safely into bytes
  text(str = "") {
    const encoder = new TextEncoder();
    // Replace non-ASCII currency symbol ₹ with Rs. for standard thermal code pages
    const sanitized = String(str).replace(/₹/g, "Rs. ");
    const encoded = encoder.encode(sanitized);
    this.buffer.push(...encoded);
    return this;
  }

  line(str = "") {
    this.text(str);
    this.appendBytes(0x0a); // LF
    return this;
  }

  feed(n = 1) {
    this.appendBytes(ESC, 0x64, Math.max(1, n));
    return this;
  }

  init() {
    this.appendBytes(ESC, 0x40); // ESC @
    return this;
  }

  align(alignment = "left") {
    const map = { left: 0x00, center: 0x01, right: 0x02 };
    this.appendBytes(ESC, 0x61, map[alignment] ?? 0x00);
    return this;
  }

  bold(enable = true) {
    this.appendBytes(ESC, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  doubleSize(enable = true) {
    // 0x11 = double width & height, 0x00 = normal
    this.appendBytes(GS, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  doubleHeight(enable = true) {
    this.appendBytes(GS, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  normalSize() {
    this.appendBytes(GS, 0x21, 0x00);
    return this;
  }

  dashedLine(char = "-") {
    this.line(char.repeat(this.charWidth));
    return this;
  }

  twoColumn(leftStr = "", rightStr = "") {
    const left = String(leftStr);
    const right = String(rightStr);
    const available = this.charWidth - right.length;
    if (available <= 0) {
      this.line(left);
      this.line(right.padStart(this.charWidth, " "));
      return this;
    }
    const truncatedLeft = left.length > available ? left.slice(0, available - 1) + " " : left;
    const padding = " ".repeat(Math.max(1, this.charWidth - truncatedLeft.length - right.length));
    this.line(truncatedLeft + padding + right);
    return this;
  }

  threeColumn(col1 = "", col2 = "", col3 = "") {
    // e.g. Item (col1 ~ 50%), Qty (col2 ~ 20%), Price (col3 ~ 30%)
    const c2 = String(col2);
    const c3 = String(col3);
    const col3Width = Math.max(8, Math.floor(this.charWidth * 0.28));
    const col2Width = Math.max(5, Math.floor(this.charWidth * 0.16));
    const col1Width = this.charWidth - col2Width - col3Width;

    const pad1 = String(col1).slice(0, col1Width).padEnd(col1Width, " ");
    const pad2 = c2.padStart(col2Width, " ");
    const pad3 = c3.padStart(col3Width, " ");

    this.line(pad1 + pad2 + pad3);
    return this;
  }

  cut(partial = true) {
    this.feed(3);
    // GS V 66 0 (partial cut) or GS V 65 0 (full cut)
    this.appendBytes(GS, 0x56, partial ? 0x42 : 0x41, 0x00);
    return this;
  }

  kickDrawer() {
    // ESC p 0 25 250 (pulse on pin 2, 50ms ON, 500ms OFF)
    this.appendBytes(ESC, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  buzzer(beeps = 2) {
    // ESC B n t (beeps count, duration)
    this.appendBytes(ESC, 0x42, Math.min(9, beeps), 0x02);
    return this;
  }

  build() {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Formats a commercial customer bill for ESC/POS thermal printers.
 */
export function formatReceiptESC(order = {}, settings = {}, opts = {}) {
  const widthStr = opts.width || settings.receiptWidth || "80mm";
  const charWidth = widthStr === "58mm" ? 32 : 48;
  const builder = new EscPosBuilder(charWidth);

  builder.init();

  // Cash drawer kick if cash payment and enabled
  const isCash = (order.paymentMode || order.paymentMethod || "").toLowerCase() === "cash";
  const shouldKick = opts.kickDrawer ?? (isCash && (settings.kickDrawerOnCash !== false));
  if (shouldKick) {
    builder.kickDrawer();
  }

  // Header
  builder.align("center");
  if (settings.showLogoOnReceipt && settings.businessName) {
    builder.bold(true).doubleSize(true).line(settings.businessName || "KADO CAFE").normalSize().bold(false);
  } else {
    builder.bold(true).doubleHeight(true).line(settings.businessName || "KADO CAFE").normalSize().bold(false);
  }

  if (settings.address && settings.showAddressOnReceipt !== false) {
    builder.line(settings.address);
  }
  if (settings.phone) {
    builder.line(`Tel: ${settings.phone}`);
  }
  if (settings.gstin && settings.showGstinOnReceipt !== false) {
    builder.line(`GSTIN: ${settings.gstin}`);
  }

  builder.dashedLine("=");

  // Metadata
  builder.align("left");
  const invoiceNo = order.id || order.billId || order.invoiceNo || "INV-001";
  const dateStr = order.paidAt || order.createdAt ? new Date(order.paidAt || order.createdAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
  
  builder.twoColumn(`Bill: ${invoiceNo}`, (order.source || "POS Order"));
  builder.twoColumn(`Date: ${dateStr}`, (order.tableNumber ? `Table ${order.tableNumber}` : ""));
  if (order.customerName) {
    builder.line(`Customer: ${order.customerName}${order.phone ? ` (${order.phone})` : ""}`);
  }

  builder.dashedLine("-");

  // Items Table Header
  builder.bold(true);
  builder.threeColumn("ITEM", "QTY", "AMOUNT");
  builder.bold(false);
  builder.dashedLine("-");

  // Items
  const items = order.items || [];
  items.forEach((item) => {
    const name = item.name || item.menuItemId || "Item";
    const qty = item.qty || 1;
    const price = item.price || item.unitPrice || 0;
    const lineTotal = (qty * price).toFixed(2);
    builder.threeColumn(name, `x${qty}`, `Rs. ${lineTotal}`);
    if (item.notes) {
      builder.line(` * ${item.notes}`);
    }
  });

  builder.dashedLine("-");

  // Financial Breakdown
  const subtotal = Number(order.subtotal ?? (order.total - (order.tax || 0)) ?? 0);
  const tax = Number(order.tax ?? 0);
  const discount = Number(order.discount ?? 0);
  const pointsRedeemed = Number(order.pointsRedeemed ?? 0);
  const grandTotal = Number(order.grandTotal ?? order.total ?? 0);

  builder.twoColumn("Subtotal:", `Rs. ${subtotal.toFixed(2)}`);
  if (tax > 0) {
    const gstRate = settings.gstRate || 5;
    builder.twoColumn(`GST (${gstRate}%):`, `Rs. ${tax.toFixed(2)}`);
  }
  if (discount > 0) {
    builder.twoColumn("Discount:", `-Rs. ${discount.toFixed(2)}`);
  }
  if (pointsRedeemed > 0) {
    builder.twoColumn("Points Redeemed:", `-Rs. ${pointsRedeemed.toFixed(2)}`);
  }

  builder.dashedLine("=");
  builder.bold(true).doubleHeight(true);
  builder.twoColumn("TOTAL PAYABLE:", `Rs. ${grandTotal.toFixed(2)}`);
  builder.normalSize().bold(false);
  builder.dashedLine("=");

  // Payment Method
  builder.twoColumn("Payment Method:", order.paymentMode || order.paymentMethod || "Cash");
  if (order.status) {
    builder.twoColumn("Payment Status:", order.status);
  }

  // Footer & Loyalty
  builder.feed(1);
  builder.align("center");
  if (order.loyaltyPointsEarned) {
    builder.line(`Points Earned Today: +${order.loyaltyPointsEarned} pts`);
  }
  if (settings.receiptFooter) {
    builder.line(settings.receiptFooter);
  } else {
    builder.line("Thank you for visiting! Please visit again.");
  }

  if (settings.autoCutPaper !== false) {
    builder.cut(true);
  } else {
    builder.feed(3);
  }

  return builder.build();
}

/**
 * Formats a Kitchen Order Ticket (KOT) for thermal KDS/Kitchen printers.
 */
export function formatKOT_ESC(ticket = {}, settings = {}, opts = {}) {
  const widthStr = opts.width || settings.receiptWidth || "80mm";
  const charWidth = widthStr === "58mm" ? 32 : 48;
  const builder = new EscPosBuilder(charWidth);

  builder.init();

  if (settings.buzzerOnKOT !== false) {
    builder.buzzer(2);
  }

  builder.align("center");
  builder.bold(true).doubleSize(true).line("KITCHEN ORDER TICKET").normalSize().bold(false);
  builder.dashedLine("=");

  builder.align("left");
  const tableTitle = ticket.tableNumber || ticket.number ? `TABLE: ${ticket.tableNumber || ticket.number}` : (ticket.type === "parcel" ? "PARCEL ORDER" : "ORDER");
  builder.bold(true).doubleHeight(true).line(tableTitle).normalSize().bold(false);
  
  builder.twoColumn(`Ticket: #${ticket.id || ticket.ticketId || "1"}`, `Type: ${ticket.type || "Dine-In"}`);
  builder.twoColumn(`Time: ${new Date(ticket.createdAt || Date.now()).toLocaleTimeString("en-IN")}`, ticket.serverName ? `Server: ${ticket.serverName}` : "");
  if (ticket.priority && ticket.priority !== "Normal") {
    builder.bold(true).line(`*** PRIORITY: ${ticket.priority.toUpperCase()} ***`).bold(false);
  }

  builder.dashedLine("-");
  builder.bold(true);
  builder.twoColumn("ITEM", "QTY");
  builder.bold(false);
  builder.dashedLine("-");

  const items = ticket.items || [];
  items.forEach((it) => {
    const name = it.name || it.menuItemId || "Item";
    const qty = it.qty || 1;
    builder.bold(true).doubleHeight(true).twoColumn(name, `x${qty}`).normalSize().bold(false);
    if (it.notes) {
      builder.line(`  >> Note: ${it.notes}`);
    }
  });

  if (ticket.notes) {
    builder.dashedLine("-");
    builder.bold(true).line(`ORDER NOTES: ${ticket.notes}`).bold(false);
  }

  builder.dashedLine("=");
  builder.feed(1);
  builder.align("center").line("--- End of Ticket ---");
  builder.cut(true);

  return builder.build();
}

/**
 * Formats a diagnostic self-test print receipt to verify hardware communication.
 */
export function formatTestReceiptESC(settings = {}, opts = {}) {
  const widthStr = opts.width || settings.receiptWidth || "80mm";
  const charWidth = widthStr === "58mm" ? 32 : 48;
  const builder = new EscPosBuilder(charWidth);

  builder.init();
  builder.align("center");
  builder.bold(true).doubleSize(true).line("HARDWARE TEST").normalSize().bold(false);
  builder.line("ESC/POS Thermal Engine Active");
  builder.dashedLine("=");

  builder.align("left");
  builder.twoColumn("Paper Width:", `${widthStr} (${charWidth} chars)`);
  builder.twoColumn("Timestamp:", new Date().toLocaleTimeString("en-IN"));
  builder.twoColumn("Printer Transport:", opts.transport || "Direct Hardware");
  builder.dashedLine("-");

  builder.line("Formatting Tests:");
  builder.line("1. Normal Text Alignment: Left");
  builder.align("center").line("2. Centered Text Check").align("left");
  builder.bold(true).line("3. Bold Font Check").bold(false);
  builder.doubleHeight(true).line("4. Double Height Font").normalSize();
  builder.doubleSize(true).line("5. Double Size Font").normalSize();
  builder.dashedLine("-");

  builder.align("center");
  builder.line("✓ Hardware Connectivity Validated");
  builder.line(settings.businessName || "Kado Cafe POS System");
  builder.feed(1);
  builder.cut(true);

  return builder.build();
}
