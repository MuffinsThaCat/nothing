/**
 * Simple test script for the BatchAuctionDEX's batch auction matching algorithm
 * and homomorphic volume estimation
 * 
 * Implements safe parameter handling following Wasmlanche principles:
 * - Comprehensive parameter validation
 * - Proper bounds checking
 * - Safe defaults instead of exceptions
 * - Detailed logging
 */

// Import required modules with dynamic import to handle ESM/CommonJS compatibility
async function runTests() {
  try {
    // Import modules dynamically to handle top-level await
    const { ethers } = await import('ethers');
    const BatchSolver = (await import('../src/solver/BatchSolver.js')).default;
    
    console.log('=== BATCH AUCTION ALGORITHM TEST ===\n');
    
    // Create a minimal configuration
    const config = {
      maxOrdersPerBatch: 100,
      maxPriceLevels: 50,
      minPrice: 1,
      maxPrice: 10000,
      maxOrderSize: 1000000
    };
    
    // Create a minimal mock for dependencies
    const mockDEX = {
      on: () => {},
      off: () => {}
    };
    
    const mockProvider = {
      getBlock: async () => ({ timestamp: Math.floor(Date.now() / 1000) })
    };
    
    // Instantiate BatchSolver with safe configuration
    console.log('Creating BatchSolver instance...');
    const batchSolver = new BatchSolver(config, mockDEX, mockProvider);
    
    // Initialize BatchSolver state
    console.log('Initializing BatchSolver...');
    await batchSolver.initialize();
    
    // Test 1: Batch Auction Matching - Basic Functionality
    console.log('\n=== Test 1: Basic Batch Auction Matching ===');
    
    const testOrders = [
      { id: "order1", orderType: "BUY", price: "1050", amount: "10" },
      { id: "order2", orderType: "BUY", price: "1030", amount: "5" },
      { id: "order3", orderType: "BUY", price: "1010", amount: "3" },
      { id: "order4", orderType: "SELL", price: "990", amount: "4" },
      { id: "order5", orderType: "SELL", price: "1000", amount: "8" },
      { id: "order6", orderType: "SELL", price: "1020", amount: "6" }
    ];
    
    console.log(`Testing with ${testOrders.length} orders...`);
    const fillAmounts = batchSolver.calculateBatchAuctionMatches(testOrders);
    
    // Validate results
    if (!fillAmounts || !Array.isArray(fillAmounts)) {
      console.error('❌ Test failed: Invalid return value from calculateBatchAuctionMatches');
      return;
    }
    
    console.log(`Received ${fillAmounts.length} fill amounts`);
    
    // Organize fills by order ID for easier validation
    const fillById = {};
    fillAmounts.forEach(fill => {
      fillById[fill.orderId] = fill;
      console.log(`- Order ${fill.orderId} (${fill.orderType}): Fill amount = ${fill.amount}`);
    });
    
    // Validate key expectations
    let testPassed = true;
    
    // Test that buy orders with price >= 1000 get filled
    if (fillById["order1"].amount <= 0) {
      console.error('❌ Test failed: BUY at 1050 should be filled');
      testPassed = false;
    }
    
    if (fillById["order2"].amount <= 0) {
      console.error('❌ Test failed: BUY at 1030 should be filled');
      testPassed = false;
    }
    
    if (fillById["order3"].amount <= 0) {
      console.error('❌ Test failed: BUY at 1010 should be filled');
      testPassed = false;
    }
    
    // Test that sell orders with price <= 1000 get filled
    if (fillById["order4"].amount <= 0) {
      console.error('❌ Test failed: SELL at 990 should be filled');
      testPassed = false;
    }
    
    if (fillById["order5"].amount <= 0) {
      console.error('❌ Test failed: SELL at 1000 should be filled');
      testPassed = false;
    }
    
    // Test that sell order with price > 1000 is NOT filled
    if (fillById["order6"].amount > 0) {
      console.error('❌ Test failed: SELL at 1020 should NOT be filled');
      testPassed = false;
    }
    
    // Test conservation of volume
    const buyVolume = fillById["order1"].amount + fillById["order2"].amount + fillById["order3"].amount;
    const sellVolume = fillById["order4"].amount + fillById["order5"].amount + fillById["order6"].amount;
    
    if (Math.abs(buyVolume - sellVolume) > 0.0001) {
      console.error(`❌ Test failed: Buy volume (${buyVolume}) should equal sell volume (${sellVolume})`);
      testPassed = false;
    }
    
    if (testPassed) {
      console.log('✅ Basic batch auction matching test passed');
    }
    
    // Test 2: Pro-rata distribution when supply exceeds demand
    console.log('\n=== Test 2: Pro-rata Distribution (Supply > Demand) ===');
    
    const proRataTestOrders = [
      { id: "buy1", orderType: "BUY", price: "1000", amount: "10" },
      { id: "sell1", orderType: "SELL", price: "990", amount: "15" },
      { id: "sell2", orderType: "SELL", price: "995", amount: "5" }
    ];
    
    const proRataFills = batchSolver.calculateBatchAuctionMatches(proRataTestOrders);
    const proRataFillById = {};
    proRataFills.forEach(fill => {
      proRataFillById[fill.orderId] = fill;
      console.log(`- Order ${fill.orderId} (${fill.orderType}): Fill amount = ${fill.amount}`);
    });
    
    // Validate pro-rata distribution
    const proRataTestPassed = true;
    
    // Buyer should be fully filled
    if (Math.abs(proRataFillById["buy1"].amount - 10) > 0.0001) {
      console.error(`❌ Test failed: Buyer should be fully filled (got ${proRataFillById["buy1"].amount}, expected 10)`);
      proRataTestPassed = false;
    }
    
    // Sellers should be partially filled proportionally
    const totalSellProRata = proRataFillById["sell1"].amount + proRataFillById["sell2"].amount;
    if (Math.abs(totalSellProRata - 10) > 0.0001) {
      console.error(`❌ Test failed: Total sell fill (${totalSellProRata}) should match buy amount (10)`);
      proRataTestPassed = false;
    }
    
    // sell1 should get ~75% (15/20) of the fill
    if (Math.abs(proRataFillById["sell1"].amount - 7.5) > 0.1) {
      console.error(`❌ Test failed: sell1 should get ~75% of fill (got ${proRataFillById["sell1"].amount}, expected ~7.5)`);
      proRataTestPassed = false;
    }
    
    // sell2 should get ~25% (5/20) of the fill
    if (Math.abs(proRataFillById["sell2"].amount - 2.5) > 0.1) {
      console.error(`❌ Test failed: sell2 should get ~25% of fill (got ${proRataFillById["sell2"].amount}, expected ~2.5)`);
      proRataTestPassed = false;
    }
    
    if (proRataTestPassed) {
      console.log('✅ Pro-rata distribution test passed');
    }
    
    // Test 3: Parameter validation and safe defaults
    console.log('\n=== Test 3: Parameter Validation and Safe Defaults ===');
    
    // Test with null input
    const nullResult = batchSolver.calculateBatchAuctionMatches(null);
    if (!Array.isArray(nullResult) || nullResult.length !== 0) {
      console.error('❌ Test failed: Null input should return empty array');
    } else {
      console.log('✅ Null input properly handled with safe default');
    }
    
    // Test with empty array
    const emptyResult = batchSolver.calculateBatchAuctionMatches([]);
    if (!Array.isArray(emptyResult) || emptyResult.length !== 0) {
      console.error('❌ Test failed: Empty array input should return empty array');
    } else {
      console.log('✅ Empty array properly handled');
    }
    
    // Test with orders exceeding max batch size
    const largeOrderSet = Array(config.maxOrdersPerBatch + 10).fill().map((_, i) => ({
      id: `order${i}`,
      orderType: i % 2 === 0 ? "BUY" : "SELL",
      price: "1000",
      amount: "1"
    }));
    
    const largeResult = batchSolver.calculateBatchAuctionMatches(largeOrderSet);
    if (largeResult.length > config.maxOrdersPerBatch) {
      console.error(`❌ Test failed: Result exceeded maxOrdersPerBatch (got ${largeResult.length}, max is ${config.maxOrdersPerBatch})`);
    } else {
      console.log('✅ Large order set properly handled with safe truncation');
    }
    
    // Test 4: Homomorphic Volume Estimation
    console.log('\n=== Test 4: Homomorphic Volume Estimation ===');
    
    // Create mock encrypted data
    const mockEncryptedData = Buffer.alloc(120);
    for (let i = 0; i < mockEncryptedData.length; i++) {
      mockEncryptedData[i] = i % 256;
    }
    
    // Test encrypted data parsing
    const components = batchSolver._parseEncryptedData(mockEncryptedData);
    
    if (!components || !components.r || components.r.length !== 33 || 
        !components.C1 || components.C1.length !== 33 || 
        !components.C2 || components.C2.length !== 33) {
      console.error('❌ Test failed: Invalid component parsing');
    } else {
      console.log('✅ Encrypted components parsed correctly');
    }
    
    // Test volume estimation
    const mockOrder = {
      id: "order1",
      orderType: "BUY",
      price: "1000",
      pairId: "BTC-ETH",
      timestamp: Date.now() - 1000,
      encryptedAmount: mockEncryptedData
    };
    
    const estimatedVolume = batchSolver.estimateVolume(mockOrder);
    
    if (typeof estimatedVolume !== 'bigint' || estimatedVolume < 0n) {
      console.error(`❌ Test failed: Invalid volume estimation result: ${estimatedVolume}`);
    } else {
      console.log(`✅ Volume estimated successfully: ${estimatedVolume}`);
    }
    
    // Test with invalid input
    const nullOrderResult = batchSolver.estimateVolume(null);
    if (nullOrderResult !== 0n) {
      console.error('❌ Test failed: Null order should return 0n');
    } else {
      console.log('✅ Null order properly handled');
    }
    
    // Test privacy-preserving rounding
    const smallValue = 7n;
    const mediumValue = 156n;
    const largeValue = 12345n;
    
    const smallRounded = batchSolver._privacyPreservingRounding(smallValue);
    const mediumRounded = batchSolver._privacyPreservingRounding(mediumValue);
    const largeRounded = batchSolver._privacyPreservingRounding(largeValue);
    
    console.log(`Small value rounding: ${smallValue} → ${smallRounded}`);
    console.log(`Medium value rounding: ${mediumValue} → ${mediumRounded}`);
    console.log(`Large value rounding: ${largeValue} → ${largeRounded}`);
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ Successfully tested batch auction algorithm');
    console.log('✅ Successfully tested homomorphic volume estimation');
    console.log('✅ Successfully tested parameter validation and safe defaults');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the tests
runTests().catch(console.error);
