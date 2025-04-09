/**
 * Avalanche Network Monitor
 * 
 * Provides specialized monitoring and performance optimization for the Avalanche C-Chain
 * - Tracks network congestion and block times
 * - Optimizes batch timing based on network conditions
 * - Implements safe parameter validation following Wasmlanche memory principles
 */
import { ethers } from 'ethers';
import avalancheConfig from '../../config/avalancheConfig.js';

class AvalancheNetworkMonitor {
  constructor(provider) {
    this.provider = provider;
    this.metrics = {
      blockTimes: [],      // Historical block times
      gasPrices: [],       // Historical gas prices
      congestionLevels: [] // Network congestion metrics
    };
    this.isAvalanche = false;
    this.initialized = false;
    this.MIN_SAMPLE_SIZE = 10;
    this.MAX_METRICS_SIZE = 100; // Bound the metrics array size
    
    // Safe initialization - handle null provider
    if (!this.provider) {
      console.warn('No provider supplied to AvalancheNetworkMonitor. Will attempt to create default.');
      try {
        this.provider = new ethers.JsonRpcProvider(avalancheConfig.rpcUrl);
      } catch (error) {
        console.error('Failed to create default provider:', error.message);
      }
    }
  }

  /**
   * Initialize the monitor
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Check if we're on Avalanche
      const network = await this.provider.getNetwork();
      // In ethers v6, chainId is a bigint, so we need to convert it
      this.isAvalanche = Number(network.chainId) === avalancheConfig.network.chainId;
      
      // Log this only once during initialization
      if (!this.isAvalanche) {
        console.warn('Not running on Avalanche C-Chain. Some optimizations will be disabled.');
      }
      
      // Start monitoring (with limited warnings)
      this._startBlockListener();
      
      // Get initial metrics
      await this.refreshMetrics();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Avalanche network monitor:', error);
      // Safe error handling, return formatted error object
      return { error: error.message, initialized: false };
    }
  }

  /**
   * Set up block monitoring - simplified version that won't get stuck
   * @private
   */
  _startBlockListener() {
    // In testing environments, just use reasonable defaults instead of listening for blocks
    if (!this.isAvalanche) {
      console.log('Test environment detected - using default Avalanche parameters instead of live monitoring.');
      
      // Set up default values
      this._addMetric('blockTimes', avalancheConfig.network.blockTime);
      this._addMetric('gasPrices', ethers.parseUnits(String(avalancheConfig.network.gasPrice), 'gwei').toString());
      this._addMetric('congestionLevels', 5); // Medium congestion
      
      return; // Don't set up the event listener at all
    }
    
    // Only set up the listener if we're on the actual Avalanche network
    console.log('Setting up Avalanche C-Chain block monitoring...');
    
    // Don't add multiple listeners
    this.provider.removeAllListeners('block');
    
    // Add block listener with a more conservative approach
    let lastProcessedBlock = 0;
    const PROCESS_INTERVAL = 10; // Only process every 10th block to reduce overhead
    
    this.provider.on('block', async (blockNumber) => {
      // Only process occasional blocks to avoid overloading
      if (blockNumber - lastProcessedBlock < PROCESS_INTERVAL) {
        return;
      }
      
      lastProcessedBlock = blockNumber;
      console.log(`Processing Avalanche block ${blockNumber} metrics...`);
      
      try {
        // Get the block
        const block = await this.provider.getBlock(blockNumber);
        if (!block) return;
        
        // Update block times - simplified approach
        this._addMetric('blockTimes', avalancheConfig.network.blockTime);
        
        // Update gas prices - simplified to avoid getting stuck
        try {
          const feeData = await this.provider.getFeeData();
          if (feeData && feeData.gasPrice) {
            this._addMetric('gasPrices', feeData.gasPrice.toString());
            
            // Calculate congestion
            const currentGasPrice = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
            const baseGasPrice = avalancheConfig.network.gasPrice;
            const congestionLevel = Math.min(10, Math.max(1, Math.ceil(currentGasPrice / baseGasPrice)));
            this._addMetric('congestionLevels', congestionLevel);
          }
        } catch (feeError) {
          // If fee data fails, use defaults
          this._addMetric('gasPrices', ethers.parseUnits(String(avalancheConfig.network.gasPrice), 'gwei').toString());
          this._addMetric('congestionLevels', 5);
        }
      } catch (error) {
        console.warn('Error processing block metrics:', error.message);
      }
    });
  }
  
  /**
   * Add a metric to a tracked array with bounds checking
   * @param {string} metricName - Name of the metric array
   * @param {any} value - Value to add
   * @private
   */
  _addMetric(metricName, value) {
    // Safe parameter validation
    if (!metricName || !this.metrics[metricName]) return;
    
    // Add the new value
    this.metrics[metricName].push(value);
    
    // Keep array bounded to prevent unlimited growth
    if (this.metrics[metricName].length > this.MAX_METRICS_SIZE) {
      this.metrics[metricName] = this.metrics[metricName].slice(-this.MAX_METRICS_SIZE);
    }
  }

