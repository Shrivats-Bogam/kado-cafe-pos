process.env.VITE_APP_ENV = 'e2e';
process.env.VITE_CAFE_ID = 'kado-cafe-e2e';
process.env.VITE_LS_KEY = 'kado-cafe-e2e-state';

import { CAFE_ID } from '../../src/lib/storage.js';
import { IS_E2E } from '../../src/lib/env.js';

(() => {
  console.log("==================================================================");
  console.log("=== SPRINT B1.8: ENVIRONMENT SAFETY GUARD TEST ===");
  console.log("==================================================================");

  if (!IS_E2E || CAFE_ID !== "kado-cafe-e2e") {
    console.error(`💥 SAFETY ABORT: IS_E2E is ${IS_E2E}, CAFE_ID is "${CAFE_ID}". Target MUST be kado-cafe-e2e.`);
    process.exit(1);
  }

  console.log(`✅ Safety Guard PASSED: CAFE_ID="${CAFE_ID}", IS_E2E=${IS_E2E}`);
  console.log("Production data target (kado-cafe) is fully isolated.\n");
})();
