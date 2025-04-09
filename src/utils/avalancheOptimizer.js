/**
 * Avalanche C-Chain Optimizer
 * 
 * Utilities for optimizing contract interactions on Avalanche C-Chain
 * Leverages Avalanche's 2-second block time and higher throughput
 */

import { ethers } from 'ethers';
import avalancheConfig from '../config/avalancheConfig.js';

class AvalancheOptimizer {
  constructor(provider) {
    this.provider = provider;
    this.isAvalanche = this._checkIfAvalanche();
    this.metrics = {
      batchProcessingTimes: [],
      gasCosts: {},
      blockTimes: []
    };
  }

  /**
   * Check if we're running on Avalanche network
   * @private
   */
  _checkIfAvalanche() {
    try {
      const networkId = this.provider.network?.chainId;
      return networkId === avalancheConfig.network.chainId;
    } catch (e) {
      console.warn('Could not determine network, assuming not Avalanche:', e.message);
      return false;
    }
  }

  /**
   * Get optimized gas parameters for Avalanche 
   * @param {Object} options - Transaction options
   * @return {Object} Gas-optimized transaction parameters
   */
  getOptimizedGasParams(options = {}) {
    if (!this.isAvalanche) {
      return options; // Return unmodified if not on Avalanche
    }

    // Optimize for Avalanche's fee market
    return {
      ...options,
      gasPrice: ethers.utils.parseUnits(
        String(avalancheConfig.network.gasPrice), 
        'gwei'
      ),
      gasLimit: Math.min(
        options.gasLimit || avalancheConfig.network.maxGasLimit,
        avalancheConfig.network.maxGasLimit
      )
    };
  }

  /**
   * Batch multiple transactions for efficient processing on Avalanche
   * @param {Array<Function>} txFunctions - Array of transaction-generating functions
   * @param {Object} options - Options for batch processing
   * @return {Promise<Array>} Results of processed transactions
   */
  async batchProcess(txFunctions, options = {}) {
    const startTime = Date.now();
    const results = [];
    
    if (!this.isAvalanche || !avalancheConfig.optimizations.batchTransactions) {
      // Process sequentially on non-Avalanche networks
      for (const txFn of txFunctions) {
        results.push(await txFn());
      }
    } else {
      // On Avalanche, we can process more concurrently due to higher throughput
      // Calculate optimal batch size based on Avalanche's 2-second blocks
      const batchSize = options.batchSize || 10;
      
      // Process in optimized batches
      for (let i = 0; i < txFunctions.length; i += batchSize) {
        const batch = txFunctions.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(txFn => txFn()));
        results.push(...batchResults);
      }
    }
    
    // Record metrics
    const processingTime = Date.now() - startTime;
    this.metrics.batchProcessingTimes.push({
      count: txFunctions.length,
      timeMs: processingTime,
      timestamp: new Date().toISOString()
    });
    
    return results;
  }

  /**
   * Monitor Avalanche block times to optimize timing parameters
   * @return {Promise<Object>} Block time statistics
   */
  async monitorBlockTimes() {
    if (!this.isAvalanche) {
      return { average: null, isAvalanche: false };
    }
    
    const blockCount = 10;
    const blockNumbers = [];
    const blockTimes = [];
    
    // Get current block
    const currentBlock = await this.provider.getBlockNumber();
    
    // Get the last 10 blocks
    for (let i = 0; i < blockCount; i++) {
      blockNumbers.push(currentBlock - i);
    }
    
    // Get block timestamps
    const blocks = await Promise.all(
      blockNumbers.map(num => this.provider.getBlock(num))
    );
    
    // Calculate times between blocks
    for (let i = 0; i < blocks.length - 1; i++) {
      const timeDiff = blocks[i].timestamp - blocks[i + 1].timestamp;
      blockTimes.push(timeDiff);
    }
    
    // Calculate statistics
    const sum = blockTimes.reduce((a, b) => a + b, 0);
    const average = sum / blockTimes.length;
    
    // Update metrics
    this.metrics.blockTimes = [...this.metrics.blockTimes, ...blockTimes].slice(-100);
    
    return {
      average,
      current: blockTimes[0],
      min: Math.min(...blockTimes),
      max: Math.max(...blockTimes),
      isAvalanche: true
    };
  }

  /**
   * Get recommendations for Avalanche-optimized batch settings
   * @return {Object} Recommended settings
   */
  getRecommendedSettings() {
    // If not on Avalanche, use conservative defaults
    if (!this.isAvalanche) {
      return {
        batchDuration: 600, // 10 minutes
        maxOrdersPerBatch: 100,
        useFastSettlement: false
      };
    }
    
    // Calculate average block time if we have data
    let avgBlockTime = avalancheConfig.network.blockTime; // Default 2 seconds
    if (this.metrics.blockTimes.length > 0) {
      const sum = this.metrics.blockTimes.reduce((a, b) => a + b, 0);
      avgBlockTime = sum / this.metrics.blockTimes.length;
    }
    
    // Calculate optimal settings based on observed metrics
    return {
      batchDuration: Math.max(
        avalancheConfig.batchAuction.minDuration,
        Math.round(avgBlockTime * 15) // Target ~15 blocks per batch
      ),
      maxOrdersPerBatch: avalancheConfig.limits.maxBatchSize,
      useFastSettlement: true,
      estimatedBlockTime: avgBlockTime
    };
  }
}

export default AvalancheOptimizer;
