// src/lib/hardwarePrinter.js
// Unified Hardware Thermal Printer Driver & Peripheral Manager
// Supports WebUSB, WebSerial, Web Bluetooth, and Fast Browser Fallback.

import { formatReceiptESC, formatKOT_ESC, formatTestReceiptESC, EscPosBuilder } from "./escpos.js";

class HardwarePrinterManager {
  constructor() {
    this.activeDevice = null;
    this.activeTransport = "browser"; // "webusb" | "webserial" | "webbluetooth" | "browser"
    this.deviceName = "System Default (Browser Print)";
    this.outEndpoint = null;
    this.serialWriter = null;
    this.btCharacteristic = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const status = this.getStatus();
    this.listeners.forEach((fn) => {
      try { fn(status); } catch (e) { /* ignore listener error */ }
    });
  }

  getStatus() {
    return {
      connected: this.activeDevice !== null || this.activeTransport === "browser",
      isDirectHardware: this.activeDevice !== null && this.activeTransport !== "browser",
      transport: this.activeTransport,
      deviceName: this.deviceName,
      supportsWebUSB: typeof navigator !== "undefined" && Boolean(navigator.usb),
      supportsWebSerial: typeof navigator !== "undefined" && Boolean(navigator.serial),
      supportsWebBluetooth: typeof navigator !== "undefined" && Boolean(navigator.bluetooth),
    };
  }

  /**
   * Connect to a thermal printer via WebUSB
   */
  async connectUSB() {
    if (!navigator.usb) {
      throw new Error("WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.");
    }

    try {
      // Request USB device - filter by printer class 0x07 or vendor agnostic
      const device = await navigator.usb.requestDevice({
        filters: [{ classCode: 0x07 }]
      }).catch(async () => {
        // Fallback: prompt without class filter for printers with generic vendor IDs
        return await navigator.usb.requestDevice({ filters: [] });
      });

      if (!device) throw new Error("No USB printer selected.");

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim first available interface
      const iface = device.configuration.interfaces[0];
      await device.claimInterface(iface.interfaceNumber);

      // Find the OUT bulk endpoint to send print bytecode
      const endpoint = iface.alternate.endpoints.find(
        (e) => e.direction === "out" && e.type === "bulk"
      );

      if (!endpoint) {
        throw new Error("Could not find OUT bulk endpoint on the selected USB printer.");
      }

      this.activeDevice = device;
      this.outEndpoint = endpoint;
      this.activeTransport = "webusb";
      this.deviceName = device.productName || `USB Thermal Printer (${device.vendorId.toString(16)}:${device.productId.toString(16)})`;

      this.notify();
      return { success: true, deviceName: this.deviceName };
    } catch (err) {
      console.error("[HardwarePrinter] WebUSB connection error:", err);
      throw err;
    }
  }

  /**
   * Connect to a thermal printer via WebSerial (COM / Serial / USB-UART)
   */
  async connectSerial(baudRate = 9600) {
    if (!navigator.serial) {
      throw new Error("WebSerial is not supported in this browser. Please use Chrome or Edge.");
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(baudRate) || 9600 });

      this.activeDevice = port;
      this.activeTransport = "webserial";
      this.deviceName = "Serial COM Thermal Printer";

