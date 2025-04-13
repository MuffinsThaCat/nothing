/**
 * EERC20Adapter.js
 * 
 * Adapter for interacting with EERC20 tokens and the Batch DEX
 * Implements Wasmlanche safe parameter handling principles throughout
 */
import { ethers } from 'ethers';
import { contracts } from '../config/contracts.js';
import SafeParameterHandler, { 
  safeLogger, 
  validateParameterLength, 
  validateNumericParameter 
} from '../utils/SafeParameterHandler.js';

// Import ABIs - we'll use placeholder ABIs for now
const DEX_ABI = [
  "function placeOrder(bytes32 pairId, uint8 orderType, uint256 amount, uint256 price, bytes memory proof) external returns (bytes32)",
  "function cancelOrder(bytes32 orderId) external",
  "function getActiveBatch() external view returns (uint256, uint256)",
  "function getBatchSettlement(uint256 batchId, bytes32 pairId) external view returns (uint256, uint256, uint256)"
];

const EERC20_ABI = [
  "function transferEncrypted(address to, bytes memory encryptedAmount, bytes memory zkProof) external returns (bool)",
  "function balanceOf(address account) external view returns (bytes memory)"
];

/**
 * EERC20 Token and DEX adapter with safe parameter handling
 */
class EERC20Adapter {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.batchDexContract = null;
    this.connected = false;
    this.maxParamSize = SafeParameterHandler.MAX_STANDARD_LENGTH;
  }

  /**
   * Initialize the adapter with an ethers provider and signer
   * Implements proper parameter validation and error handling
   * @param {ethers.Provider} provider - Ethers provider
   * @param {ethers.Signer} signer - Ethers signer
   * @returns {boolean} Success status
   */
  initialize(provider, signer) {
    try {
      // Parameter validation
      if (!provider || !signer) {
        safeLogger.error("Invalid provider or signer");
        return false; // Return empty result instead of throwing
      }

      this.provider = provider;
      this.signer = signer;
      
      // Initialize DEX contract with parameter validation
      try {
        this.batchDexContract = new ethers.Contract(
          contracts.BatchAuctionDEX,
          DEX_ABI,
          signer
        );
        this.connected = true;
        return true;
      } catch (error) {
        // Detailed error logging without exposing sensitive data
        safeLogger.error("Failed to initialize BatchAuctionDEX contract", { 
          address: contracts.BatchAuctionDEX,
          error: error.message
        });
        return false; // Return empty result instead of throwing
      }
    } catch (error) {
      // Comprehensive error logging
      safeLogger.error("Error in EERC20Adapter initialization", { error: error.message });
      this.connected = false;
      return false; // Return empty result instead of throwing
    }
  }

  /**
   * Get current batch information with safe parameter handling
   * @returns {Promise<Object>} Batch information or empty object on failure
   */
  async getCurrentBatch() {
    try {
      if (!this.connected || !this.batchDexContract) {
        safeLogger.warn("Not connected to DEX");
        return { batchId: 0, deadline: 0 }; // Return empty result
      }

      const [batchId, deadline] = await this.batchDexContract.getActiveBatch();
      
      // Validate returned parameters for reasonable values
      if (!validateNumericParameter(batchId, 0, Number.MAX_SAFE_INTEGER) ||
          !validateNumericParameter(deadline, 0, Number.MAX_SAFE_INTEGER)) {
        safeLogger.warn("Received unreasonable batch parameters");
        return { batchId: 0, deadline: 0 }; // Return safe fallback values
      }
      
      return {
        batchId: Number(batchId),
        deadline: Number(deadline),
        // Calculate remaining time in seconds
        remainingTime: Math.max(0, Number(deadline) - Math.floor(Date.now() / 1000))
      };
    } catch (error) {
      safeLogger.error("Failed to get current batch", { error: error.message });
      return { batchId: 0, deadline: 0 }; // Return empty result
    }
  }

  /**
   * Place an order in the batch auction
   * @param {Object} orderParams - Order parameters with safe validation
   * @returns {Promise<Object>} Order result or null on failure
   */
  async placeOrder(orderParams) {
    try {
      if (!this.connected || !this.batchDexContract) {
        safeLogger.warn("Not connected to DEX");
        return null;
      }
      
      // Validate parameters to prevent unreasonable inputs
      if (!orderParams || 
          !orderParams.pairId || 
          !validateNumericParameter(orderParams.orderType, 0, 1) ||
          !validateNumericParameter(orderParams.amount, 0, contracts.dexConfig.maxOrderSize) ||
          !validateNumericParameter(orderParams.price, 0)) {
        safeLogger.warn("Invalid order parameters");
        return null;
      }
      
      // Validate proof length to prevent unreasonable inputs
      if (orderParams.proof && 
          !validateParameterLength(orderParams.proof, SafeParameterHandler.MAX_PROOF_LENGTH)) {
        safeLogger.warn("Proof exceeds maximum allowed size");
        return null;
      }
      
      // Place order with safe parameter handling
      const tx = await this.batchDexContract.placeOrder(
        orderParams.pairId,
        orderParams.orderType,
        ethers.parseUnits(String(orderParams.amount), 18),
        ethers.parseUnits(String(orderParams.price), 18),
        orderParams.proof || "0x"
      );
      
      const receipt = await tx.wait();
      
      // Safely extract the orderId from logs
      let orderId = null;
      if (receipt && receipt.logs) {
        // Safely access logs with bounds checking
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i];
          if (log.topics && log.topics[0] === ethers.id("OrderPlaced(bytes32,address,bytes32,uint8,uint256)")) {
            orderId = log.topics[1];
            break;
          }
        }
      }
      
      return { 
        success: true, 
        orderId,
        txHash: receipt.hash
      };
    } catch (error) {
      safeLogger.error("Failed to place order", { error: error.message });
      return { success: false, error: "Failed to place order" }; // Return structured error
    }
  }

  /**
   * Cancel an order with safe parameter handling
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise<Object>} Cancel result or error object
   */
  async cancelOrder(orderId) {
    try {
      if (!this.connected || !this.batchDexContract) {
        safeLogger.warn("Not connected to DEX");
        return { success: false, error: "Not connected" };
      }

      // Validate orderId parameter
      if (!orderId || typeof orderId !== 'string' || !orderId.startsWith('0x')) {
        safeLogger.warn("Invalid order ID format");
        return { success: false, error: "Invalid order ID" };
      }

      const tx = await this.batchDexContract.cancelOrder(orderId);
      const receipt = await tx.wait();
      
      return { 
        success: true, 
        txHash: receipt.hash
      };
    } catch (error) {
      safeLogger.error("Failed to cancel order", { error: error.message });
      return { success: false, error: "Failed to cancel order" }; // Return structured error
    }
  }

  /**
   * Get batch settlement information with safe parameter handling
   * @param {number} batchId - Batch ID
   * @param {string} pairId - Token pair ID
   * @returns {Promise<Object>} Settlement information or empty object
   */
  async getBatchSettlement(batchId, pairId) {
    try {
      if (!this.connected || !this.batchDexContract) {
        safeLogger.warn("Not connected to DEX");
        return { clearingPrice: 0, settledVolume: 0, timestamp: 0 };
      }

      // Parameter validation
      if (!validateNumericParameter(batchId, 0) || !pairId || typeof pairId !== 'string') {
        safeLogger.warn("Invalid batch settlement parameters");
        return { clearingPrice: 0, settledVolume: 0, timestamp: 0 };
      }

      const [clearingPrice, settledVolume, timestamp] = 
        await this.batchDexContract.getBatchSettlement(batchId, pairId);
      
      return {
        clearingPrice: ethers.formatUnits(clearingPrice, 18),
        settledVolume: ethers.formatUnits(settledVolume, 18),
        timestamp: Number(timestamp)
      };
    } catch (error) {
      safeLogger.error("Failed to get batch settlement", { error: error.message });
      return { clearingPrice: 0, settledVolume: 0, timestamp: 0 }; // Return empty result
    }
  }

  /**
   * Create an EERC20 token contract with safe parameter handling
   * @param {string} tokenAddress - Token contract address
   * @returns {ethers.Contract|null} Token contract or null on failure
   */
  getEERC20TokenContract(tokenAddress) {
    try {
      // Validate token address
      if (!tokenAddress || typeof tokenAddress !== 'string' || 
          !ethers.isAddress(tokenAddress)) {
        safeLogger.warn("Invalid token address");
        return null;
      }

      return new ethers.Contract(
        tokenAddress,
        EERC20_ABI,
        this.signer
      );
    } catch (error) {
      safeLogger.error("Failed to create token contract", { 
        tokenAddress, 
        error: error.message 
      });
      return null; // Return empty result instead of throwing
    }
  }

  /**
   * Transfer encrypted tokens
   * @param {string} tokenAddress - Token address
   * @param {string} to - Recipient address
   * @param {string} encryptedAmount - Encrypted amount
   * @param {string} zkProof - Zero-knowledge proof
   * @returns {Promise<Object>} Transfer result or error object
   */
  async transferEncryptedTokens(tokenAddress, to, encryptedAmount, zkProof) {
    try {
      if (!this.signer) {
        safeLogger.warn("No signer available");
        return { success: false, error: "No signer available" };
      }
      
      // Validate parameters to prevent unreasonable inputs
      if (!tokenAddress || !ethers.isAddress(tokenAddress) ||
          !to || !ethers.isAddress(to) ||
          !encryptedAmount || !zkProof) {
        safeLogger.warn("Invalid transfer parameters");
        return { success: false, error: "Invalid parameters" };
      }
      
      // Validate encrypted data lengths to prevent unreasonable inputs
      if (!validateParameterLength(encryptedAmount, SafeParameterHandler.MAX_TRANSACTION_LENGTH) ||
          !validateParameterLength(zkProof, SafeParameterHandler.MAX_PROOF_LENGTH)) {
        safeLogger.warn("Encrypted data exceeds maximum allowed size");
        return { success: false, error: "Data too large" };
      }
      
      const tokenContract = this.getEERC20TokenContract(tokenAddress);
      if (!tokenContract) {
        return { success: false, error: "Invalid token contract" };
      }
      
      const tx = await tokenContract.transferEncrypted(to, encryptedAmount, zkProof);
      const receipt = await tx.wait();
      
      return { 
        success: true, 
        txHash: receipt.hash
      };
    } catch (error) {
      safeLogger.error("Failed to transfer encrypted tokens", { error: error.message });
      return { success: false, error: "Transfer failed" }; // Return structured error
    }
  }

  /**
   * Get encrypted balance
   * @param {string} tokenAddress - Token address
   * @param {string} account - Account address
   * @returns {Promise<string>} Encrypted balance or empty string on failure
   */
  async getEncryptedBalance(tokenAddress, account) {
    try {
      // Validate parameters
      if (!tokenAddress || !ethers.isAddress(tokenAddress) ||
          !account || !ethers.isAddress(account)) {
        safeLogger.warn("Invalid balance query parameters");
        return "0x"; // Return empty result
      }
      
      const tokenContract = this.getEERC20TokenContract(tokenAddress);
      if (!tokenContract) {
        return "0x"; // Return empty result
      }
      
      const encryptedBalance = await tokenContract.balanceOf(account);
      
      // Validate returned data to prevent unreasonable outputs
      if (!validateParameterLength(encryptedBalance, SafeParameterHandler.MAX_TRANSACTION_LENGTH)) {
        safeLogger.warn("Received unreasonably large encrypted balance");
        return "0x"; // Return empty result as fallback
      }
      
      return encryptedBalance;
    } catch (error) {
      safeLogger.error("Failed to get encrypted balance", { error: error.message });
      return "0x"; // Return empty result instead of throwing
    }
  }
}

// Export a singleton instance with safe parameter handling
export default new EERC20Adapter();
