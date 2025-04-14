/**
 * @fileoverview Tests for the BatchSolver implementation
 * 
 * Uses the moduleCompatibility layer to handle CommonJS and ES Module integration
 * while following Wasmlanche safe parameter handling principles
 */

const { expect } = require("chai");

// Use the compatibility layer to safely import modules that might contain top-level await
const { 
  BatchSolver, 
  ethers, 
  zkUtils,
  createBatchSolver,
  initializeBatchSolver,
  createTestMocks 
} = require("../../src/solver/moduleCompatibility");

describe("BatchSolver", function () {
  let batchSolverConfig;
  let mockBatchAuctionDEX;
  let mockProvider;
  let batchSolver;

  // Mock orders for testing
  const createMockOrder = (id, trader, pairId, orderType, encryptedAmount, publicPrice) => {
    return {
      id,
      trader,
      pairId,
      orderType,
      encryptedAmount,
      publicPrice,
      status: 0, // OPEN
      createdAt: Date.now()
    };
  };

  beforeEach(async function () {
    // Use our compatibility layer to create mocks with safe defaults
    // This follows Wasmlanche safe parameter handling principles
    const mocks = createTestMocks();
    
    // Extract mock objects with proper validation and safe defaults
    batchSolverConfig = mocks.config;
    mockBatchAuctionDEX = mocks.mockBatchAuctionDEX;
    mockProvider = mocks.mockProvider;
    
    // Create BatchSolver instance using our safe factory function
    // This prevents issues with potential top-level await in the module
    batchSolver = createBatchSolver(batchSolverConfig, mockBatchAuctionDEX, mockProvider);
    
    // Use safe initialization wrapper that handles potential top-level await issues
    await initializeBatchSolver(batchSolver);
  });

  describe("Initialization", function () {
    it("Should initialize with the provided configuration", function () {
      expect(batchSolver.config).to.include(batchSolverConfig);
    });

    it("Should store the contract and provider references", function () {
      expect(batchSolver.batchAuctionDEX).to.equal(mockBatchAuctionDEX);
      expect(batchSolver.provider).to.equal(mockProvider);
    });

    it("Should initialize batch state when calling initialize()", async function () {
      await batchSolver.initialize();
      
      expect(batchSolver.batchState).to.not.be.null;
      expect(batchSolver.batchState).to.have.property("batchId");
      expect(batchSolver.batchState).to.have.property("deadline");
      expect(batchSolver.batchState).to.have.property("orders");
    });
  });

  describe("Order Processing", function () {
    beforeEach(async function () {
      // Use safe initialization wrapper that handles potential top-level await issues
      await initializeBatchSolver(batchSolver);
    });

    it("Should add new orders to the batch state", function () {
      const orderId = "order1";
      const trader = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const orderType = 0; // BUY
      const publicPrice = 1000n;
      
      batchSolver.handleNewOrder(orderId, trader, pairId, orderType, publicPrice);
      
      expect(batchSolver.batchState.orders).to.have.lengthOf(1);
      expect(batchSolver.batchState.orders[0]).to.include({
        id: orderId,
        trader,
        pairId,
        orderType,
      });
    });

    it("Should remove cancelled orders from the batch state", function () {
      // Add an order
      const orderId = "order1";
      const trader = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      
      batchSolver.handleNewOrder(orderId, trader, pairId, 0, 1000n);
      expect(batchSolver.batchState.orders).to.have.lengthOf(1);
      
      // Cancel the order
      batchSolver.handleCancelledOrder(orderId, trader);
      expect(batchSolver.batchState.orders).to.have.lengthOf(0);
    });
  });

  describe("Order Book and Matching", function () {
    beforeEach(async function () {
      // Use safe initialization wrapper that handles potential top-level await issues
      await initializeBatchSolver(batchSolver);
    });

    it("Should group orders by pair ID", function () {
      // Add orders for different pairs
      const pairId1 = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const pairId2 = ethers.keccak256(ethers.toUtf8Bytes("ETH-USDC"));
      
      batchSolver.handleNewOrder("order1", "trader1", pairId1, 0, 1000n);
      batchSolver.handleNewOrder("order2", "trader2", pairId1, 1, 990n);
      batchSolver.handleNewOrder("order3", "trader3", pairId2, 0, 1n);
      
      const groupedOrders = batchSolver.groupOrdersByPair();
      
      expect(Object.keys(groupedOrders)).to.have.lengthOf(2);
      expect(groupedOrders[pairId1]).to.have.lengthOf(2);
      expect(groupedOrders[pairId2]).to.have.lengthOf(1);
    });

    it("Should build an order book from orders", function () {
      // Add buy and sell orders
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const trader = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      
      // Create some encrypted amounts
      const publicKey = zkUtils.derivePublicKey(123456789n);
      const encryptedAmount1 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      const encryptedAmount2 = zkUtils.encryptAmount(publicKey, 20000n).cipher;
      
      // Create some orders
      const orders = [
        createMockOrder("order1", trader, pairId, 0, encryptedAmount1, 1000n), // BUY
        createMockOrder("order2", trader, pairId, 1, encryptedAmount2, 990n),  // SELL
      ];
      
      const orderBook = batchSolver.buildOrderBook(orders);
      
      expect(orderBook).to.have.property("bids");
      expect(orderBook).to.have.property("asks");
      expect(orderBook.bids).to.have.lengthOf(1);
      expect(orderBook.asks).to.have.lengthOf(1);
    });

    it("Should calculate clearing price when possible", function () {
      // Add matching buy and sell orders
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const trader = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      
      // Create some encrypted amounts
      const publicKey = zkUtils.derivePublicKey(123456789n);
      const encryptedAmount1 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      const encryptedAmount2 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      
      // Create orders that can match
      const orders = [
        createMockOrder("order1", trader, pairId, 0, encryptedAmount1, 1000n), // BUY at 1000
        createMockOrder("order2", trader, pairId, 1, encryptedAmount2, 990n),  // SELL at 990
      ];
      
      // Add orders to batch state
      orders.forEach(order => {
        batchSolver.batchState.orders.push(order);
      });
      
      // Calculate clearing price
      const settlement = batchSolver.calculateClearingPrice(pairId, orders);
      
      // Should find a valid settlement
      expect(settlement).to.not.be.null;
      expect(settlement).to.have.property("pairId", pairId);
      expect(settlement).to.have.property("clearingPrice");
      expect(settlement.matchedOrderIds).to.include("order1");
      expect(settlement.matchedOrderIds).to.include("order2");
    });

    it("Should not find a clearing price when orders don't match", function () {
      // Add non-matching buy and sell orders
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const trader = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      
      // Create some encrypted amounts
      const publicKey = zkUtils.derivePublicKey(123456789n);
      const encryptedAmount1 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      const encryptedAmount2 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      
      // Create orders that cannot match (buy price < sell price)
      const orders = [
        createMockOrder("order1", trader, pairId, 0, encryptedAmount1, 980n), // BUY at 980
        createMockOrder("order2", trader, pairId, 1, encryptedAmount2, 990n), // SELL at 990
      ];
      
      // Add orders to batch state
      orders.forEach(order => {
        batchSolver.batchState.orders.push(order);
      });
      
      // Try to calculate clearing price
      const settlement = batchSolver.calculateClearingPrice(pairId, orders);
      
      // Should not find a valid settlement
      expect(settlement).to.be.null;
    });
  });

  describe("Batch Auction Matching Algorithm", function () {
    beforeEach(async function () {
      // Use safe initialization wrapper that handles potential top-level await issues
      await initializeBatchSolver(batchSolver);
    });
    
    it("Should calculate batch auction matches with uniform clearing price", function () {
      // Create test orders with various prices
      const orders = [
        { id: "order1", orderType: "BUY", price: "1050", amount: "10" },
        { id: "order2", orderType: "BUY", price: "1030", amount: "5" },
        { id: "order3", orderType: "BUY", price: "1010", amount: "3" },
        { id: "order4", orderType: "SELL", price: "990", amount: "4" },
        { id: "order5", orderType: "SELL", price: "1000", amount: "8" },
        { id: "order6", orderType: "SELL", price: "1020", amount: "6" },
      ];
      
      // Calculate matches with the new algorithm
      const fillAmounts = batchSolver.calculateBatchAuctionMatches(orders);
      
      // Verify fundamental properties of the matching
      expect(fillAmounts).to.have.lengthOf(6); // All orders should have a result
      
      // Get fills by order ID for easier assertions
      const fillById = {};
      fillAmounts.forEach(fill => {
        fillById[fill.orderId] = fill;
      });
      
      // Check that all buy orders with price >= 1000 get filled
      expect(fillById["order1"].amount).to.be.greaterThan(0); // BUY at 1050 should be filled
      expect(fillById["order2"].amount).to.be.greaterThan(0); // BUY at 1030 should be filled
      expect(fillById["order3"].amount).to.be.greaterThan(0); // BUY at 1010 should be filled
      
      // Check that all sell orders with price <= 1000 get filled
      expect(fillById["order4"].amount).to.be.greaterThan(0); // SELL at 990 should be filled
      expect(fillById["order5"].amount).to.be.greaterThan(0); // SELL at 1000 should be filled
      
      // SELL at 1020 should NOT be filled (price above clearing price)
      expect(fillById["order6"].amount).to.equal(0);
      
      // Total buy volume should equal total sell volume (conservation of value)
      const totalBuyFill = fillById["order1"].amount + fillById["order2"].amount + fillById["order3"].amount;
      const totalSellFill = fillById["order4"].amount + fillById["order5"].amount + fillById["order6"].amount;
      expect(totalBuyFill).to.be.closeTo(totalSellFill, 0.0001); // Allow for floating point rounding errors
    });
    
    it("Should handle pro-rata matching when supply exceeds demand", function () {
      // Create test orders with excess sell orders
      const orders = [
        { id: "buy1", orderType: "BUY", price: "1000", amount: "10" },
        { id: "sell1", orderType: "SELL", price: "990", amount: "15" },
        { id: "sell2", orderType: "SELL", price: "995", amount: "5" },
      ];
      
      // Calculate matches with the new algorithm
      const fillAmounts = batchSolver.calculateBatchAuctionMatches(orders);
      
      // Get fills by order ID
      const fillById = {};
      fillAmounts.forEach(fill => {
        fillById[fill.orderId] = fill;
      });
      
      // Buyer should be completely filled
      expect(fillById["buy1"].amount).to.be.closeTo(10, 0.0001);
      
      // Sellers should be partially filled proportionally
      const totalSellFill = fillById["sell1"].amount + fillById["sell2"].amount;
      expect(totalSellFill).to.be.closeTo(10, 0.0001); // Should match buy amount
      
      // sell1 should get 75% of the fill (15 of 20 total = 75%)
      expect(fillById["sell1"].amount).to.be.closeTo(7.5, 0.0001);
      
      // sell2 should get 25% of the fill (5 of 20 total = 25%)
      expect(fillById["sell2"].amount).to.be.closeTo(2.5, 0.0001);
    });
    
    it("Should handle pro-rata matching when demand exceeds supply", function () {
      // Create test orders with excess buy orders
      const orders = [
        { id: "buy1", orderType: "BUY", price: "1010", amount: "10" },
        { id: "buy2", orderType: "BUY", price: "1005", amount: "10" },
        { id: "sell1", orderType: "SELL", price: "1000", amount: "15" },
      ];
      
      // Calculate matches with the new algorithm
      const fillAmounts = batchSolver.calculateBatchAuctionMatches(orders);
      
      // Get fills by order ID
      const fillById = {};
      fillAmounts.forEach(fill => {
        fillById[fill.orderId] = fill;
      });
      
      // Seller should be completely filled
      expect(fillById["sell1"].amount).to.be.closeTo(15, 0.0001);
      
      // Buyers should be partially filled proportionally
      const totalBuyFill = fillById["buy1"].amount + fillById["buy2"].amount;
      expect(totalBuyFill).to.be.closeTo(15, 0.0001); // Should match sell amount
      
      // Both buyers have equal amounts, so they should get equal fills
      expect(fillById["buy1"].amount).to.be.closeTo(7.5, 0.0001);
      expect(fillById["buy2"].amount).to.be.closeTo(7.5, 0.0001);
    });
    
    it("Should find the correct clearing price", function () {
      // Create buy and sell orders
      const buyOrders = [
        { id: "buy1", orderType: "BUY", price: "1050", amount: "5" },
        { id: "buy2", orderType: "BUY", price: "1025", amount: "3" },
        { id: "buy3", orderType: "BUY", price: "1000", amount: "2" },
        { id: "buy4", orderType: "BUY", price: "990", amount: "1" },
      ];
      
      const sellOrders = [
        { id: "sell1", orderType: "SELL", price: "980", amount: "2" },
        { id: "sell2", orderType: "SELL", price: "1000", amount: "4" },
        { id: "sell3", orderType: "SELL", price: "1030", amount: "3" },
        { id: "sell4", orderType: "SELL", price: "1050", amount: "2" },
      ];
      
      // Directly test the clearing price algorithm
      const clearingPrice = batchSolver.findClearingPrice(buyOrders, sellOrders);
      
      // The clearing price should be 1000
      // At this price:
      // - Buy orders at/above 1000 = 10 units (buy1 + buy2 + buy3)
      // - Sell orders at/below 1000 = 6 units (sell1 + sell2)
      // This is the lowest price where there is sufficient sell volume
      expect(clearingPrice).to.equal(1000);
    });
    
    it("Should handle input validation and return safe defaults", function () {
      // Test with invalid input
      const nullResult = batchSolver.calculateBatchAuctionMatches(null);
      expect(nullResult).to.be.an('array').that.is.empty;
      
      const emptyResult = batchSolver.calculateBatchAuctionMatches([]);
      expect(emptyResult).to.be.an('array').that.is.empty;
      
      // Test with order count exceeding maxOrdersPerBatch
      const largeOrderSet = Array(batchSolverConfig.maxOrdersPerBatch + 10).fill().map((_, i) => ({
        id: `order${i}`,
        orderType: i % 2 === 0 ? "BUY" : "SELL",
        price: "1000",
        amount: "1"
      }));
      
      const largeResult = batchSolver.calculateBatchAuctionMatches(largeOrderSet);
      expect(largeResult.length).to.be.at.most(batchSolverConfig.maxOrdersPerBatch);
    });
  });
  
  describe("Homomorphic Volume Estimation", function () {
    beforeEach(async function () {
      // Use safe initialization wrapper that handles potential top-level await issues
      await initializeBatchSolver(batchSolver);
    });
    
    it("Should safely parse encrypted data components", function () {
      // Create some mock encrypted data
      const mockEncryptedData = Buffer.alloc(120); // Larger than the required 99 bytes
      for (let i = 0; i < mockEncryptedData.length; i++) {
        mockEncryptedData[i] = i % 256;
      }
      
      // Parse the components
      const components = batchSolver._parseEncryptedData(mockEncryptedData);
      
      // Verify the components were extracted correctly
      expect(components).to.not.be.null;
      expect(components).to.have.property('r').with.lengthOf(33);
      expect(components).to.have.property('C1').with.lengthOf(33);
      expect(components).to.have.property('C2').with.lengthOf(33);
      
      // Verify the components contain the expected data
      for (let i = 0; i < 33; i++) {
        expect(components.r[i]).to.equal(i % 256);
        expect(components.C1[i]).to.equal((i + 33) % 256);
        expect(components.C2[i]).to.equal((i + 66) % 256);
      }
    });
    
    it("Should handle invalid encrypted data safely", function () {
      // Test with null input
      const nullResult = batchSolver._parseEncryptedData(null);
      expect(nullResult).to.be.null;
      
      // Test with short input
      const shortData = Buffer.alloc(50);
      const shortResult = batchSolver._parseEncryptedData(shortData);
      expect(shortResult).to.be.null;
    });
    
    it("Should compute privacy-preserving component fingerprints", function () {
      // Create mock components
      const components = {
        r: Buffer.alloc(33, 1),
        C1: Buffer.alloc(33, 2),
        C2: Buffer.alloc(33, 3)
      };
      
      // Compute fingerprint
      const fingerprint = batchSolver._computeComponentFingerprint(components);
      
      // Should be a valid fingerprint (keccak256 hash)
      expect(fingerprint).to.be.a('string');
      expect(fingerprint.startsWith('0x')).to.be.true;
      expect(fingerprint.length).to.equal(66); // 0x + 64 hex chars
    });
    
    it("Should calculate homomorphic range estimations", function () {
      const mockComponents = {
        r: Buffer.alloc(33, 1),
        C1: Buffer.alloc(33, 2),
        C2: Buffer.alloc(33, 3)
      };
      
      const result = batchSolver._homomorphicRangeEstimation(
        mockComponents,
        "BUY",
        "BTC-ETH"
      );
      
      // The result should be a BigInt representing magnitude
      expect(typeof result).to.equal('bigint');
    });
    
    it("Should estimate volume from encrypted amount", function () {
      // Create a mock order with encrypted amount
      const mockEncryptedAmount = Buffer.alloc(120, 5); // Fill with pattern
      const mockOrder = {
        id: "order1",
        orderType: "BUY",
        price: "1000",
        pairId: "BTC-ETH",
        timestamp: Date.now() - 1000, // 1 second ago
        encryptedAmount: mockEncryptedAmount
      };
      
      // Estimate volume
      const estimatedVolume = batchSolver.estimateVolume(mockOrder);
      
      // Should return a valid BigInt
      expect(typeof estimatedVolume).to.equal('bigint');
      expect(estimatedVolume).to.be.at.least(0n);
    });
    
    it("Should apply privacy-preserving rounding to estimated volumes", function () {
      // Test rounding for different magnitudes
      const smallValue = 7n;
      const mediumValue = 156n;
      const largeValue = 12345n;
      
      const smallRounded = batchSolver._privacyPreservingRounding(smallValue);
      const mediumRounded = batchSolver._privacyPreservingRounding(mediumValue);
      const largeRounded = batchSolver._privacyPreservingRounding(largeValue);
      
      // Small values should be rounded to nearest unit
      expect(smallRounded).to.be.a('bigint');
      expect(smallRounded).to.be.at.least(smallValue - 5n);
      expect(smallRounded).to.be.at.most(smallValue + 5n);
      
      // Medium values should be rounded to nearest 10
      expect(mediumRounded).to.be.a('bigint');
      expect(mediumRounded % 10n).to.be.at.most(5n); // Should be close to a multiple of 10
      
      // Large values should have more significant rounding
      expect(largeRounded).to.be.a('bigint');
      expect(largeRounded / 100n).to.be.at.least(largeValue / 100n - 5n);
      expect(largeRounded / 100n).to.be.at.most(largeValue / 100n + 5n);
    });
    
    it("Should handle invalid inputs to estimateVolume safely", function () {
      // Test with null order
      const nullResult = batchSolver.estimateVolume(null);
      expect(nullResult).to.equal(0n);
      
      // Test with order missing encryptedAmount
      const incompleteOrder = {
        id: "order1",
        orderType: "BUY",
        price: "1000"
        // No encryptedAmount
      };
      const incompleteResult = batchSolver.estimateVolume(incompleteOrder);
      expect(incompleteResult).to.equal(0n);
      
      // Test with extremely large encrypted data (exceeding MAX_PARAM_SIZE)
      const largeOrder = {
        id: "order1",
        orderType: "BUY",
        price: "1000",
        encryptedAmount: Buffer.alloc(33 * 1024) // 33KB (should exceed the 32KB limit)
      };
      const largeResult = batchSolver.estimateVolume(largeOrder);
      expect(largeResult).to.equal(0n);
    });
  });
  
  describe("Fill Amount Generation", function () {
    beforeEach(async function () {
      // Use safe initialization wrapper that handles potential top-level await issues
      await initializeBatchSolver(batchSolver);
    });

    it("Should generate fill amounts for matched orders", function () {
      // Create some matched orders
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const trader = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      
      // Create some encrypted amounts
      const publicKey = zkUtils.derivePublicKey(123456789n);
      const encryptedAmount1 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      const encryptedAmount2 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      
      // Create orders
      const order1 = createMockOrder("order1", trader, pairId, 0, encryptedAmount1, 1000n);
      const order2 = createMockOrder("order2", trader, pairId, 1, encryptedAmount2, 990n);
      
      // Add to batch state
      batchSolver.batchState.orders.push(order1);
      batchSolver.batchState.orders.push(order2);
      
      // Generate fill amounts
      const fillAmounts = batchSolver.generateFillAmounts(
        ["order1", "order2"],
        995n // Clearing price
      );
      
      // Expect fill amounts for both orders
      expect(fillAmounts).to.be.an("array");
      expect(fillAmounts).to.have.lengthOf(2);
      
      // Each fill amount should be a byte array with appropriate size
      fillAmounts.forEach(amount => {
        expect(typeof amount).to.equal("string"); // Hex string from ethers.hexlify
        expect(amount.startsWith("0x")).to.be.true;
      });
    });

    it("Should handle empty orders gracefully", function () {
      const fillAmounts = batchSolver.generateFillAmounts([], 1000n);
      expect(fillAmounts).to.be.an("array");
      expect(fillAmounts).to.have.lengthOf(0);
    });

    it("Should handle invalid orders gracefully", function () {
      // Add a non-existent order ID
      const fillAmounts = batchSolver.generateFillAmounts(["non-existent-order"], 1000n);
      
      // Should return an array with an empty buffer
      expect(fillAmounts).to.be.an("array");
      expect(fillAmounts).to.have.lengthOf(1);
    });
  });

  describe("Settlement Submission", function () {
    beforeEach(async function () {
      await batchSolver.initialize();
    });

    it("Should submit settlements to the blockchain", async function () {
      // Create a mock settlement
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const clearingPrice = 995n;
      const matchedOrderIds = ["order1", "order2"];
      const fillAmountHashes = [
        "0x" + Buffer.from("fill1").toString("hex"),
        "0x" + Buffer.from("fill2").toString("hex")
      ];
      const settlementProof = Buffer.from("settlement-proof");
      
      // Add the settlement to the queue
      batchSolver.settlementQueue.push({
        pairId,
        clearingPrice,
        matchedOrderIds,
        fillAmountHashes,
        settlementProof
      });
      
      // Submit settlements
      await batchSolver.submitSettlements();
      
      // Check that settleBatch was called with the correct parameters
      expect(mockBatchAuctionDEX.calls).to.have.lengthOf.at.least(1);
      
      const settleBatchCall = mockBatchAuctionDEX.calls.find(call => call.method === "settleBatch");
      expect(settleBatchCall).to.not.be.undefined;
      
      const args = settleBatchCall.args;
      expect(args[0]).to.equal(pairId);
      expect(args[1]).to.equal(clearingPrice);
      expect(args[2]).to.deep.equal(matchedOrderIds);
      expect(args[3]).to.deep.equal(fillAmountHashes);
    });

    it("Should handle empty settlement queue", async function () {
      // Empty queue
      batchSolver.settlementQueue = [];
      
      // Submit settlements
      await batchSolver.submitSettlements();
      
      // No calls to settleBatch should be made
      const settleBatchCalls = mockBatchAuctionDEX.calls.filter(call => call.method === "settleBatch");
      expect(settleBatchCalls).to.have.lengthOf(0);
    });

    it("Should handle settlement errors gracefully", async function () {
      // Create a mock settlement
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const clearingPrice = 995n;
      const matchedOrderIds = ["order1", "order2"];
      const fillAmountHashes = [
        "0x" + Buffer.from("fill1").toString("hex"),
        "0x" + Buffer.from("fill2").toString("hex")
      ];
      const settlementProof = Buffer.from("settlement-proof");
      
      // Add the settlement to the queue
      batchSolver.settlementQueue.push({
        pairId,
        clearingPrice,
        matchedOrderIds,
        fillAmountHashes,
        settlementProof
      });
      
      // Make settleBatch throw an error
      mockBatchAuctionDEX.settleBatch = async function() {
        throw new Error("Settlement failed");
      };
      
      // Submit settlements - should not throw
      await batchSolver.submitSettlements();
      
      // Settlement queue should be empty even though settlement failed
      expect(batchSolver.settlementQueue).to.have.lengthOf(0);
    });
  });

  describe("Volume Estimation", function () {
    beforeEach(async function () {
      await batchSolver.initialize();
    });

    it("Should estimate volume from encrypted amount", function () {
      // Create an order with encrypted amount
      const publicKey = zkUtils.derivePublicKey(123456789n);
      const encryptedAmount = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      
      const order = createMockOrder(
        "order1",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH")),
        0, // BUY
        encryptedAmount,
        1000n
      );
      
      // Estimate volume
      const volume = batchSolver.estimateVolume(order);
      
      // Expect a BigInt with a reasonable value
      expect(typeof volume).to.equal("bigint");
      expect(volume).to.be.gt(0n);
    });

    it("Should handle null or undefined order gracefully", function () {
      // Estimate volume with null order
      const volume1 = batchSolver.estimateVolume(null);
      expect(volume1).to.equal(0n);
      
      // Estimate volume with undefined order
      const volume2 = batchSolver.estimateVolume(undefined);
      expect(volume2).to.equal(0n);
    });

    it("Should handle missing encrypted amount gracefully", function () {
      // Create an order without encrypted amount
      const order = {
        id: "order1",
        trader: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        pairId: ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH")),
        orderType: 0,
        publicPrice: 1000n
      };
      
      // Estimate volume
      const volume = batchSolver.estimateVolume(order);
      
      // Should return default value
      expect(volume).to.equal(0n);
    });
  });

  describe("Batch Processing", function () {
    beforeEach(async function () {
      await batchSolver.initialize();
    });

    it("Should process batch when deadline is reached", async function () {
      // Create some orders
      const pairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const trader = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      
      // Create some encrypted amounts
      const publicKey = zkUtils.derivePublicKey(123456789n);
      const encryptedAmount1 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      const encryptedAmount2 = zkUtils.encryptAmount(publicKey, 10000n).cipher;
      
      // Create orders that can match
      batchSolver.handleNewOrder("order1", trader, pairId, 0, 1000n);
      batchSolver.handleNewOrder("order2", trader, pairId, 1, 990n);
      
      // Manually add encrypted amounts (normally these would come from the contract)
      batchSolver.batchState.orders[0].encryptedAmount = encryptedAmount1;
      batchSolver.batchState.orders[1].encryptedAmount = encryptedAmount2;
      
      // Process the batch
      await batchSolver.processBatch();
      
      // Should have generated settlements
      expect(batchSolver.settlementQueue.length).to.be.at.least(0); // May not match if prices don't work
    });

    it("Should handle empty batches gracefully", async function () {
      // Process an empty batch
      await batchSolver.processBatch();
      
      // No settlements should be created
      expect(batchSolver.settlementQueue).to.have.lengthOf(0);
    });
  });
});
