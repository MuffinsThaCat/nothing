/**
 * @fileoverview Type definitions for the eerc20 batch auction solver
 */

/**
 * @typedef {Object} Order
 * @property {string} id - Unique order ID
 * @property {string} batchId - Batch ID this order belongs to
 * @property {string} trader - Address of the trader
 * @property {string} pairId - Token pair ID
 * @property {number} orderType - 0 for BUY, 1 for SELL
 * @property {bigint} publicPrice - Limit price (public)
 * @property {Uint8Array} encryptedAmount - Encrypted order amount
 * @property {Uint8Array} zkProof - Zero-knowledge proof for the order
 * @property {number} status - Order status (0: PENDING, 1: FILLED, 2: PARTIALLY_FILLED, 3: CANCELLED, 4: EXPIRED)
 * @property {bigint} timestamp - Order placement timestamp
 */

/**
 * @typedef {Object} TokenPair
 * @property {string} tokenA - Address of token A
 * @property {string} tokenB - Address of token B
 * @property {boolean} isEERC20A - Whether token A is an eerc20 token
 * @property {boolean} isEERC20B - Whether token B is an eerc20 token
 */

/**
 * @typedef {Object} BatchState
 * @property {string} batchId - Current batch ID
 * @property {bigint} deadline - Batch deadline timestamp
 * @property {Order[]} orders - Orders in the current batch
 * @property {Map<string, TokenPair>} tokenPairs - Token pairs available for trading
 */

/**
 * @typedef {Object} SettlementResult
 * @property {string} pairId - Token pair ID
 * @property {bigint} clearingPrice - Computed clearing price
 * @property {string[]} matchedOrderIds - IDs of matched orders
 * @property {Uint8Array[]} fillAmountHashes - Encrypted fill amounts
 * @property {Uint8Array} settlementProof - ZK proof validating the settlement
 */

/**
 * @typedef {Object} PriceLevel
 * @property {bigint} price - Price level
 * @property {Order[]} orders - Orders at this price level
 * @property {bigint} totalVolume - Total volume at this price level (only for estimation)
 */

/**
 * @typedef {Object} OrderBook
 * @property {PriceLevel[]} bids - Buy orders sorted by price (descending)
 * @property {PriceLevel[]} asks - Sell orders sorted by price (ascending)
 */

/**
 * @typedef {Object} SolverConfig
 * @property {number} maxOrdersPerBatch - Maximum number of orders to process in a batch
 * @property {number} maxPriceLevels - Maximum number of price levels to consider
 * @property {number} minLiquidity - Minimum liquidity threshold for a valid batch
 * @property {number} maxSlippage - Maximum slippage allowed as a percentage
 */

module.exports = {
  // These are just type definitions, no actual exports
};