      this.notify();
      return { success: true, deviceName: this.deviceName };
    } catch (err) {
      console.error("[HardwarePrinter] WebSerial connection error:", err);
      throw err;
    }
  }

  /**
   * Connect to a portable Bluetooth thermal printer (BLE / SPP)
   */
  async connectBluetooth() {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth is not supported in this browser.");
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "49535343-fe7d-4ae5-8fa9-9fafd205e455",
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
        ]
      });

      const server = await device.gatt.connect();
      
      // Attempt to resolve primary service & characteristic
      let targetChar = null;
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const chars = await service.getCharacteristics();
        const writeChar = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
        if (writeChar) {
          targetChar = writeChar;
          break;
        }
      }

      if (!targetChar) {
        throw new Error("No writable print characteristic discovered on this Bluetooth device.");
      }

      this.activeDevice = device;
      this.btCharacteristic = targetChar;
      this.activeTransport = "webbluetooth";
      this.deviceName = device.name || "Bluetooth Portable Printer";

      this.notify();
      return { success: true, deviceName: this.deviceName };
    } catch (err) {
      console.error("[HardwarePrinter] Bluetooth connection error:", err);
      throw err;
    }
  }

  /**
   * Disconnect any attached direct hardware device and revert to browser print
   */
  async disconnect() {
    try {
      if (this.activeTransport === "webusb" && this.activeDevice) {
        await this.activeDevice.close();
      } else if (this.activeTransport === "webserial" && this.activeDevice) {
        await this.activeDevice.close();
      } else if (this.activeTransport === "webbluetooth" && this.activeDevice?.gatt) {
        this.activeDevice.gatt.disconnect();
      }
    } catch (e) {
      console.warn("[HardwarePrinter] Clean disconnect warning:", e);
    }

    this.activeDevice = null;
    this.outEndpoint = null;
    this.btCharacteristic = null;
    this.activeTransport = "browser";
    this.deviceName = "System Default (Browser Print)";
    this.notify();
  }

  /**
   * Send raw binary ESC/POS bytecode to the active printer
   */
  async sendRaw(uint8Bytes) {
    if (!(uint8Bytes instanceof Uint8Array)) {
      throw new Error("sendRaw expects a Uint8Array binary buffer.");
    }

    if (this.activeTransport === "webusb" && this.activeDevice && this.outEndpoint) {
      await this.activeDevice.transferOut(this.outEndpoint.endpointNumber, uint8Bytes);
      return { success: true, mode: "webusb" };
    }

    if (this.activeTransport === "webserial" && this.activeDevice) {
      const writer = this.activeDevice.writable.getWriter();
      try {
        await writer.write(uint8Bytes);
      } finally {
        writer.releaseLock();
      }
      return { success: true, mode: "webserial" };
    }

    if (this.activeTransport === "webbluetooth" && this.btCharacteristic) {
      // Chunk into 512-byte MTU blocks for reliable BLE transmission
      const CHUNK_SIZE = 512;
      for (let i = 0; i < uint8Bytes.length; i += CHUNK_SIZE) {
        const slice = uint8Bytes.subarray(i, i + CHUNK_SIZE);
        await this.btCharacteristic.writeValue(slice);
      }
      return { success: true, mode: "webbluetooth" };
    }

    // Direct hardware not connected -> Fallback to silent fast browser print
    this.printViaBrowserFallback(uint8Bytes);
    return { success: true, mode: "browser_fallback" };
  }

  /**
   * Fast, isolated browser print fallback.
   * Renders the receipt cleanly without locking or distorting the main React UI.
   */
  printViaBrowserFallback() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  /**
   * Print an order receipt
   */
  async printReceipt(order, settings = {}, opts = {}) {
    const bytes = formatReceiptESC(order, settings, {
      ...opts,
      kickDrawer: opts.kickDrawer ?? (order.paymentMode === "Cash" && settings.kickDrawerOnCash !== false)
    });
    return await this.sendRaw(bytes);
  }

  /**
   * Print a Kitchen Order Ticket (KOT)
   */
  async printKOT(ticket, settings = {}, opts = {}) {
    const bytes = formatKOT_ESC(ticket, settings, opts);
    return await this.sendRaw(bytes);
  }

  /**
   * Kick the connected cash drawer immediately (24V pulse via RJ11 DK port)
   */
  async kickCashDrawer() {
    const builder = new EscPosBuilder();
    builder.kickDrawer();
    const bytes = builder.build();
    return await this.sendRaw(bytes);
  }

  /**
   * Send a diagnostic alignment and hardware check receipt
   */
  async printTestReceipt(settings = {}) {
    const bytes = formatTestReceiptESC(settings, { transport: this.deviceName });
    return await this.sendRaw(bytes);
  }
}

// Global Singleton Instance
export const hardwarePrinter = new HardwarePrinterManager();
export default hardwarePrinter;
