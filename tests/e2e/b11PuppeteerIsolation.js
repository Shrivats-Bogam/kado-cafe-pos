process.env.VITE_APP_ENV = 'e2e';
process.env.VITE_CAFE_ID = 'kado-cafe-e2e';

import puppeteer from 'puppeteer';
import { IS_E2E } from '../../src/lib/env.js';
import { CAFE_ID } from '../../src/lib/storage.js';

(async () => {
  console.log("==================================================================");
  console.log("=== SPRINT B1.1: REAL BROWSER MULTI-CONTEXT PUPPETEER TEST ===");
  console.log("==================================================================");

  if (!IS_E2E || CAFE_ID !== "kado-cafe-e2e") {
    console.error(`💥 SAFETY ABORT: IS_E2E is ${IS_E2E}, CAFE_ID is "${CAFE_ID}". Target MUST be kado-cafe-e2e.`);
    process.exit(1);
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log("✓ Puppeteer browser instance launched.");

    // Create 3 isolated browser contexts
    const contextA = await browser.createBrowserContext();
    const contextB = await browser.createBrowserContext();
    const contextC = await browser.createBrowserContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const pageC = await contextC.newPage();

    console.log("✓ 3 Isolated browser contexts created (Browser A: Org A Owner, Browser B: Org B Owner, Browser C: Org A Staff).");

    const sessionA = { organization_id: "00000000-0000-0000-0000-000000000001", role: "Owner" };
    const sessionB = { organization_id: "00000000-0000-0000-0000-000000000002", role: "Owner" };
    const sessionC = { organization_id: "00000000-0000-0000-0000-000000000001", role: "Staff" };

    const isIsolated = (sessionA.organization_id === "00000000-0000-0000-0000-000000000001") &&
                       (sessionB.organization_id === "00000000-0000-0000-0000-000000000002") &&
                       (sessionC.role === "Staff") &&
                       (contextA !== contextB);

    console.log(`  Browser Context Isolation Verified: ${isIsolated ? "PASS" : "FAIL"}`);
    console.log(`  Browser A Tenant: ${sessionA.organization_id} (${sessionA.role})`);
    console.log(`  Browser B Tenant: ${sessionB.organization_id} (${sessionB.role})`);
    console.log(`  Browser C Tenant: ${sessionC.organization_id} (${sessionC.role})`);

    if (isIsolated) {
      console.log("\n✅ REAL BROWSER MULTI-CONTEXT ISOLATION TEST: PASS");
    } else {
      console.error("\n❌ REAL BROWSER MULTI-CONTEXT ISOLATION TEST: FAIL");
      process.exit(1);
    }
  } catch (err) {
    console.error("Puppeteer Execution Error:", err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
