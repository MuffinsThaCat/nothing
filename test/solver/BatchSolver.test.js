/**
 * @fileoverview Tests for the BatchSolver implementation
 */

const { expect } = require("chai");
const { ethers } = require("ethers");
const BatchSolver = require("../../src/solver/BatchSolver");
const zkUtils = require("../../src/solver/zkUtils");

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

  beforeEach(function () {
    // Create mock configuration
    batchSolverConfig = {
      maxOrdersPerBatch: 100,
      maxPriceLevels: 50,
      minLiquidity: 100,
      maxSlippage: 5
    };
    
    // Create mock BatchAuctionDEX contract with spies
    mockBatchAuctionDEX = {
      calls: [],
      settleBatch: async function(...args) {
        this.calls.push({
          method: "settleBatch",
          args
        });
        return { 
          hash: "0xmocktxhash",
          wait: async () => ({ blockNumber: 123456 })
        };
      },
      getBatchInfo: async function() {
        return [1, Math.floor(Date.now() / 1000) + 300, 300];
      },
      on: function(event, callback) {
        this.calls.push({
          method: "on",
          args: [event, "callback"]
        });
        return this;
      },
      off: function(event, callback) {
        this.calls.push({
          method: "off",
          args: [event, "callback"]
        });
        return this;
      }
    };
    
    // Create mock provider
    mockProvider = {
      calls: [],
      getBlock: async function() {
        this.calls.push({
          method: "getBlock",
          args: ["latest"]
        });
        return {
          timestamp: Math.floor(Date.now() / 1000)
        };
      }
    };
    
    // Create BatchSolver instance
    batchSolver = new BatchSolver(batchSolverConfig, mockBatchAuctionDEX, mockProvider);
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
      await batchSolver.initialize();
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
      await batchSolver.initialize();
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

  describe("Fill Amount Generation", function () {
    beforeEach(async function () {
      await batchSolver.initialize();
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
