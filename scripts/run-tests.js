#!/usr/bin/env node

/**
 * Comprehensive test runner for the eerc20 Batch Auction DEX
 * Runs unit, integration, and stress tests with proper error handling
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_CATEGORIES = [
  { name: 'Contract Unit Tests', command: 'npx hardhat test test/unit/**/*.test.js', required: true },
  { name: 'ZK Utils Tests', command: 'npx hardhat test test/zkutils/**/*.test.js', required: true },
  { name: 'Solver Tests', command: 'npx hardhat test test/solver/**/*.test.js', required: true },
  { name: 'Integration Tests', command: 'npx hardhat test test/integration/**/*.test.js', required: true },
];

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test results tracker
const results = {
  passed: [],
  failed: [],
  skipped: [],
  total: 0,
  startTime: null,
  endTime: null
};

/**
 * Run a command and return its output
 * @param {string} command Command to run
 * @param {string[]} args Command arguments
 * @param {Object} options Spawn options
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { 
      shell: true, 
      stdio: 'pipe',
      ...options 
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      process.stdout.write(str);
    });
    
    proc.stderr.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      process.stderr.write(str);
    });
    
    proc.on('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

/**
 * Run a test category
 * @param {Object} category Test category to run
 * @returns {Promise<boolean>} Whether the test passed
 */
async function runTestCategory(category) {
  console.log(`\n${COLORS.bright}${COLORS.cyan}Running: ${category.name}${COLORS.reset}\n`);
  
  try {
    // Split the command into the executable and args
    const parts = category.command.split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    const { exitCode, stdout } = await runCommand(command, args, { 
      cwd: path.resolve(__dirname, '..') 
    });
    
    // Check test results
    const passedMatch = stdout.match(/(\d+) passing/);
    const failedMatch = stdout.match(/(\d+) failing/);
    const pendingMatch = stdout.match(/(\d+) pending/);
    
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    const pending = pendingMatch ? parseInt(pendingMatch[1], 10) : 0;
    
    results.total += passed + failed + pending;
    
    if (exitCode === 0) {
      console.log(`\n${COLORS.green}✓ ${category.name} tests passed!${COLORS.reset} (${passed} passing, ${pending} pending)\n`);
      results.passed.push({ category: category.name, count: passed });
      return true;
    } else {
      console.log(`\n${COLORS.red}✗ ${category.name} tests failed!${COLORS.reset} (${passed} passing, ${failed} failing, ${pending} pending)\n`);
      results.failed.push({ category: category.name, count: failed });
      return false;
    }
  } catch (err) {
    console.error(`${COLORS.red}Error running ${category.name}:${COLORS.reset}`, err);
    results.failed.push({ category: category.name, error: err.message });
    return false;
  }
}

/**
 * Print final test results
 */
function printResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  
  console.log('\n');
  console.log(`${COLORS.bright}${COLORS.magenta}=== TEST RESULTS SUMMARY ===${COLORS.reset}`);
  console.log(`${COLORS.bright}Duration:${COLORS.reset} ${duration.toFixed(2)}s`);
  console.log(`${COLORS.bright}Total Tests:${COLORS.reset} ${results.total}`);
  
  if (results.passed.length > 0) {
    console.log(`\n${COLORS.green}PASSED CATEGORIES:${COLORS.reset}`);
    results.passed.forEach(item => {
      console.log(`  ${COLORS.green}✓${COLORS.reset} ${item.category} (${item.count} tests)`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\n${COLORS.red}FAILED CATEGORIES:${COLORS.reset}`);
    results.failed.forEach(item => {
      if (item.error) {
        console.log(`  ${COLORS.red}✗${COLORS.reset} ${item.category}: ${item.error}`);
      } else {
        console.log(`  ${COLORS.red}✗${COLORS.reset} ${item.category} (${item.count} tests failed)`);
      }
    });
  }
  
  if (results.skipped.length > 0) {
    console.log(`\n${COLORS.yellow}SKIPPED CATEGORIES:${COLORS.reset}`);
    results.skipped.forEach(item => {
      console.log(`  ${COLORS.yellow}⚠${COLORS.reset} ${item.category}: ${item.reason}`);
    });
  }
  
  console.log('\n');
}

/**
 * Write test results to a file
 */
function writeResultsFile() {
  const duration = (results.endTime - results.startTime) / 1000;
  const timestamp = new Date().toISOString();
  const resultsDir = path.resolve(__dirname, '../test-results');
  
  // Create results directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsFile = path.resolve(resultsDir, `test-run-${timestamp.replace(/[:.]/g, '-')}.json`);
  
  const jsonResults = {
    timestamp,
    duration,
    totalTests: results.total,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped,
    allPassed: results.failed.length === 0 && results.skipped.filter(s => s.required).length === 0
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(jsonResults, null, 2));
  console.log(`Test results saved to: ${resultsFile}`);
}

/**
 * Main function to run all tests
 */
async function main() {
  console.log(`${COLORS.bright}${COLORS.blue}=== eerc20 BATCH AUCTION DEX TESTS ===${COLORS.reset}\n`);
  results.startTime = Date.now();
  
  for (const category of TEST_CATEGORIES) {
    const success = await runTestCategory(category);
    
    // If a required test fails, we might want to stop
    if (!success && category.required) {
      console.log(`\n${COLORS.red}Required test category '${category.name}' failed. This may impact other tests.${COLORS.reset}`);
      
      // For now, continue with other tests, but we could choose to break here
    }
  }
  
  results.endTime = Date.now();
  printResults();
  writeResultsFile();
  
  // Exit with appropriate status code
  const failedRequired = results.failed.some(item => 
    TEST_CATEGORIES.find(cat => cat.name === item.category)?.required
  );
  
  process.exit(failedRequired ? 1 : 0);
}

// Run the script
main().catch(err => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, err);
  process.exit(1);
});