  /**
   * Refresh all metrics now
   */
  async refreshMetrics() {
    if (!this.initialized) await this.initialize();
    
    try {
      // Before doing expensive operations, check if we're running on a real Avalanche node
      // This helps with testing in environments where we don't have a full node
      if (!this.provider) {
        console.warn('Provider not available, skipping metrics refresh');
        return {
          blockTime: avalancheConfig.network.blockTime,
          gasPrice: avalancheConfig.network.gasPrice,
          congestionLevel: 5,
          isAvalanche: false,
          status: 'no_provider'
        };
      }
      
      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      
      // Get recent blocks to calculate times
      const blocks = [];
      for (let i = 0; i < this.MIN_SAMPLE_SIZE; i++) {
        if (currentBlock - i > 0) {
          const block = await this.provider.getBlock(currentBlock - i);
          if (block) blocks.push(block);
        }
      }
      
      // Calculate block times
      for (let i = 0; i < blocks.length - 1; i++) {
        const blockTime = blocks[i].timestamp - blocks[i + 1].timestamp;
        // Only add reasonable values
        if (blockTime > 0 && blockTime < 60) {
          this._addMetric('blockTimes', blockTime);
        }
      }
      
      // Get current gas price - ethers v6 uses getFeeData
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits(
        String(avalancheConfig.network.gasPrice), 'gwei'
      );
      this._addMetric('gasPrices', gasPrice.toString());
      
      // Calculate congestion level - ethers v6 formatUnits
      const currentGasPrice = Number(ethers.formatUnits(gasPrice, 'gwei'));
      const baseGasPrice = avalancheConfig.network.gasPrice;
      const congestionLevel = Math.min(10, Math.max(1, Math.ceil(currentGasPrice / baseGasPrice)));
      
      this._addMetric('congestionLevels', congestionLevel);
      
      return this.getNetworkState();
    } catch (error) {
      console.error('Error refreshing metrics:', error);
      // Return safe fallback
      return {
        blockTime: avalancheConfig.network.blockTime,
        gasPrice: avalancheConfig.network.gasPrice,
        congestionLevel: 5,
        isAvalanche: this.isAvalanche,
        error: error.message
      };
    }
  }

