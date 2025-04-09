/**
 * Avalanche-specific configuration for the EERC20 Batch DEX
 * Optimize gas usage and performance based on Avalanche C-Chain characteristics
 * ES Module version for frontend compatibility
 */

export default {
  // Network parameters
  network: {
    chainId: 43114, // Avalanche Mainnet C-Chain
    blockTime: 2, // seconds
    gasPrice: 25, // nAVAX (much lower than Ethereum)
    maxGasLimit: 8000000 // Avalanche has higher gas limits
  },
  
  // Batch auction timing optimized for Avalanche
  batchAuction: {
    minDuration: 30, // seconds (15 blocks)
    defaultDuration: 300, // seconds (5 minutes, ~150 blocks)
    settlementWindow: 6 // seconds (3 blocks) - time allowed for settlement before next batch
  },
  
  // Data size limits adjusted for Avalanche's lower gas costs
  limits: {
    maxParamSize: 65536, // 64KB (double standard Ethereum limits)
    maxBatchSize: 500, // Maximum orders per batch
    maxOrdersPerAddress: 50 // Maximum active orders per address
  },
  
  // Optimization flags for Avalanche
  optimizations: {
    useCalldata: true, // Use calldata instead of memory for external functions
    cacheStorageReads: true, // Cache storage reads to reduce gas costs
    batchTransactions: true, // Batch multiple txs together for better throughput
    skipEmptyTransactions: true // Skip empty transactions to save gas
  },
  
  // Monitoring for Avalanche-specific metrics
  monitoring: {
    trackSettlementGas: true, // Track gas used for settlements
    measureBlockLatency: true, // Measure block confirmation times
    logNetworkCongestion: true // Log network congestion metrics
  }
};
