/**
 * Frontend TeeBridge Adapter
 * 
 * Provides a secure frontend wrapper around the TeeBridgeAdapter integration,
 * implementing Wasmlanche's safe parameter handling principles:
 * - Strict parameter validation with bounds checking
 * - Returns empty results instead of throwing exceptions
 * - Comprehensive debug logging
 * - Safe data copying and validation
 */

import { ethers, parseEther } from 'ethers';
import createBridgeService from '../../src/integration/bridge/index.js';
import { safeLogger } from '../utils/SafeParameterHandler.js';

/**
 * Safely create a BigNumber from an ether string value
 * @param {string} value - The value to parse
 * @return {ethers.BigNumber} The parsed value or zero if invalid
 */
const safeParseEther = (value) => {
  try {
    return parseEther(value || '0');
  } catch (error) {
    safeLogger.warn('Error parsing ether value:', error.message);
    return parseEther('0'); // Return 0 as safe fallback
  }
};

/**
 * TeeBridgeAdapter frontend wrapper
 * Implements Wasmlanche safe parameter handling principles
 */
class TeeBridgeAdapterFrontend {
  constructor(options = {}) {
    // Apply safe parameter validation to options
    this.options = {
      networkType: options.networkType || 'testnet',
      provider: options.provider || null,
      maxTransferAmount: options.maxTransferAmount || '100000',
      minTransferAmount: options.minTransferAmount || '0.000001',
      maxGasPrice: Math.min(options.maxGasPrice || 1000000000000, 2000000000000),
      maxDataSize: Math.min(options.maxDataSize || 64 * 1024, 1024 * 1024),
      timeoutMs: Math.min(options.timeoutMs || 60000, 120000)
    };
    
    // Internal state with safe initialization
    this.initialized = false;
    this.bridgeService = null;
    this.lastError = null;
    this.pendingTransactions = [];
    this.supportedChains = [];
  }
  
  /**
   * Initialize bridge service with safe parameter handling
   * @param {ethers.Provider} provider - Ethers provider
   * @return {Promise<Object>} Initialization result
   */
  async initialize(provider) {
    try {
      // Validate provider
      if (!provider) {
        this.lastError = "Invalid provider";
        safeLogger.error("Failed to initialize bridge: Invalid provider");
        return { success: false, error: this.lastError };
      }
      
      // Create bridge service with validated parameters
      this.bridgeService = createBridgeService({
        networkType: this.options.networkType,
        provider: provider,
        maxTransferAmount: safeParseEther(this.options.maxTransferAmount),
        minTransferAmount: safeParseEther(this.options.minTransferAmount),
        maxGasPrice: this.options.maxGasPrice,
        maxDataSize: this.options.maxDataSize,
        timeoutMs: this.options.timeoutMs
      });
      
      // Initialize with safety checks
      const initResult = await this.bridgeService.initialize();
      this.initialized = initResult.success;
      
      if (this.initialized) {
        // Safely load supported chains
        try {
          this.supportedChains = await this.bridgeService.getSupportedChains();
        } catch (error) {
          // Fallback to default supported chains
          this.supportedChains = [
            { id: 'avax-c', name: 'Avalanche C-Chain', logo: '/assets/chains/avalanche.svg' },
            { id: 'eth', name: 'Ethereum', logo: '/assets/chains/ethereum.svg' }
          ];
          safeLogger.warn("Error loading supported chains, using defaults:", error.message);
        }
        
        // Safely load pending transactions
        try {
          this.pendingTransactions = await this.bridgeService.getPendingTransactions();
        } catch (error) {
          this.pendingTransactions = [];
          safeLogger.warn("Error loading pending transactions:", error.message);
        }
        
        return { success: true };
      } else {
        this.lastError = initResult.error || "Unknown initialization error";
        safeLogger.error("Failed to initialize bridge:", this.lastError);
        return { success: false, error: this.lastError };
      }
    } catch (error) {
      this.lastError = error.message;
      safeLogger.error("Error in bridge initialization:", error.message);
      return { success: false, error: this.lastError };
    }
  }
  
  /**
   * Bridge assets to another chain with comprehensive parameter validation
   * @param {Object} params - Bridge transaction parameters
   * @return {Promise<Object>} Transaction result with safe handling
   */
  async bridgeAssets(params = {}) {
    if (!this.initialized || !this.bridgeService) {
      return { success: false, error: "Bridge service not initialized" };
    }
    
    try {
      // Validate mandatory parameters
      if (!params.token || !params.destinationChain || !params.amount || !params.recipient) {
        return { 
          success: false, 
          error: "Missing required parameters: token, destinationChain, amount, or recipient" 
        };
      }
      
      // Validate amount is a reasonable number (avoid unreasonable lengths)
      const amountNum = parseFloat(params.amount);
      if (isNaN(amountNum) || amountNum <= 0 || amountNum.toString().length > 30) {
        return { success: false, error: "Invalid amount value" };
      }
      
      // Validate recipient address format
      if (!ethers.isAddress(params.recipient)) {
        return { success: false, error: "Invalid recipient address format" };
      }
      
      // Execute bridge transaction with safety checks
      const result = await this.bridgeService.bridgeAssets({
        token: params.token,
        destinationChain: params.destinationChain,
        amount: params.amount,
        recipient: params.recipient,
        memo: params.memo || ""
      });
      
      return result;
    } catch (error) {
      safeLogger.error("Error bridging assets:", error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get transaction status with safe parameter handling
   * @param {string} txHash - Transaction hash
   * @return {Promise<Object>} Transaction status
   */
  async getTransactionStatus(txHash) {
    if (!this.initialized || !this.bridgeService) {
      return { success: false, error: "Bridge service not initialized" };
    }
    
    try {
      // Validate txHash format
      if (!txHash || typeof txHash !== 'string' || txHash.length !== 66 || !txHash.startsWith('0x')) {
        return { success: false, error: "Invalid transaction hash format" };
      }
      
      return await this.bridgeService.getTransactionStatus(txHash);
    } catch (error) {
      safeLogger.error("Error getting transaction status:", error.message);
      return { success: false, error: error.message, status: 'unknown' };
    }
  }
  
  /**
   * Get supported bridge chains with fallback
   * @return {Promise<Array>} Supported chains
   */
  async getSupportedChains() {
    if (!this.initialized) {
      return this.supportedChains;
    }
    
    try {
      return await this.bridgeService.getSupportedChains();
    } catch (error) {
      safeLogger.error("Error getting supported chains:", error.message);
      return this.supportedChains;
    }
  }
  
  /**
   * Get pending bridge transactions with fallback
   * @return {Promise<Array>} Pending transactions
   */
  async getPendingTransactions() {
    if (!this.initialized) {
      return this.pendingTransactions;
    }
    
    try {
      return await this.bridgeService.getPendingTransactions();
    } catch (error) {
      safeLogger.error("Error getting pending transactions:", error.message);
      return this.pendingTransactions;
    }
  }
}

export default TeeBridgeAdapterFrontend;