  /**
   * Get the current network state
   * @returns {Object} Current network metrics
   */
  getNetworkState() {
    // Ensure we have metrics
    if (!this.initialized || !this.metrics.blockTimes.length) {
      return {
        blockTime: avalancheConfig.network.blockTime,
        gasPrice: avalancheConfig.network.gasPrice,
        congestionLevel: 5,
        isAvalanche: this.isAvalanche,
        status: 'initializing'
      };
    }
    
    try {
      // Calculate average block time
      const sum = this.metrics.blockTimes.reduce((a, b) => a + b, 0);
      const avgBlockTime = this.metrics.blockTimes.length > 0 ? 
        sum / this.metrics.blockTimes.length : avalancheConfig.network.blockTime;
      
      // Get latest gas price - ethers v6 parseUnits
      const latestGasPrice = this.metrics.gasPrices.length > 0 ?
        this.metrics.gasPrices[this.metrics.gasPrices.length - 1] : 
        ethers.parseUnits(String(avalancheConfig.network.gasPrice), 'gwei').toString();
      
      // Get congestion level
      const latestCongestion = this.metrics.congestionLevels.length > 0 ?
        this.metrics.congestionLevels[this.metrics.congestionLevels.length - 1] : 5;
      
      return {
        blockTime: avgBlockTime,
        gasPrice: latestGasPrice,
        gasPriceGwei: Number(ethers.formatUnits(latestGasPrice, 'gwei')),
        congestionLevel: latestCongestion,
        congestionDescription: this._getCongestionDescription(latestCongestion),
        isAvalanche: this.isAvalanche,
        metrics: {
          blockTimeHistory: this.metrics.blockTimes.slice(-10),
          gasPriceHistory: this.metrics.gasPrices.slice(-10).map(gp => 
            Number(ethers.utils.formatUnits(gp, 'gwei'))
          ),
          congestionHistory: this.metrics.congestionLevels.slice(-10)
        },
        status: 'active'
      };
    } catch (error) {
      console.error('Error getting network state:', error);
      // Return safe fallback with empty arrays (per Wasmlanche memory)
      return {
        blockTime: avalancheConfig.network.blockTime,
        gasPrice: ethers.parseUnits(String(avalancheConfig.network.gasPrice), 'gwei').toString(),
        gasPriceGwei: avalancheConfig.network.gasPrice,
        congestionLevel: 5,
        congestionDescription: 'Unknown (error)',
        isAvalanche: this.isAvalanche,
        metrics: {
          blockTimeHistory: [],
          gasPriceHistory: [],
          congestionHistory: []
        },
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Get congestion level description for UI display
   * @param {number} level - Congestion level (1-10)
   * @returns {string} Human-readable congestion description
   * @private
   */
  _getCongestionDescription(level) {
    if (level <= 2) return 'Very Low';
    if (level <= 4) return 'Low';
    if (level <= 6) return 'Moderate';
    if (level <= 8) return 'High';
    return 'Very High';
  }

  /**
   * Get recommended batch settings based on current network conditions
   * @returns {Object} Recommended settings
   */
  getRecommendedBatchSettings() {
    if (!this.initialized) {
      return {
        batchDuration: avalancheConfig.batchAuction.defaultDuration,
        maxOrdersPerBatch: avalancheConfig.limits.maxBatchSize,
        isOptimized: false
      };
    }
    
    const networkState = this.getNetworkState();
    const congestionLevel = networkState.congestionLevel;
    
    // Adjust batch duration based on congestion
    // Higher congestion = longer batches to allow for slower block times
    let batchDuration = avalancheConfig.batchAuction.defaultDuration;
    let maxOrdersPerBatch = avalancheConfig.limits.maxBatchSize;
    
    if (congestionLevel <= 3) {
      // Low congestion - can run shorter batches
      batchDuration = Math.max(
        avalancheConfig.batchAuction.minDuration,
        Math.floor(avalancheConfig.batchAuction.defaultDuration * 0.5)
      );
      // Can process more orders per batch
      maxOrdersPerBatch = Math.floor(avalancheConfig.limits.maxBatchSize * 1.2);
    } else if (congestionLevel >= 8) {
      // High congestion - need longer batches
      batchDuration = Math.floor(avalancheConfig.batchAuction.defaultDuration * 1.5);
      // Process fewer orders per batch
      maxOrdersPerBatch = Math.floor(avalancheConfig.limits.maxBatchSize * 0.8);
    }
    
    return {
      batchDuration,
      maxOrdersPerBatch,
      estimatedBlocksPerBatch: Math.ceil(batchDuration / networkState.blockTime),
      gasPriceGwei: networkState.gasPriceGwei,
      congestionLevel: networkState.congestionLevel,
      congestionDescription: networkState.congestionDescription,
      isOptimized: true,
      blockTime: networkState.blockTime
    };
  }
  
  /**
   * Get recommended gas settings for transactions based on network conditions
   * @param {Object} options - Options to customize gas settings
   * @returns {Object} Gas settings for transactions
   */
  getRecommendedGasSettings(options = {}) {
    const networkState = this.getNetworkState();
    
    // Default multiplier is 1.0 (exactly current price)
    const priorityLevel = options.priorityLevel || 'standard';
    let multiplier = 1.0;
    
    // Adjust multiplier based on requested priority
    switch (priorityLevel) {
      case 'low':
        multiplier = 0.9;
        break;
      case 'standard':
        multiplier = 1.0;
        break;
      case 'high':
        multiplier = 1.1;
        break;
      case 'urgent':
        multiplier = 1.25;
        break;
    }
    
    // Calculate recommended gas price - ethers v6 BigInt
    const currentGasPrice = BigInt(networkState.gasPrice);
    const multiplierBigInt = BigInt(Math.floor(multiplier * 100));
    const recommendedGasPrice = (currentGasPrice * multiplierBigInt) / BigInt(100);
    
    return {
      gasPrice: recommendedGasPrice.toString(),
      gasPriceGwei: Number(ethers.utils.formatUnits(recommendedGasPrice, 'gwei')),
      maxFeePerGas: recommendedGasPrice.toString(), // For EIP-1559 support
      priorityLevel,
      multiplier,
      networkCongestion: networkState.congestionLevel,
      estimatedConfirmationBlocks: this._getEstimatedConfirmationBlocks(priorityLevel, networkState.congestionLevel)
    };
  }
  
  /**
   * Estimate blocks until confirmation based on priority and congestion
   * @param {string} priorityLevel - Transaction priority level
   * @param {number} congestionLevel - Network congestion level (1-10)
   * @returns {number} Estimated blocks until confirmation
   * @private
   */
  _getEstimatedConfirmationBlocks(priorityLevel, congestionLevel) {
    // Base confirmation time by priority
    const baseTimes = {
      'low': 3,
      'standard': 2,
      'high': 1,
      'urgent': 1
    };
    
    // Adjust for congestion
    const baseTime = baseTimes[priorityLevel] || 2;
    const congestionMultiplier = congestionLevel / 5; // 5 is medium congestion
    
    return Math.max(1, Math.ceil(baseTime * congestionMultiplier));
  }
}

export default AvalancheNetworkMonitor;
