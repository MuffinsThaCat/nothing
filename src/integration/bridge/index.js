/**
 * Bridge Integration Layer
 * 
 * Integrates the TEE Bridge Adapter with the EERC20 Batch DEX to enable
 * secure cross-chain functionality while maintaining privacy guarantees.
 * Implements comprehensive parameter validation, safe error handling,
 * and proper bounds checking.
 */

import TeeBridgeAdapter from './TeeBridgeAdapter';
import { ethers } from 'ethers';

/**
 * Creates a bridge service with validated configuration
 * @param {Object} config - Bridge configuration
 * @return {Object} Bridge service interface
 */
export function createBridgeService(config = {}) {
  // Validate config with safe defaults
  const safeConfig = {
    networkType: config.networkType || 'testnet',
    bridgeAddress: config.bridgeAddress || null,
    provider: config.provider || null,
    maxTransferAmount: config.maxTransferAmount || null,
    minTransferAmount: config.minTransferAmount || null
  };
  
  // Initialize adapter with validated config
  const bridgeAdapter = new TeeBridgeAdapter(safeConfig);
  let initialized = false;
  
  /**
   * Initialize the bridge service with safety checks
   * @param {Object} provider - Ethers provider
   * @return {Object} initialization result
   */
  async function initialize(provider) {
    try {
      // Parameter validation
      if (!provider) {
        console.warn('Bridge service: Provider is required for initialization');
        return { success: false, error: 'Provider is required' };
      }
      
      const result = await bridgeAdapter.initialize(provider);
      initialized = result.success;
      return result;
    } catch (error) {
      // Safe error handling - return error result instead of throwing
      console.error('Bridge service initialization error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Transfer assets to another chain with parameter validation
   * @param {Object} params - Transfer parameters
   * @return {Object} transfer result
   */
  async function transferToChain(params = {}) {
    try {
      // Validate initialization state
      if (!initialized) {
        console.warn('Bridge service: Not initialized');
        return { success: false, error: 'Bridge service not initialized' };
      }
      
      // Parameter validation with safe defaults
      const safeParams = {};
      
      // Validate token address
      if (!params.tokenAddress || !ethers.utils.isAddress(params.tokenAddress)) {
        console.warn(`Bridge service: Invalid token address: ${params.tokenAddress}`);
        return { success: false, error: 'Invalid token address' };
      }
      safeParams.tokenAddress = params.tokenAddress;
      
      // Validate destination chain ID
      if (!params.chainId) {
        console.warn('Bridge service: Destination chain ID is required');
        return { success: false, error: 'Destination chain ID is required' };
      }
      safeParams.destinationChainId = Number(params.chainId);
      
      // Validate amount
      if (!params.amount) {
        console.warn('Bridge service: Amount is required');
        return { success: false, error: 'Amount is required' };
      }
      
      try {
        safeParams.amount = ethers.BigNumber.from(params.amount);
      } catch (error) {
        console.warn(`Bridge service: Invalid amount format: ${params.amount}`);
        return { success: false, error: 'Invalid amount format' };
      }
      
      // Validate recipient
      if (!params.recipient || !ethers.utils.isAddress(params.recipient)) {
        console.warn(`Bridge service: Invalid recipient address: ${params.recipient}`);
        return { success: false, error: 'Invalid recipient address' };
      }
      safeParams.recipient = params.recipient;
      
      // Call bridge adapter with validated parameters
      return await bridgeAdapter.bridgeAssets(safeParams);
    } catch (error) {
      // Return a safe error value instead of throwing
      console.error('Bridge service transfer error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get transaction status with parameter validation
   * @param {string} txHash - Transaction hash
   * @return {Object} transaction status
   */
  async function getTransactionStatus(txHash) {
    try {
      // Parameter validation
      if (!txHash || typeof txHash !== 'string') {
        console.warn(`Bridge service: Invalid transaction hash: ${txHash}`);
        return { success: false, error: 'Invalid transaction hash' };
      }
      
      // Validate initialization state
      if (!initialized) {
        console.warn('Bridge service: Not initialized');
        return { success: false, error: 'Bridge service not initialized' };
      }
      
      return await bridgeAdapter.getTransactionStatus(txHash);
    } catch (error) {
      // Return a safe error value instead of throwing
      console.error('Bridge service status error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get supported chains with safety
   * @return {Object} supported chains
   */
  function getSupportedChains() {
    try {
      // Safety: return empty array if not initialized
      if (!initialized) {
        console.warn('Bridge service: Not initialized');
        return { success: false, error: 'Bridge service not initialized' };
      }
      
      // Example supported chains - would be dynamically fetched in production
      return {
        success: true,
        chains: [
          {
            id: 1,
            name: 'Ethereum Mainnet',
            currencySymbol: 'ETH'
          },
          {
            id: 43114,
            name: 'Avalanche C-Chain',
            currencySymbol: 'AVAX'
          },
          {
            id: 42161,
            name: 'Arbitrum One',
            currencySymbol: 'ETH'
          },
          {
            id: 10,
            name: 'Optimism',
            currencySymbol: 'ETH'
          },
          {
            id: 137,
            name: 'Polygon',
            currencySymbol: 'MATIC'
          }
        ]
      };
    } catch (error) {
      // Return a safe error value instead of throwing
      console.error('Bridge service get chains error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Return service interface with validated methods
  return {
    initialize,
    transferToChain,
    getTransactionStatus,
    getSupportedChains
  };
}

export default createBridgeService;
