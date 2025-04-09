/**
 * BatchSolver Adapter
 * 
 * Adapts the backend BatchSolver for use in the frontend following
 * Wasmlanche safe parameter handling principles.
 */
import { ethers } from 'ethers';

class BatchSolverAdapter {
  constructor(config = {}) {
    this.provider = config.provider || null;
    this.networkId = config.networkId || 43114; // Default to Avalanche C-Chain
    
    // Current batch tracking
    this.currentBatchId = null;
    this.batchEndTime = null;
    
    // Wasmlanche safe parameter handling constants
    this.MAX_BATCH_ORDERS = 500;
    this.MAX_BATCH_TVL = ethers.parseUnits('100000000', 6); // $100M max TVL
  }

  /**
   * Set provider with validation
   */
  setProvider(provider) {
    if (provider && typeof provider.getBlock === 'function') {
      this.provider = provider;
      return true;
    }
    return false;
  }

  /**
   * Get current batch information with bounds checking
   */
  async getCurrentBatch() {
    try {
      // Default response for fallback (Wasmlanche principle)
      const defaultResponse = {
        id: 'batch-unknown',
        timeRemaining: '02:00',
        ordersCount: 0,
        tvl: '$0',
        status: 'unknown'
      };

      // Validate provider
      if (!this.provider) {
        console.warn('No provider available for batch information');
        return defaultResponse;
      }

      // In a real implementation, this would query the contract
      // For now, we'll simulate a batch with timing based on current time
      
      // Create or update batch information
      if (!this.currentBatchId || !this.batchEndTime || new Date() >= this.batchEndTime) {
        // Create a new batch
        this.currentBatchId = 'batch-' + Math.floor(Math.random() * 10000);
        
        // Set end time to 2 minutes from now
        this.batchEndTime = new Date(Date.now() + 120000);
      }
      
      // Calculate time remaining
      const now = new Date();
      const timeRemainingMs = Math.max(0, this.batchEndTime - now);
      const secondsRemaining = Math.floor(timeRemainingMs / 1000);
      
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      const timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Generate random but consistent values for this batch
      const batchNumber = parseInt(this.currentBatchId.split('-')[1], 10);
      const seedValue = batchNumber || 0;
      
      // Calculate values with bounds checking (Wasmlanche principle)
      const ordersCount = Math.min((seedValue * 7) % 50 + 10, this.MAX_BATCH_ORDERS);
      
      // TVL with validation
      const rawTvl = (seedValue * 12500) % 1000000 + 50000;
      const tvl = `$${Math.min(rawTvl, Number(ethers.formatUnits(this.MAX_BATCH_TVL, 6))).toLocaleString()}`;
      
      // Status based on time remaining
      let status = 'active';
      if (secondsRemaining <= 10) {
        status = 'finalizing';
      }
      
      // Debug logging (Wasmlanche principle)
      console.log('Current batch status:', {
        id: this.currentBatchId,
        timeRemaining,
        ordersCount,
        tvl,
        status
      });
      
      return {
        id: this.currentBatchId,
        timeRemaining,
        ordersCount,
        tvl,
        status
      };
    } catch (error) {
      console.error('Error getting current batch:', error);
      
      // Return default response instead of failing (Wasmlanche principle)
      return {
        id: 'batch-error',
        timeRemaining: '00:00',
        ordersCount: 0,
        tvl: '$0',
        status: 'error'
      };
    }
  }

  /**
   * Submit an order to the current batch
   */
  async submitOrder(order) {
    try {
      // Validate order parameters (Wasmlanche principle)
      if (!order || !order.tokenIn || !order.tokenOut || !order.amountIn || !order.minAmountOut) {
        throw new Error('Invalid order parameters');
      }
      
      // Validate addresses
      if (!ethers.isAddress(order.tokenIn) || !ethers.isAddress(order.tokenOut)) {
        throw new Error('Invalid token address format');
      }
      
      // Validate amounts
      const bigAmountIn = ethers.getBigInt(order.amountIn);
      const bigMinOut = ethers.getBigInt(order.minAmountOut);
      
      if (bigAmountIn <= 0n) {
        throw new Error('Input amount must be greater than 0');
      }
      
      if (bigMinOut <= 0n) {
        throw new Error('Minimum output amount must be greater than 0');
      }
      
      // Check batch status
      const batch = await this.getCurrentBatch();
      if (batch.status !== 'active') {
        throw new Error(`Cannot submit to batch in ${batch.status} status`);
      }
      
      // In a real implementation, this would call the contract
      // For now, simulate submission
      
      // Debug logging (Wasmlanche principle)
      console.log('Submitting order to batch:', {
        batchId: batch.id,
        order
      });
      
      // Return successful result
      return {
        success: true,
        orderId: '0x' + Math.random().toString(16).substr(2, 64),
        batchId: batch.id,
        estimatedSettlement: this.batchEndTime.toISOString()
      };
    } catch (error) {
      console.error('Error submitting order:', error);
      
      // Return properly formatted error (Wasmlanche principle)
      return {
        success: false,
        error: error.message || 'Failed to submit order to batch',
        batchId: this.currentBatchId || 'unknown'
      };
    }
  }
}

export default BatchSolverAdapter;
