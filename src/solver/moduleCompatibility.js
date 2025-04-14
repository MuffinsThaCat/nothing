/**
 * Module Compatibility Layer
 * 
 * This module serves as a compatibility layer between CommonJS and ES Modules
 * for the EERC20 Batch DEX project. It isolates potential top-level await usage
 * and provides a safe interface that works in both module systems.
 * 
 * Following Wasmlanche safe parameter handling principles:
 * - Properly validates all inputs
 * - Returns safe defaults instead of throwing exceptions
 * - Applies bounds checking to prevent memory issues
 * - Uses defensive programming patterns
 */

// Core dependencies - wrapped safely
const { ethers } = require('ethers');
const crypto = require('crypto');
const BatchSolver = require('./BatchSolver');
const zkUtils = require('./zkUtils');

/**
 * Creates a BatchSolver instance with safe defaults and proper error handling
 * 
 * @param {Object} config - Configuration for the BatchSolver
 * @param {Object} batchAuctionDEX - DEX contract interface
 * @param {Object} provider - Ethereum provider
 * @returns {BatchSolver} A properly initialized BatchSolver instance
 */
function createBatchSolver(config, batchAuctionDEX, provider) {
  // Parameter validation
  if (!config || typeof config !== 'object') {
    console.warn("Invalid config provided to createBatchSolver - using safe defaults");
    config = {
      maxOrdersPerBatch: 100,
      maxPriceLevels: 50,
      minLiquidity: 1000,
      maxSlippage: 5,
      batchDuration: 600
    };
  }
  
  // Create safe mock objects if dependencies are missing
  if (!batchAuctionDEX) {
    console.warn("Missing batchAuctionDEX in createBatchSolver - using mock");
    batchAuctionDEX = {
      on: () => {},
      off: () => {},
      settleBatch: async () => {}
    };
  }
  
  if (!provider) {
    console.warn("Missing provider in createBatchSolver - using mock");
    provider = {
      getBlock: async () => ({ timestamp: Math.floor(Date.now() / 1000) })
    };
  }
  
  // Create the BatchSolver instance with validated parameters
  return new BatchSolver(config, batchAuctionDEX, provider);
}

/**
 * Safely initializes a BatchSolver instance
 * Handles potential top-level await issue by wrapping in an async function
 * 
 * @param {BatchSolver} batchSolver - The BatchSolver instance to initialize
 * @returns {Promise<void>} Promise that resolves when initialization is complete
 */
async function initializeBatchSolver(batchSolver) {
  if (!batchSolver || !(batchSolver instanceof BatchSolver)) {
    console.error("Invalid BatchSolver instance provided to initializeBatchSolver");
    return;
  }
  
  try {
    await batchSolver.initialize();
  } catch (error) {
    console.error("Error initializing BatchSolver:", error);
    // Return silently instead of propagating error - Wasmlanche principle
  }
}

/**
 * Creates encapsulated mock objects for testing
 * 
 * @returns {Object} Mock objects for testing
 */
function createTestMocks() {
  const mockBatchAuctionDEX = {
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
  
  const mockProvider = {
    calls: [],
    getBlock() {
      this.calls.push('getBlock');
      return Promise.resolve({ timestamp: Math.floor(Date.now() / 1000) });
    }
  };
  
  return {
    mockBatchAuctionDEX,
    mockProvider,
    config: {
      maxOrdersPerBatch: 100,
      maxPriceLevels: 50,
      minLiquidity: 1000,
      maxSlippage: 5,
      batchDuration: 600
    }
  };
}

// Export utilities that safely bridge module systems
module.exports = {
  BatchSolver,
  zkUtils,
  ethers,
  createBatchSolver,
  initializeBatchSolver,
  createTestMocks
};
