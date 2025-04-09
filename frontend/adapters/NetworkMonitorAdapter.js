/**
 * NetworkMonitor Adapter
 * 
 * Adapts the backend NetworkMonitor for use in the frontend following
 * Wasmlanche safe parameter handling principles.
 */
import { ethers } from 'ethers';

class NetworkMonitorAdapter {
  constructor(provider = null) {
    this.provider = provider;
    this.lastBlockTimestamps = [];
    this.maxSavedTimestamps = 10; // Keep track of the last 10 blocks for averages
  }

  /**
   * Set provider with validation (Wasmlanche principle)
   */
  setProvider(provider) {
    if (provider && typeof provider.getBlock === 'function') {
      this.provider = provider;
      return true;
    }
    return false;
  }

  /**
   * Get current network status with bounded checks on all operations
   */
  async getNetworkStatus() {
    try {
      // Default values for fallback (Wasmlanche principle)
      const defaultResponse = {
        blockTime: 2.0,
        gasPrice: 25,
        congestion: 'Unknown',
        blockHeight: 0,
        lastUpdated: new Date()
      };

      // Validate provider availability
      if (!this.provider) {
        console.warn('No provider available for network status');
        return defaultResponse;
      }

      // Safe promise handling with timeouts (Wasmlanche principle)
      const blockNumberPromise = this.provider.getBlockNumber();
      const gasPricePromise = this.provider.getFeeData();

      // Set timeout to prevent hanging
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network request timeout')), 5000)
      );

      // Get block number with timeout
      const blockHeight = await Promise.race([blockNumberPromise, timeout])
        .catch(error => {
          console.error('Error getting block height:', error);
          return 0; // Fallback value
        });

      // Safely get latest block with bounds checking
      let block = null;
      try {
        block = await this.provider.getBlock(blockHeight);
      } catch (error) {
        console.error('Error getting latest block:', error);
      }

      // Calculate block time with safe handling of missing data
      let blockTime = 2.0; // Default for Avalanche
      if (block && block.timestamp) {
        // Validate timestamp (Wasmlanche principle)
        const timestamp = Number(block.timestamp);
        if (!isNaN(timestamp) && timestamp > 0) {
          this.lastBlockTimestamps.push({
            number: blockHeight,
            timestamp: timestamp
          });

          // Keep array size bounded (Wasmlanche principle)
          if (this.lastBlockTimestamps.length > this.maxSavedTimestamps) {
            this.lastBlockTimestamps.shift();
          }

          // Calculate average block time if we have at least 2 blocks
          if (this.lastBlockTimestamps.length >= 2) {
            const newest = this.lastBlockTimestamps[this.lastBlockTimestamps.length - 1];
            const oldest = this.lastBlockTimestamps[0];
            const blocksDiff = newest.number - oldest.number;
            
            if (blocksDiff > 0) {
              const timeDiff = newest.timestamp - oldest.timestamp;
              blockTime = timeDiff / blocksDiff;
              
              // Bounds check result (Wasmlanche principle)
              if (blockTime <= 0 || blockTime > 60) {
                blockTime = 2.0; // Fallback to default if the calculation is implausible
              }
            }
          }
        }
      }

      // Get gas price with safe parsing
      let gasPrice = 25; // Default for Avalanche
      try {
        const feeData = await Promise.race([gasPricePromise, timeout]);
        if (feeData && feeData.gasPrice) {
          const gasPriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
          gasPrice = parseFloat(gasPriceGwei);
          
          // Bounds check result (Wasmlanche principle)
          if (isNaN(gasPrice) || gasPrice <= 0 || gasPrice > 10000) {
            gasPrice = 25; // Fallback if the result is implausible
          }
        }
      } catch (error) {
        console.error('Error getting gas price:', error);
      }

      // Determine network congestion level
      let congestion = 'Low';
      if (gasPrice > 50) {
        congestion = 'Medium';
      } else if (gasPrice > 100) {
        congestion = 'High';
      }

      // Return network status with all validated parameters
      return {
        blockTime,
        gasPrice,
        congestion,
        blockHeight,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      
      // Return default response instead of failing (Wasmlanche principle)
      return {
        blockTime: 2.0,
        gasPrice: 25,
        congestion: 'Unknown',
        blockHeight: 0,
        lastUpdated: new Date()
      };
    }
  }
}

export default NetworkMonitorAdapter;
