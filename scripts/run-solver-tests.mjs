/**
 * Direct test runner for BatchSolver using ES Modules
 * 
 * This script provides a focused test suite for the BatchSolver and homomorphic
 * volume estimation components, bypassing module compatibility issues in the main test suite.
 * 
 * Following Wasmlanche safe parameter handling principles:
 * - Comprehensive parameter validation
 * - Proper bounds checking
 * - Safe defaults instead of exceptions
 * - Detailed logging for debugging
 */

import { ethers } from 'ethers';
import assert from 'assert';
import chalk from 'chalk';

// Import the ESM version of BatchSolver
import BatchSolver from '../src/solver/BatchSolver.mjs';

// Test statistics tracking
const stats = {
  passed: 0,
  failed: 0,
  total: 0
};

// Test utility functions
function describe(name, testFn) {
  console.log(chalk.blue.bold(`\n🔍 ${name}`));
  testFn();
}

async function it(name, testFn) {
  stats.total++;
  try {
    await testFn();
    console.log(chalk.green(`✅ ${name}`));
    stats.passed++;
  } catch (error) {
    console.log(chalk.red(`❌ ${name}`));
    console.error(chalk.red(`   Error: ${error.message}`));
    stats.failed++;
  }
}

function createMocks() {
  // Create mock DEX contract
  const mockDEX = {
    events: {},
    on(event, callback) {
      this.events[event] = this.events[event] || [];
      this.events[event].push(callback);
    },
    off(event, callback) {
      if (this.events[event]) {
        this.events[event] = this.events[event].filter(cb => cb !== callback);
      }
    },
    settleBatch() {
      return Promise.resolve();
    },
    getBatchInfo() {
      return { status: 1, deadline: Math.floor(Date.now() / 1000) + 600 };
    }
  };
  
  // Create mock provider
  const mockProvider = {
    calls: [],
    getBlock() {
      this.calls.push('getBlock');
      return Promise.resolve({ timestamp: Math.floor(Date.now() / 1000) });
    }
  };
  
  return { mockDEX, mockProvider };
}

function createConfig() {
  return {
    maxOrdersPerBatch: 100,
    maxPriceLevels: 50,
    minLiquidity: 1000,
    maxSlippage: 5,
    batchDuration: 600
  };
}

// Create mock order for testing
function createMockOrder(id, orderType, price, amount) {
  return {
    id,
    orderType,
    price: String(price),
    amount: String(amount)
  };
}

// Create mock encrypted data for homomorphic volume estimation tests
function createMockEncryptedData() {
  const data = Buffer.alloc(120);
  for (let i = 0; i < data.length; i++) {
    data[i] = i % 256;
  }
  return data;
}

