// e2eGuard.js — Hard safety guard enforcing E2E test isolation

/**
 * Asserts that the current process and target browser page are connected to an E2E test environment.
 * If production is detected, logs the exact prohibited message and terminates execution immediately.
 * 
 * @param {object} [page] Puppeteer page object
 */
export async function assertE2EEnvironment(page) {
  const processEnv = process.env.VITE_APP_ENV || process.env.APP_ENV || process.env.NODE_ENV;
  
  // 1. Process environment check
  if (processEnv === "production") {
    printAbortAndExit();
  }

  // 2. Browser target check
  if (page) {
    let targetDetails = null;
    try {
      targetDetails = await page.evaluate(() => ({
        cafeId: window.__KADO_CAFE_ID || null,
        appEnv: window.__KADO_APP_ENV || null,
        lsKey: window.__KADO_LS_KEY || null,
      }));
    } catch {
      // Page not loaded or evaluated yet
    }

    if (targetDetails) {
      const { cafeId, appEnv, lsKey } = targetDetails;
      // Production detected if CAFE_ID is "kado-cafe", appEnv is "production", or environment is not e2e
      const isProductionMode = appEnv === "production" || cafeId === "kado-cafe" || lsKey === "kado-cafe-state" || (appEnv !== "e2e" && cafeId !== "kado-cafe-e2e");

      if (isProductionMode) {
        printAbortAndExit();
      }
    }
  }
}

function printAbortAndExit() {
  console.error("\nE2E TEST ABORTED\n");
  console.error("Production environment detected.");
  console.error("Automated tests are prohibited against production data.\n");
  process.exit(1);
}
