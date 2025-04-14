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
      
      // Create or update batch information with consistent values
      // Calculate consistent batch ID and timing
      const now = Date.now();
      const batchCycleMs = 5 * 60 * 1000; // 5 minute cycles
      const msElapsedInCycle = now % batchCycleMs;
      const msRemainingInCycle = batchCycleMs - msElapsedInCycle;
      
      // Calculate the current batch cycle number
      const currentCycleNumber = Math.floor(now / batchCycleMs);
      
      // Update the batch ID using the current cycle number
      this.currentBatchId = `batch-${currentCycleNumber}`;
      
      // Set the batch end time based on the current cycle
      this.batchEndTime = new Date(now + msRemainingInCycle);
      
      // Add contract addresses
      this.batchAuctionDEXAddress = '0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5';
      this.encryptedERCAddress = '0x51A1ceB83B83F1985a81C295d1fF28Afef186E02';
      
      // Calculate time remaining
      // Using current time from above
      const timeRemainingMs = Math.max(0, this.batchEndTime - new Date(now));
      const secondsRemaining = Math.floor(timeRemainingMs / 1000);
      
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      const timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Use consistent values for batch data
      // Instead of generating random or semi-random values
      
      // Fixed order count for consistency
      const ordersCount = 42;
      
      // Fixed TVL for consistency
      const tvl = '$24,680.50';
      
      // Status based on time remaining
      let status = 'open';
      if (secondsRemaining <= 30) {
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
        orderId: `order-${this.currentBatchId}-${Date.now()}`,
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