// Run tests
async function runTests() {
  console.log(chalk.yellow.bold('=== EERC20 BATCH DEX SOLVER TESTS ==='));
  
  const { mockDEX, mockProvider } = createMocks();
  const config = createConfig();
  
  describe('BatchSolver Initialization', async () => {
    await it('should create a BatchSolver instance', async () => {
      const batchSolver = new BatchSolver(config, mockDEX, mockProvider);
      assert(batchSolver instanceof BatchSolver, 'Not a BatchSolver instance');
      
      await batchSolver.initialize();
      assert(batchSolver.batchState, 'Batch state not initialized');
      assert(Array.isArray(batchSolver.batchState.orders), 'Orders array not initialized');
    });
    
    await it('should handle parameter validation', async () => {
      // Test with null configuration
      const batchSolver = new BatchSolver(null, mockDEX, mockProvider);
      await batchSolver.initialize();
      
      // Should still work with default values
      assert(batchSolver.config, 'Config should have defaults when null is provided');
      assert(batchSolver.batchState, 'Batch state should be initialized despite null config');
    });
  });
  
  describe('Batch Auction Matching Algorithm', async () => {
    const batchSolver = new BatchSolver(config, mockDEX, mockProvider);
    await batchSolver.initialize();
    
    await it('should find correct clearing price for basic scenario', async () => {
      const buyOrders = [
        createMockOrder('buy1', 'BUY', 1050, 5),
        createMockOrder('buy2', 'BUY', 1030, 3),
        createMockOrder('buy3', 'BUY', 1010, 4)
      ];
      
      const sellOrders = [
        createMockOrder('sell1', 'SELL', 990, 4),
        createMockOrder('sell2', 'SELL', 1000, 6),
        createMockOrder('sell3', 'SELL', 1020, 2)
      ];
      
      const clearingPrice = batchSolver.findClearingPrice(buyOrders, sellOrders);
      // According to our matching rules, should be at or near 1010 
      assert(clearingPrice >= 1000 && clearingPrice <= 1020, 
             `Clearing price ${clearingPrice} should be between 1000 and 1020`);
    });
    
    await it('should allocate fills according to pro-rata distribution', async () => {
      // Scenario with more sell orders than buy orders
      const orders = [
        createMockOrder('buy1', 'BUY', 1000, 10),
        createMockOrder('sell1', 'SELL', 990, 15),
        createMockOrder('sell2', 'SELL', 995, 5)
      ];
      
      const fills = batchSolver.calculateBatchAuctionMatches(orders);
      
      // Find fill for each order
      const buyFill = fills.find(f => f.orderId === 'buy1');
      const sell1Fill = fills.find(f => f.orderId === 'sell1');
      const sell2Fill = fills.find(f => f.orderId === 'sell2');
      
      // Buyer should be fully filled
      assert(Math.abs(Number(buyFill.amount) - 10) < 0.01, 'Buy order should be fully filled');
      
      // Total sell fills should equal buy fill
      const totalSellFill = Number(sell1Fill.amount) + Number(sell2Fill.amount);
      assert(Math.abs(totalSellFill - 10) < 0.01, 'Total sell fills should equal buy fill');
      
      // sell1 should get ~75% (15/20) of the fill
      assert(Math.abs(Number(sell1Fill.amount) - 7.5) < 0.1, 'sell1 should get ~75% of fill');
      
      // sell2 should get ~25% (5/20) of the fill
      assert(Math.abs(Number(sell2Fill.amount) - 2.5) < 0.1, 'sell2 should get ~25% of fill');
    });
    
    await it('should handle invalid inputs safely', async () => {
      // Test with null orders
      const nullResult = batchSolver.calculateBatchAuctionMatches(null);
      assert(Array.isArray(nullResult) && nullResult.length === 0, 'Null input should return empty array');
      
      // Test with empty array
      const emptyResult = batchSolver.calculateBatchAuctionMatches([]);
      assert(Array.isArray(emptyResult) && emptyResult.length === 0, 'Empty array input should return empty array');
      
      // Test with orders exceeding max batch size
      const largeOrderSet = Array(config.maxOrdersPerBatch + 10).fill().map((_, i) => 
        createMockOrder(`order${i}`, i % 2 === 0 ? 'BUY' : 'SELL', 1000, 1)
      );
      
      const largeResult = batchSolver.calculateBatchAuctionMatches(largeOrderSet);
      assert(largeResult.length <= largeOrderSet.length, 
             'Should properly handle oversized order input');
    });
  });
  
  describe('Homomorphic Volume Estimation', async () => {
    const batchSolver = new BatchSolver(config, mockDEX, mockProvider);
    await batchSolver.initialize();
    
    await it('should estimate volumes from encrypted data', async () => {
      const mockOrder = {
        id: "order1",
        orderType: "BUY",
        price: "1000",
        pairId: "BTC-ETH",
        timestamp: Date.now() - 1000,
        encryptedAmount: createMockEncryptedData()
      };
      
      const estimatedVolume = batchSolver.estimateVolume(mockOrder);
      assert(typeof estimatedVolume === 'bigint', 'Estimated volume should be a bigint');
    });
    
    await it('should handle invalid inputs safely', async () => {
      // Test with null order
      const nullResult = batchSolver.estimateVolume(null);
      assert(nullResult === 0n, 'Null order should return 0n');
      
      // Test with missing encrypted amount
      const invalidOrder = {
        id: "order1",
        orderType: "BUY",
        price: "1000",
        pairId: "BTC-ETH"
      };
      
      const invalidResult = batchSolver.estimateVolume(invalidOrder);
      assert(invalidResult === 0n, 'Invalid order should return 0n');
    });
    
    await it('should perform privacy-preserving rounding', async () => {
      const smallValue = 7n;
      const mediumValue = 156n;
      const largeValue = 12345n;
      
      const smallRounded = batchSolver._privacyPreservingRounding(smallValue);
      const mediumRounded = batchSolver._privacyPreservingRounding(mediumValue);
      const largeRounded = batchSolver._privacyPreservingRounding(largeValue);
      
      // Verify each magnitude falls into the right bucket
      assert(smallRounded >= 1n && smallRounded <= 10n, 
             'Small value should be rounded to appropriate magnitude');
             
      assert(mediumRounded >= 100n && mediumRounded <= 1000n, 
             'Medium value should be rounded to appropriate magnitude');
             
      assert(largeRounded >= 10000n && largeRounded <= 100000n, 
             'Large value should be rounded to appropriate magnitude');
    });
  });
  
  // Print test summary
  console.log(chalk.yellow.bold('\n=== TEST SUMMARY ==='));
  console.log(`Total tests: ${stats.total}`);
  console.log(chalk.green(`Passed: ${stats.passed}`));
  if (stats.failed > 0) {
    console.log(chalk.red(`Failed: ${stats.failed}`));
    process.exit(1);
  } else {
    console.log(chalk.green.bold('All tests passed! ✨'));
  }
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red('Test run failed with error:'), error);
  process.exit(1);
});
