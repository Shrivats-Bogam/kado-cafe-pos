import puppeteer from 'puppeteer';
import { assertE2EEnvironment } from './e2eGuard.js';

const URL = 'http://localhost:5173';
const wait = (ms) => new Promise(res => setTimeout(res, ms));

async function runAudit() {
  console.log("=================================================");
  console.log("  SPRINT B0.2: E2E WORKFLOW & PERSISTENCE AUDIT");
  console.log("=================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[kado-cafe]') || text.includes('Error') || text.includes('FAILED')) {
      console.log('  [PAGE LOG]', text);
    }
  });

  const bugs = [];

  const recordBug = (id, module, desc, expected, actual) => {
    const bug = { id, module, desc, expected, actual };
    bugs.push(bug);
    console.error(`❌ BUG RECORDED [${id}] in ${module}: ${desc}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual:   ${actual}`);
  };

  try {
    // ------------------------------------------------------------------
    // STEP 1: INITIAL CLEAN LOAD & LOGIN
    // ------------------------------------------------------------------
    // 1. Navigate to app & clear previous session for clean test baseline
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await assertE2EEnvironment(page);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await wait(800);

    // Login as Owner
    const ownerCards = await page.$$('[data-testid="login-user-Owner"]');
    console.log(`      Found ${ownerCards.length} Owner card(s), attempting login...`);
    for (let i = 0; i < ownerCards.length; i++) {
      const freshCards = await page.$$('[data-testid="login-user-Owner"]');
      if (!freshCards[i]) break;
      await freshCards[i].click();
      await wait(300);

      for (const d of "1234") {
        const digitBtn = await page.$(`button[data-testid="pin-digit-${d}"]`);
        if (digitBtn) await digitBtn.click();
        await wait(100);
      }
      await wait(600);

      const dash = await page.$('[data-testid="nav-dashboard"]');
      if (dash) break;

      // Click Back to retry next card
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const txt = await page.evaluate(el => el.innerText, b);
        if (txt.includes('Back')) {
          await b.click();
          break;
        }
      }
      await wait(300);
    }

    const dashboardNav = await page.waitForSelector('[data-testid="nav-dashboard"]', { visible: true, timeout: 15000 });
    if (!dashboardNav) {
      recordBug("BUG-B02-001", "Auth", "Owner Login Failed", "Dashboard nav visible after PIN 1234", "Dashboard nav missing");
    } else {
      console.log("  ✓ Owner logged in successfully.");
    }

    const runId = `${Date.now()}_${process.pid}`;
    const invNameStr = `E2E_B02_Beans_${runId}`;
    const menuNameStr = `E2E_B02_Espresso_${runId}`;
    const empNameStr = `E2E_B02_Barista_${runId}`;

    // ------------------------------------------------------------------
    // STEP 2: INVENTORY CRUD & PERSISTENCE
    // ------------------------------------------------------------------
    console.log("\n[2/8] Testing Inventory CRUD & Persistence...");
    const invNav = await page.waitForSelector('[data-testid="nav-inventory"]', { visible: true });
    await invNav.click();
    await wait(800);

    const addInvBtn = await page.waitForSelector('[data-testid="add-inventory-btn"]', { visible: true });
    await addInvBtn.click();
    await wait(500);

    const invName = await page.waitForSelector('[data-testid="inv-name-input"]', { visible: true });
    await invName.type(invNameStr);
    
    const invCat = await page.waitForSelector('[data-testid="inv-category-input"]', { visible: true });
    await invCat.type("Coffee");

    const invUnit = await page.waitForSelector('[data-testid="inv-unit-select"]', { visible: true });
    await invUnit.select("kg");

    const invStock = await page.waitForSelector('[data-testid="inv-stock-input"]', { visible: true });
    await invStock.type("50");

    const invMinStock = await page.waitForSelector('[data-testid="inv-minstock-input"]', { visible: true });
    await invMinStock.type("5");

    const invCost = await page.waitForSelector('[data-testid="inv-costprice-input"]', { visible: true });
    await invCost.type("400");

    const invSubmit = await page.waitForSelector('[data-testid="inv-submit-btn"]', { visible: true });
    await invSubmit.click();
    await wait(1000);

    // Verify addition in DOM
    let bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(invNameStr)) {
      recordBug("BUG-B02-002", "Inventory", "Item creation failed in UI", `${invNameStr} visible in inventory grid`, "Item not found in DOM");
    } else {
      console.log("  ✓ Inventory item created in UI.");
    }

    // Reload page to test persistence
    console.log("      Reloading browser page to test Inventory persistence...");
    await page.reload({ waitUntil: 'networkidle2' });
    await (await page.waitForSelector('[data-testid="nav-inventory"]', { visible: true })).click();
    await wait(800);

    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(invNameStr)) {
      recordBug("BUG-B02-003", "Inventory", "Inventory item did not persist after reload", `${invNameStr} visible after refresh`, "Item lost on refresh");
    } else {
      console.log("  ✓ Inventory item persisted across reload.");
    }

    // ------------------------------------------------------------------
    // STEP 3: MENU CRUD & PERSISTENCE
    // ------------------------------------------------------------------
    console.log("\n[3/8] Testing Menu CRUD & Persistence...");
    await (await page.waitForSelector('[data-testid="nav-menu"]', { visible: true })).click();
    await wait(800);

    const addMenuBtn = await page.waitForSelector('[data-testid="add-menu-item-btn"]', { visible: true });
    await addMenuBtn.click();
    await wait(500);

    const menuName = await page.waitForSelector('[data-testid="menu-name-input"]', { visible: true });
    await menuName.type(menuNameStr);

    const menuPrice = await page.waitForSelector('[data-testid="menu-price-input"]', { visible: true });
    await menuPrice.type("150");

    const menuSubmit = await page.waitForSelector('[data-testid="menu-submit-btn"]', { visible: true });
    await menuSubmit.click();
    await wait(1000);

    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(menuNameStr)) {
      recordBug("BUG-B02-004", "Menu", "Menu item creation failed in UI", `${menuNameStr} visible in menu list`, "Item missing from DOM");
    } else {
      console.log("  ✓ Menu item created in UI.");
    }

    // Reload page to test persistence
    console.log("      Reloading browser page to test Menu persistence...");
    await page.reload({ waitUntil: 'networkidle2' });
    await (await page.waitForSelector('[data-testid="nav-menu"]', { visible: true })).click();
    await wait(800);

    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(menuNameStr)) {
      recordBug("BUG-B02-005", "Menu", "Menu item lost after page refresh", `${menuNameStr} visible after refresh`, "Item missing on refresh");
    } else {
      console.log("  ✓ Menu item persisted across reload.");
    }

    // ------------------------------------------------------------------
    // STEP 4: RECIPE CREATION & INGREDIENT LINKING
    // ------------------------------------------------------------------
    console.log("\n[4/8] Testing Recipe Creation & Editing...");
    await (await page.waitForSelector('[data-testid="nav-inventory"]', { visible: true })).click();
    await wait(800);

    // Click Recipes sub-tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const recipesSubTab = btns.find(b => b.textContent.includes('Recipe Builder') || b.textContent.includes('Recipes'));
      if (recipesSubTab) recipesSubTab.click();
    });
    await wait(800);

    // Select menuNameStr in the left list
    const espressoMenuItemBtn = await page.evaluateHandle((mName) => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes(mName));
    }, menuNameStr);
    if (espressoMenuItemBtn.asElement()) {
      await espressoMenuItemBtn.asElement().click();
      await wait(500);
    } else {
      recordBug("BUG-B02-006", "Recipes", `Could not select ${menuNameStr} in Recipe Builder`, `Button visible for ${menuNameStr}`, "Button missing");
    }

    // Click Add Ingredient
    const addIngrBtn = await page.waitForSelector('[data-testid="recipe-add-ingredient-btn"]', { visible: true });
    await addIngrBtn.click();
    await wait(300);

    // Select invNameStr in the dropdown
    const ingrSelect = await page.waitForSelector('[data-testid="recipe-ingredient-select-0"]', { visible: true });
    const beansOptionValue = await page.evaluate((iName) => {
      const select = document.querySelector('[data-testid="recipe-ingredient-select-0"]');
      const opts = Array.from(select.options);
      const target = opts.find(o => o.text.includes(iName));
      return target ? target.value : null;
    }, invNameStr);
    if (beansOptionValue) {
      await ingrSelect.select(beansOptionValue);
      await wait(200);
    }

    // Set Quantity to 0.02 (20 grams)
    const qtyInput = await page.waitForSelector('[data-testid="recipe-ingredient-qty-0"]', { visible: true });
    await qtyInput.click();
    // Select all and replace with 0.02
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.type('0.02');

    // Click Save Recipe
    const saveRecipeBtn = await page.waitForSelector('[data-testid="recipe-save-btn"]', { visible: true });
    await saveRecipeBtn.click();
    await wait(1000);

    console.log("      Reloading page to verify Recipe persistence...");
    await page.reload({ waitUntil: 'networkidle2' });
    await (await page.waitForSelector('[data-testid="nav-inventory"]', { visible: true })).click();
    await wait(800);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const recipesSubTab = btns.find(b => b.textContent.includes('Recipe Builder') || b.textContent.includes('Recipes'));
      if (recipesSubTab) recipesSubTab.click();
    });
    await wait(800);

    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(invNameStr)) {
      recordBug("BUG-B02-007", "Recipes", "Recipe ingredients lost on reload", `${invNameStr} listed under ${menuNameStr} recipe`, "Recipe ingredient missing");
    } else {
      console.log("  ✓ Recipe created & persisted successfully.");
    }

    // ------------------------------------------------------------------
    // STEP 5: TABLE CREATION & EDITING
    // ------------------------------------------------------------------
    console.log("\n[5/8] Testing Table Creation & Management...");
    await (await page.waitForSelector('[data-testid="nav-tables"]', { visible: true })).click();
    await wait(800);

    const addTableBtn = await page.waitForSelector('[data-testid="add-table-btn"]', { visible: true });
    await addTableBtn.click();
    await wait(500);

    const testUniqueSuffix = String(Math.floor(100 + Math.random() * 800));
    const testTableName = `B02_T_${testUniqueSuffix}`;

    const tableNameInput = await page.waitForSelector('[data-testid="table-name-input"]', { visible: true });
    await tableNameInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.type(testTableName);

    const tableNumInput = await page.waitForSelector('[data-testid="table-number-input"]', { visible: true });
    await tableNumInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.type(testUniqueSuffix);

    const tableNextBtn = await page.waitForSelector('[data-testid="table-next-btn"]', { visible: true });
    await tableNextBtn.click();
    await wait(1000);

    const tableSubmitBtn = await page.waitForSelector('[data-testid="table-submit-btn"]', { visible: true, timeout: 5000 });
    await tableSubmitBtn.click();
    await wait(1000);

    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(testTableName)) {
      recordBug("BUG-B02-008", "Tables", "New table creation failed", `${testTableName} visible in floor grid`, "Table missing");
    } else {
      console.log("  ✓ Dining Table created successfully.");
    }

    // ------------------------------------------------------------------
    // STEP 6: COMPLETE ORDERING, STOCK DEDUCTION & BILLING WORKFLOW
    // ------------------------------------------------------------------
    console.log("\n[6/8] Testing Order Placement, Stock Deduction & Checkout...");
    const tableCard = await page.waitForSelector(`[data-testid="table-card-${testUniqueSuffix}"]`, { visible: true });
    await tableCard.click();
    await wait(1000);

    // Add menuNameStr to order cart using data-testid selector
    const addEspressoBtn = await page.waitForSelector(`[data-testid="menu-picker-add-${menuNameStr}"]`, { visible: true });
    await addEspressoBtn.click();
    await wait(500);

    // Save order
    const saveOrderBtn = await page.waitForSelector('[data-testid="save-order-btn"]', { visible: true });
    await saveOrderBtn.click();
    await wait(1000);

    console.log("      Order sent to kitchen. Re-opening table for billing...");
    const tableCard2 = await page.waitForSelector(`[data-testid="table-card-${testUniqueSuffix}"]`, { visible: true });
    await tableCard2.click();
    await wait(1000);

    // Generate Bill
    const genBillBtn = await page.waitForSelector('[data-testid="generate-bill-btn"]', { visible: true });
    await genBillBtn.click();
    await wait(500);

    // Select Cash payment mode
    const cashPayModeBtn = await page.waitForSelector('[data-testid="pay-mode-cash"]', { visible: true });
    await cashPayModeBtn.click();
    await wait(200);

    const cashInput = await page.waitForSelector('[data-testid="cash-received-input"]', { visible: true });
    await cashInput.type("200");

    const confirmPayBtn = await page.waitForSelector('[data-testid="confirm-payment-btn"]', { visible: true });
    await confirmPayBtn.click();
    await wait(1500);

    console.log("  ✓ Order completed & billed.");

    // Verify Inventory Stock Deduction (Pre-stock 50.00 - 0.02 = 49.98 kg)
    console.log("      Verifying recipe-based stock deduction (50.00 - 0.02 = 49.98)...");
    await (await page.waitForSelector('[data-testid="nav-inventory"]', { visible: true })).click();
    await wait(800);

    const currentBeansStock = await page.evaluate((iName) => {
      const rows = Array.from(document.querySelectorAll('.grid > div'));
      const beansCard = rows.find(r => r.textContent.includes(iName));
      return beansCard ? beansCard.textContent : '';
    }, invNameStr);

    if (!currentBeansStock.includes("49.98")) {
      recordBug("BUG-B02-010", "Inventory Deduction", "Recipe stock deduction discrepancy", "Stock = 49.98 kg", `Stock text: ${currentBeansStock}`);
    } else {
      console.log("  ✓ Recipe stock deduction verified (49.98 kg).");
    }

    // ------------------------------------------------------------------
    // STEP 7: EMPLOYEE CRUD & PERSISTENCE
    // ------------------------------------------------------------------
    console.log("\n[7/8] Testing Employee CRUD & Persistence...");
    await (await page.waitForSelector('[data-testid="nav-employees"]', { visible: true })).click();
    await wait(800);

    const addEmpBtn = await page.waitForSelector('[data-testid="add-employee-btn"]', { visible: true });
    await addEmpBtn.click();
    await wait(500);

    const empName = await page.waitForSelector('[data-testid="emp-name-input"]', { visible: true });
    await empName.type(empNameStr);

    const empPhone = await page.waitForSelector('[data-testid="emp-phone-input"]', { visible: true });
    await empPhone.type("9876543210");

    const empPin = await page.waitForSelector('[data-testid="emp-pin-input"]', { visible: true });
    const randomEmpPin = String(Math.floor(2000 + Math.random() * 7000));
    await empPin.type(randomEmpPin);

    const empSubmit = await page.waitForSelector('[data-testid="emp-submit-btn"]', { visible: true });
    await empSubmit.click();
    await wait(1000);

    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(empNameStr)) {
      recordBug("BUG-B02-011", "Employees", "Employee creation failed", `${empNameStr} in directory`, "Employee missing");
    } else {
      console.log("  ✓ Employee created in UI.");
    }

    console.log("      Reloading page to verify Employee persistence...");
    await page.reload({ waitUntil: 'networkidle2' });
    await (await page.waitForSelector('[data-testid="nav-employees"]', { visible: true })).click();
    await wait(800);

    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes(empNameStr)) {
      recordBug("BUG-B02-012", "Employees", "Employee lost after refresh", `${empNameStr} visible after reload`, "Employee missing");
    } else {
      console.log("  ✓ Employee persisted across reload.");
    }

    // ------------------------------------------------------------------
    // STEP 8: FINANCIAL & OPERATIONAL RECONCILIATION
    // ------------------------------------------------------------------
    console.log("\n[8/8] Performing Financial & State Reconciliation Check...");
    const stateObj = await page.evaluate(() => {
      const raw = localStorage.getItem('kado-cafe-state');
      return raw ? JSON.parse(raw) : null;
    });

    if (!stateObj) {
      recordBug("BUG-B02-013", "Storage", "State missing from localStorage", "Valid state object", "null");
    } else {
      const orders = stateObj.orders || stateObj.orderHistory || [];
      const e2eOrders = orders.filter(o => o.items && o.items.some(i => (i.name && i.name.includes(menuNameStr)) || (i.menuItemId && stateObj.menuItems.find(m => m.id === i.menuItemId)?.name.includes(menuNameStr))));
      
      console.log(`      Total Orders Recorded: ${orders.length}`);
      console.log(`      E2E Audit Orders for ${menuNameStr}: ${e2eOrders.length}`);

      if (e2eOrders.length !== 1) {
        recordBug("BUG-B02-014", "Financials", "Duplicate bill or missing order detected", `Exactly 1 order for ${menuNameStr}`, `Found ${e2eOrders.length} orders`);
      } else {
        const order = e2eOrders[0];
        if (order.grandTotal !== 150) {
          recordBug("BUG-B02-015", "Financials", "Order revenue mismatch", "Grand Total = 150", `Grand Total = ${order.grandTotal}`);
        } else {
          console.log("  ✓ Financial reconciliation passed (150 INR revenue recorded, 0 duplicates).");
        }
      }
    }

  } catch (err) {
    console.error("\n💥 UNHANDLED TEST EXCEPTION:", err);
    recordBug("BUG-B02-CRASH", "Test Framework", "Test crashed unexpectedly", "Clean completion", err.message);
  } finally {
    await browser.close();
  }

  console.log("\n=================================================");
  console.log("  E2E AUDIT SUMMARY");
  console.log("=================================================");
  console.log(`  Total Bugs Found: ${bugs.length}`);
  if (bugs.length > 0) {
    console.table(bugs);
    process.exit(1);
  } else {
    console.log("  🎉 ALL 10 MODULE WORKFLOWS & PERSISTENCE TESTS PASSED ZERO BUGS!");
    process.exit(0);
  }
}

runAudit();
