// secretScanner.js — Automated Secret Exposure Scanner (Sprint B1.5)

import fs from 'fs';
import path from 'path';

/**
 * Scan target directory or files for forbidden credentials and keys
 * @param {string} targetDir 
 * @returns {object} Scan result report
 */
export function scanSecrets(targetDir = '.') {
  const violations = [];

  const forbiddenPatterns = [
    { pattern: "SUPABASE_SERVICE_ROLE_KEY", name: "Supabase Service Role Key Variable" },
    { pattern: "service_role_key", name: "Service Role Secret Reference" },
    { pattern: "cm9sZSI6InNlcnZpY2Vfcm9sZS", name: "Raw Supabase Service Role JWT" }
  ];

  function scanFile(filePath) {
    if (
      filePath.includes("node_modules") ||
      filePath.includes(".git") ||
      filePath.includes("secretScanner.js") ||
      filePath.includes("b11MultiTenantSecurity.js") ||
      filePath.includes("b14DeploymentAudit.js") ||
      filePath.includes("B1.5_CICD_RELEASE_GOVERNANCE_AUDIT.md")
    ) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      forbiddenPatterns.forEach(({ pattern, name }) => {
        if (content.includes(pattern)) {
          violations.push({ file: filePath, patternName: name });
        }
      });
    } catch (err) {
      // Ignore binary files or unreadable paths
    }
  }

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        scanFile(fullPath);
      }
    }
  }

  // Scan src/ and dist/
  if (fs.existsSync('src')) walkDir('src');
  if (fs.existsSync('dist')) walkDir('dist');
  if (fs.existsSync('.env')) scanFile('.env');

  const clean = violations.length === 0;

  return {
    status: clean ? "CLEAN" : "VIOLATION_DETECTED",
    clean,
    violationsCount: violations.length,
    violations
  };
}

// Standalone CLI execution
if (process.argv[1] && process.argv[1].includes("secretScanner.js")) {
  console.log("[kado-secret-scanner] Running automated secret scanning...");
  const report = scanSecrets();
  if (report.clean) {
    console.log("✅ Secret Scanner PASSED: Zero private secrets or service-role keys detected.");
    process.exit(0);
  } else {
    console.error("❌ Secret Scanner FAILED: Forbidden secrets detected!", report.violations);
    process.exit(1);
  }
}
