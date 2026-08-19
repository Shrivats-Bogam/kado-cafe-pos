import puppeteer from 'puppeteer';

const URL = 'http://localhost:5173';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickText(page, text) {
  // Use Puppeteer's built-in text selector, which is robust and handles trusted events
  const selector = `::-p-text(${text})`;
  const element = await page.waitForSelector(selector, { visible: true, timeout: 5000 });
  await element.click();
}

// Helper to click submit button
async function clickSubmit(page) {
  const btn = await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 5000 });
  await btn.click();
}

async function runB02Audit() {
  console.log("Starting B0.2 UI Workflow & Persistence Audit...");
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log("[1] Navigating to app...");
    await page.goto(URL, { waitUntil: 'networkidle2' });
    
    // Clear localStorage to ensure clean state and avoid duplicate PINs from previous test runs
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    
    // Check if login screen exists
    try {
      await page.waitForSelector("::-p-text(Who's working?)", { timeout: 3000 });
      console.log("    Login screen detected. Logging in as Owner...");
      // Click the first user card
      await page.evaluate(() => {
        const users = Array.from(document.querySelectorAll('button')).filter(e => e.textContent.includes('Owner') || e.textContent.includes('Admin'));
        if (users.length > 0) users[0].click();
      });
      await wait(500);
      
      // Click on-screen PIN buttons
      await clickText(page, '1');
      await clickText(page, '2');
      await clickText(page, '3');
      await clickText(page, '4');
      await wait(1000);
    } catch (e) {
      console.log("    No login screen or already logged in.");
    }
    
    // Wait for Dashboard to render
    await page.waitForSelector('::-p-text(Dashboard)', { timeout: 5000 });
    console.log("    Logged in successfully.");

    // 2. Inventory CRUD
    console.log("[2] Testing Inventory Flow...");
    console.log("    Clicking Inventory tab...");
    await clickText(page, 'Inventory');
    await wait(1000);
    
    console.log("    Clicking Add Product...");
    await clickText(page, 'Add Product');
    
    console.log("    Waiting for modal to open...");
    const invSubmitBtn = await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 5000 });
    
    // Fill Inventory Form using proper Puppeteer typing
    const invTextInputs = await page.$$('.fixed input[type="text"]');
    if (invTextInputs.length > 0) {
      await invTextInputs[0].click();
      await page.keyboard.type('E2E Test Beans');
    }
    
    const invNumberInputs = await page.$$('.fixed input[type="number"]');
    if (invNumberInputs.length > 0) {
      await invNumberInputs[0].click();
      await page.keyboard.type('50');
    }
    
    console.log("    Clicking Submit...");
    await invSubmitBtn.click(); // Submit!
    await wait(1000);
    
    // Refresh & Verify
    console.log("    Refreshing page to verify persistence...");
    await page.reload({ waitUntil: 'networkidle2' });
    await clickText(page, 'Inventory');
    await wait(1000);
    
    const inventoryContainsItem = await page.evaluate(() => {
      return document.body.innerText.includes('E2E Test Beans');
    });
    if (!inventoryContainsItem) throw new Error("Inventory item did not persist after refresh!");
    console.log("    Inventory CRUD: PASS");

    // 3. Menu CRUD
    console.log("[3] Testing Menu Flow...");
    console.log("    Clicking Menu tab...");
    await clickText(page, 'Menu');
    await wait(1000);
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      console.log("Visible buttons on Menu tab:", JSON.stringify(buttons.map(b => b.textContent.trim().substring(0, 30))));
    });

    console.log("    Clicking Add Menu Item...");
    await clickText(page, 'Add Menu Item');
    
    console.log("    Waiting for modal to open...");
    const submitBtn = await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 5000 });
    
    console.log("    Filling Menu Form...");
    const textInputs = await page.$$('.fixed input[type="text"]');
    if (textInputs.length > 0) {
      await textInputs[0].click();
      await page.keyboard.type('E2E Special Mocha');
    }
    const numberInputs = await page.$$('.fixed input[type="number"]');
    if (numberInputs.length > 0) {
      await numberInputs[0].click();
      await page.keyboard.type('250');
    }
    
    console.log("    Clicking Submit (Menu)...");
    await submitBtn.click();
    await wait(1000);
    
    console.log("    Refreshing page to verify persistence...");
    await page.reload({ waitUntil: 'networkidle2' });
    await clickText(page, 'Menu');
    await wait(1000);
    
    const menuContainsItem = await page.evaluate(() => {
      return document.body.innerText.includes('E2E Special Mocha');
    });
    if (!menuContainsItem) throw new Error("Menu item did not persist after refresh!");
    console.log("    Menu CRUD: PASS");
    
    // 4. Employee CRUD
    console.log("[4] Testing Employee Flow...");
    await clickText(page, 'Employees');
    await wait(1000);
    console.log("    Clicking Add Employee...");
    await clickText(page, 'Add Employee');
    
    console.log("    Waiting for modal to open...");
    const empSubmitBtn = await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 5000 });
    
    const empTextInputs = await page.$$('form input[type="text"]');
    if (empTextInputs.length > 0) {
      await empTextInputs[0].click();
      await page.keyboard.type('E2E Tester');
    }
    // PIN is password input
    const empPinInputs = await page.$$('form input[type="password"]');
    if (empPinInputs.length > 0) {
      await empPinInputs[0].click();
      await page.keyboard.type('9999');
    }
    
    console.log("    Clicking Submit (Employee)...");
    await empSubmitBtn.click();
    await wait(1000);
    
    // Check if modal is still open and has error
    const modalError = await page.evaluate(() => {
      const errorDiv = document.querySelector('.fixed .text-rose-400');
      return errorDiv ? errorDiv.textContent : null;
    });
    if (modalError) {
      console.log("    MODAL ERROR:", modalError);
    }
    
    console.log("    Refreshing page to verify persistence...");
    await page.reload({ waitUntil: 'networkidle2' });
    await clickText(page, 'Employees');
    await wait(1000);
    
    const employeeContainsItem = await page.evaluate(() => {
      return document.body.innerText.includes('E2E Tester');
    });
    if (!employeeContainsItem) throw new Error("Employee did not persist after refresh!");
    console.log("    Employee CRUD: PASS");

    console.log("\nAll UI CRUD & Persistence flows PASSED.");
    
  } catch (error) {
    console.error(`\nFAILED: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runB02Audit();
