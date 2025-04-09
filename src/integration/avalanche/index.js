/**
 * Avalanche Ecosystem Integration
 * 
 * Main entry point for integrating the EERC20 Batch DEX with the Avalanche ecosystem
 * - Implements the privacy features of EERC20 tokens (encrypted amounts)
 * - Connects to batch auction DEX for fair price discovery and MEV protection
 * - Provides compatibility with popular Avalanche wallets (Core Wallet, MetaMask)
 * - Optimizes operations for Avalanche's high-throughput, low-latency environment
 * - Follows Wasmlanche safe parameter handling principles
 */

import { ethers } from 'ethers';
import PrivacyLiquidityPools from './privacyLiquidityPools.js';
import AvalancheWalletConnector from './walletConnector.js';
import AvalancheOptimizer from '../../utils/avalancheOptimizer.js';
import AvalancheNetworkMonitor from './networkMonitor.js';
import avalancheConfig from '../../config/avalancheConfig.js';
import zkUtils from '../../solver/zkUtils.js';

// Environment detection
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Import ABI files with environment compatibility
let BatchAuctionDEXAbi, EERC20Abi;

// In browser environment, use fetch to load JSON files
if (isBrowser) {
  // Inline minimal versions of the ABIs for the browser
  // This approach avoids the need to dynamically load JSON files
  BatchAuctionDEXAbi = {
    "abi": [
      {
        "inputs": [{ "name": "tokenIn", "type": "address" }, { "name": "tokenOut", "type": "address" }, { "name": "amountIn", "type": "uint256" }],
        "name": "executeSwap",
        "outputs": [{ "name": "amountOut", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getCurrentBatch",
        "outputs": [{ "name": "batchId", "type": "uint256" }, { "name": "deadline", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      }
    ]
  };
  
  EERC20Abi = {
    "abi": [
      {
        "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      }
    ]
  };
  
  console.log('Using browser-compatible ABIs');
} else {
  // In Node.js environment, use require
  try {
    // Dynamic import for Node.js environment
    const moduleImport = await import('module');
    const createRequire = moduleImport.createRequire;
    const require = createRequire(import.meta.url);
    
    // Load ABI files from disk
    BatchAuctionDEXAbi = require('../../abis/BatchAuctionDEX.json');
    EERC20Abi = require('../../abis/EERC20.json');
    
    console.log('Loaded contract ABIs from JSON files');
  } catch (error) {
    console.warn('Error loading ABIs, using fallbacks:', error.message);
    
    // Fallback minimal ABIs if loading fails
    BatchAuctionDEXAbi = { abi: [] };
    EERC20Abi = { abi: [] };
  }
}

// Follow Wasmlanche safe parameter handling principles
const SAFE_LIMITS = {
  MAX_TOKEN_AMOUNT: ethers.parseUnits("1000000000", 18), // 1 billion tokens max
  MAX_BATCH_SIZE: 500, // Maximum orders per batch
  MAX_ZK_PROOF_SIZE: 32 * 1024, // 32KB max for ZK proofs
  MAX_ENCRYPTED_DATA_SIZE: 1024, // 1KB max for encrypted data
  MIN_PARAMETERS: 2, // Minimum parameters required
};

// Error handling as per Wasmlanche principles
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Helper for safer parameter validation
function validateParameter(param, name, options = {}) {
  if (param === undefined || param === null) {
    if (options.required) {
      throw new ValidationError(`Parameter ${name} is required`);
    }
    return options.default;
  }
  
  // Type checking
  if (options.type && typeof param !== options.type) {
    if (options.type === 'number' && typeof param === 'string') {
      try {
        param = Number(param);
      } catch (e) {
        throw new ValidationError(`Parameter ${name} must be a ${options.type}`);
      }
    } else {
      throw new ValidationError(`Parameter ${name} must be a ${options.type}`);
    }
  }
  
  // Range checking
  if (options.min !== undefined && param < options.min) {
    throw new ValidationError(`Parameter ${name} must be at least ${options.min}`);
  }
  
  if (options.max !== undefined && param > options.max) {
    throw new ValidationError(`Parameter ${name} must be at most ${options.max}`);
  }
  
  // Address validation for Ethereum addresses
  if (options.isAddress && !ethers.isAddress(param)) {
    throw new ValidationError(`Parameter ${name} must be a valid Ethereum address`);
  }
  
  return param;
}

class AvalancheIntegration {
  constructor(config = {}) {
    // Validate configuration parameters (Wasmlanche principle)
    try {
      this.config = {
        rpcUrl: validateParameter(config.rpcUrl, 'rpcUrl', { 
          type: 'string', 
          default: 'https://api.avax.network/ext/bc/C/rpc' 
        }),
        useTestnet: validateParameter(config.useTestnet, 'useTestnet', { 
          type: 'boolean', 
          default: false 
        }),
        batchAuctionDexAddress: validateParameter(config.batchAuctionDexAddress, 'batchAuctionDexAddress', { 
          type: 'string', 
          isAddress: true,
          default: avalancheConfig.contracts.batchAuctionDex 
        }),
        eerc20TokenAddresses: validateParameter(config.eerc20TokenAddresses, 'eerc20TokenAddresses', { 
          default: avalancheConfig.contracts.eerc20Tokens || {} 
        }),
        ...config
      };
    } catch (error) {
      console.error('Configuration validation error:', error.message);
      // Provide safe defaults
      this.config = {
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        useTestnet: false
      };
    }
    
    // Set up provider with safe error handling
    try {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    } catch (error) {
      console.error('Failed to create Avalanche provider:', error.message);
      this.provider = null;
    }
    
    // Contract instances
    this.batchDexContract = null;
    this.eerc20Contracts = {};
    
    // Initialize components
    this.privacyPools = new PrivacyLiquidityPools(this.provider);
    this.walletConnector = new AvalancheWalletConnector();
    this.optimizer = new AvalancheOptimizer(this.provider);
    this.networkMonitor = new AvalancheNetworkMonitor(this.provider);
    
    // Batch auction tracking
    this.currentBatchId = null;
    this.currentBatchDeadline = null;
    this.ordersByBatch = new Map();
    this.zkProofCache = new Map();
    
    this.initialized = false;
  }
  
  /**
   * Initialize all Avalanche ecosystem integrations
   * Implements secure parameter handling following Wasmlanche principles
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Check if connected to Avalanche - ethers v6 network format 
      if (this.provider) {
        const network = await this.provider.getNetwork();
        // In ethers v6, chainId is a bigint, so we need to convert it
        const chainId = Number(network.chainId);
        
        if (chainId !== (this.config.useTestnet ? 43113 : 43114)) {
          console.warn(`Connected to chain ${chainId}, but expected Avalanche ${this.config.useTestnet ? 'Testnet' : 'Mainnet'}`);
          return false;
        }
        
        // Initialize DEX contract with safe parameter handling
        try {
          // Validate contract address before attempting connection
          const dexAddress = validateParameter(
            this.config.batchAuctionDexAddress, 
            'batchAuctionDexAddress', 
            { type: 'string', isAddress: true, required: true }
          );
          
          this.batchDexContract = new ethers.Contract(
            dexAddress,
            BatchAuctionDEXAbi,
            this.provider
          );
          
          // Validate that the contract responds to the expected methods
          await this.batchDexContract.batchId();
          
          // Initialize EERC20 token contracts
          await this._initializeEERC20Contracts();
          
          // Start tracking current batch
          await this._updateCurrentBatch();
          
          // Set up event listeners for batch updates
          this._setupEventListeners();
          
        } catch (error) {
          console.error('Failed to initialize BatchAuctionDEX contract:', error.message);
          // Return error but continue initialization to allow other functionality
        }
        
        // Initialize privacy pools with error handling
        try {
          await this.privacyPools.initialize();
        } catch (error) {
          console.error('Failed to initialize privacy pools:', error.message);
        }
      } else {
        console.error('Provider not available');
        return false;
      }
      // Monitor Avalanche block times to optimize parameters
      await this.optimizer.monitorBlockTimes();
      
      this.initialized = true;
      console.log('Avalanche ecosystem integration initialized successfully');
      
      return {
        isAvalanche: true, // Fixed the undefined reference
        networkId: chainId,
        blockTimeStats: await this.optimizer.monitorBlockTimes(),
        recommendedSettings: this.optimizer.getRecommendedSettings()
      };
    } catch (error) {
      console.error('Failed to initialize Avalanche integration:', error);
      throw error;
    }
  }
  
  /**
   * Get liquidity from privacy-preserving pools
   * These pools maintain the encrypted nature of EERC20 tokens
   * @param {string} tokenA - First token in pair (EERC20)
   * @param {string} tokenB - Second token in pair (EERC20 or standard ERC20)
   * @param {ethers.BigNumber} requiredLiquidity - Amount of liquidity needed
   * @returns {Promise<Object>} Liquidity information
   */
  async getPrivacyPoolLiquidity(tokenA, tokenB, requiredLiquidity) {
    if (!this.initialized) await this.initialize();
    
    // Parameter validation (following Wasmlanche principles)
    if (!tokenA || !tokenB) {
      console.warn('Invalid token addresses in getPrivacyPoolLiquidity');
      return { success: false, error: 'Invalid token addresses' };
    }
    
    try {
      // Get a swap quote from the privacy pools
      return await this.privacyPools.getSwapQuote(tokenA, tokenB, requiredLiquidity);
    } catch (error) {
      console.error('Error getting privacy pool liquidity:', error.message);
      // Return empty but properly formatted result (per Wasmlanche memory)
      return {
        success: false,
        error: error.message,
        amountOut: ethers.BigNumber.from(0),
        priceImpact: 100
      };
    }
  }
  
  /**
   * Create a new privacy-preserving liquidity pool for EERC20 tokens
   * @param {string} tokenA - First token (EERC20)
   * @param {string} tokenB - Second token (EERC20 or standard ERC20)
   * @param {Object} options - Pool creation options
   * @returns {Promise<Object>} Pool information
   */
  async createPrivacyPool(tokenA, tokenB, options = {}) {
    if (!this.initialized) await this.initialize();
    
    // Validate parameters (safe parameter handling)
    if (!tokenA || !tokenB) {
      console.warn('Invalid token addresses in createPrivacyPool');
      return { success: false, error: 'Invalid token addresses' };
    }
    
    // Create the pool with proper error handling
    try {
      const pool = await this.privacyPools.createPool(tokenA, tokenB, options);
      return { success: true, pool };
    } catch (error) {
      console.error('Error creating privacy pool:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Bridge between encrypted EERC20 tokens and standard ERC20 tokens
   * This allows for interoperability with the wider Avalanche ecosystem
   * @param {string} eerc20Token - EERC20 token address
   * @param {string} standardToken - Standard ERC20 token address
   * @param {boolean} isWrapping - True for EERC20->ERC20, false for ERC20->EERC20
   * @param {ethers.BigNumber} amount - Amount to bridge
   * @param {string} userAddress - User's address
   * @returns {Promise<Object>} Transaction result
   */
  async bridgeTokens(eerc20Token, standardToken, isWrapping, amount, userAddress) {
    if (!this.initialized) await this.initialize();
    return this.privacyPools.bridgeTokens(
      eerc20Token, 
      standardToken, 
      isWrapping, 
      amount, 
      userAddress
    );
  }
  
  /**
   * Get an estimate of gas costs on Avalanche for a transaction
   * @param {Object} transaction - Transaction to estimate
   * @param {string} priorityLevel - Priority level (low, standard, high, urgent)
   * @returns {Promise<Object>} Gas estimation
   */
  async estimateGasCosts(transaction, priorityLevel = 'standard') {
    if (!this.initialized) await this.initialize();
    
    // Validate parameter to prevent unreasonable inputs (per Wasmlanche memory)
    if (!transaction || typeof transaction !== 'object') {
      console.warn('Invalid transaction parameter in estimateGasCosts');
      return {
        error: 'Invalid transaction parameter',
        gasEstimate: ethers.getBigInt(0),
        gasCost: ethers.getBigInt(0),
        gasCostInAvax: '0',
        fiatCost: 0
      };
    }
    
    try {
      // Get Avalanche network-aware gas parameters
      const gasSettings = this.networkMonitor.getRecommendedGasSettings({ priorityLevel });
      
      // Estimate gas
      const gasEstimate = await this.provider.estimateGas(transaction);
      
      // Calculate costs in AVAX - ethers v6 BigInt operations
      const gasCost = gasEstimate * BigInt(gasSettings.gasPrice);
      const gasCostInAvax = ethers.formatEther(gasCost);
      
      // Return with network state information
      const networkState = this.networkMonitor.getNetworkState();
      
      return {
        gasEstimate,
        gasCost,
        gasCostInAvax,
        gasPriceGwei: gasSettings.gasPriceGwei,
        priorityLevel,
        estimatedConfirmationBlocks: gasSettings.estimatedConfirmationBlocks,
        estimatedConfirmationTime: gasSettings.estimatedConfirmationBlocks * networkState.blockTime,
        networkCongestion: networkState.congestionLevel,
        networkCongestionDescription: networkState.congestionDescription,
        avaxPrice: '$45.00', // This would be fetched from an oracle in production
        fiatCost: parseFloat(gasCostInAvax) * 45.00
      };
    } catch (error) {
      console.error('Error estimating gas costs:', error.message);
      // Return properly formatted error object per Wasmlanche memory
      return {
        error: error.message,
        gasEstimate: ethers.getBigInt(0),
        gasCost: ethers.getBigInt(0),
        gasCostInAvax: '0',
        fiatCost: 0
      };
    }
  }
  
  /**
   * Get a Web3 provider optimized for Avalanche
   * @param {Object} options - Provider options
   * @returns {ethers.providers.Provider} Configured provider
   */
  getProvider(options = {}) {
    // Return existing provider if no specific options
    if (Object.keys(options).length === 0) return this.provider;
    
    // Create a custom provider with options
    return new ethers.providers.JsonRpcProvider(
      options.rpcUrl || this.config.rpcUrl
    );
  }
  
  /**
   * Batch multiple transactions together for efficient processing on Avalanche
   * Leverages Avalanche's higher throughput
   * @param {Array<Function>} txFunctions - Array of transaction-generating functions
   * @returns {Promise<Array>} Transaction results
   */
  async batchProcessTransactions(txFunctions) {
    if (!this.initialized) await this.initialize();
    return this.optimizer.batchProcess(txFunctions);
  }
  
  /**
   * Get recommendations for Avalanche-optimized settings
   * Based on current network conditions
   */
  getOptimizedSettings() {
    // Get optimizer settings
    const optimizerSettings = this.optimizer.getRecommendedSettings();
    
    // Get network-aware settings
    const networkSettings = this.networkMonitor.getRecommendedBatchSettings();
    
    // Combine the recommendations, preferring the network monitor's more accurate data
    return {
      ...optimizerSettings,
      ...networkSettings,
      // Include network state information
      networkState: this.networkMonitor.getNetworkState()
    };
  }
  
  /**
   * Get detailed network statistics and performance metrics
   * Useful for monitoring and debugging Avalanche-specific behaviors
   */
  getNetworkStatistics() {
    return {
      networkState: this.networkMonitor.getNetworkState(),
      recommendedSettings: this.networkMonitor.getRecommendedBatchSettings(),
      recommendedGasSettings: this.networkMonitor.getRecommendedGasSettings(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Connect to an Avalanche wallet
   * @param {string} walletType - Type of wallet to connect
   * @returns {Promise<Object>} Connection result
   */
  async connectWallet(walletType = null) {
    return this.walletConnector.connect(walletType);
  }
  
  /**
   * Get the current wallet state
   */
  getWalletState() {
    return this.walletConnector.getState();
  }
  
  /**
   * Initialize EERC20 token contracts with safe parameter handling
   * @private
   */
  async _initializeEERC20Contracts() {
    try {
      // Get token addresses with validation
      const tokenAddresses = this.config.eerc20TokenAddresses;
      
      // Check that we have at least one token
      if (!tokenAddresses || Object.keys(tokenAddresses).length === 0) {
        console.warn('No EERC20 token addresses provided');
        return;
      }
      
      // Initialize each token contract with validation
      for (const [symbol, address] of Object.entries(tokenAddresses)) {
        try {
          // Validate the address
          const validatedAddress = validateParameter(address, `eerc20Address_${symbol}`, {
            type: 'string',
            isAddress: true,
            required: true
          });
          
          // Create contract instance
          const contract = new ethers.Contract(validatedAddress, EERC20Abi, this.provider);
          
          // Validate that the contract responds to expected methods
          await contract.symbol();
          
          // Store the contract instance
          this.eerc20Contracts[symbol] = contract;
          
          console.log(`Initialized EERC20 token: ${symbol} at ${address}`);
        } catch (error) {
          console.error(`Failed to initialize EERC20 token ${symbol}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Failed to initialize EERC20 contracts:', error.message);
      // Return empty contracts object as fallback
      this.eerc20Contracts = {};
    }
  }
  
  /**
   * Update current batch information
   * @private
   */
  async _updateCurrentBatch() {
    try {
      if (!this.batchDexContract) return null;
      
      // Get current batch ID with bounds checking
      const batchId = await this.batchDexContract.batchId();
      this.currentBatchId = Number(batchId); // Convert from BigInt
      
      // Get batch deadline
      const deadline = await this.batchDexContract.batchDeadline();
      this.currentBatchDeadline = new Date(Number(deadline) * 1000); // Convert from timestamp
      
      return {
        id: this.currentBatchId,
        deadline: this.currentBatchDeadline
      };
    } catch (error) {
      console.error('Failed to update current batch:', error.message);
      return null;
    }
  }
  
  /**
   * Set up event listeners for batch updates
   * @private
   */
  _setupEventListeners() {
    if (!this.batchDexContract) return;
    
    // Listen for new batch events
    this.batchDexContract.on('NewBatch', async (batchId) => {
      // Update current batch information
      await this._updateCurrentBatch();
      console.log('New batch started:', Number(batchId));
    });
    
    // Listen for batch settlement events
    this.batchDexContract.on('BatchSettled', async (batchId) => {
      console.log('Batch settled:', Number(batchId));
    });
  }
  
  /**
   * Get current batch information with safe error handling
   */
  async getCurrentBatch() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      await this._updateCurrentBatch();
      
      if (!this.currentBatchId) {
        return {
          id: 0,
          timeRemaining: '00:00',
          status: 'unknown'
        };
      }
      
      // Calculate time remaining
      const now = new Date();
      const timeRemainingMs = Math.max(0, this.currentBatchDeadline - now);
      const secondsRemaining = Math.floor(timeRemainingMs / 1000);
      
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      const timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Determine batch status
      let status = 'active';
      if (secondsRemaining <= 0) {
        status = 'settling';
      }
      
      // Get orders count - with bounds checking
      const activeOrders = this.ordersByBatch.get(this.currentBatchId) || [];
      const activeOrdersCount = Math.min(activeOrders.length, SAFE_LIMITS.MAX_BATCH_SIZE);
      
      return {
        id: this.currentBatchId,
        timeRemaining,
        ordersCount: activeOrdersCount,
        deadline: this.currentBatchDeadline,
        status
      };
    } catch (error) {
      console.error('Failed to get current batch:', error.message);
      // Return safe fallback value
      return {
        id: 0,
        timeRemaining: '00:00',
        ordersCount: 0,
        status: 'error'
      };
    }
  }
  
  /**
   * Create encrypted amount for EERC20 token with safe parameter handling
   * @param {string} amount - The amount to encrypt (decimal string)
   * @param {number} decimals - Token decimals
   */
  async createEncryptedAmount(amount, decimals = 18) {
    try {
      // Validate parameters (Wasmlanche principle)
      const validAmount = validateParameter(amount, 'amount', {
        required: true
      });
      
      const validDecimals = validateParameter(decimals, 'decimals', {
        type: 'number',
        min: 0,
        max: 30,
        default: 18
      });
      
      // Convert amount to BigInt safely
      let bigAmount;
      try {
        bigAmount = ethers.parseUnits(validAmount, validDecimals);
      } catch (error) {
        throw new ValidationError(`Invalid amount format: ${validAmount}`);
      }
      
      // Check that amount is within safe limits
      if (bigAmount > SAFE_LIMITS.MAX_TOKEN_AMOUNT) {
        throw new ValidationError(`Amount exceeds maximum allowed: ${ethers.formatUnits(SAFE_LIMITS.MAX_TOKEN_AMOUNT, validDecimals)}`);
      }
      
      // In a real implementation, we would use a library to encrypt the amount
      // For now, we'll simulate encryption by encoding the amount with a mock function
      const encryptedAmount = await zkUtils.encryptAmount(bigAmount.toString());
      
      // Ensure the encrypted data is within size limits
      if (encryptedAmount.length > SAFE_LIMITS.MAX_ENCRYPTED_DATA_SIZE) {
        throw new ValidationError('Encrypted data exceeds maximum allowed size');
      }
      
      // Debug logging as per Wasmlanche principles
      console.log('Created encrypted amount:', {
        originalAmount: validAmount,
        decimals: validDecimals,
        encryptedDataSize: encryptedAmount.length
      });
      
      return encryptedAmount;
    } catch (error) {
      console.error('Failed to create encrypted amount:', error.message);
      // Return empty result instead of throwing
      return new Uint8Array(0);
    }
  }
  
  /**
   * Generate ZK proof for sufficient balance with safe parameter handling
   * @param {string} tokenAddress - The token address
   * @param {string} amount - The amount to prove (decimal string)
   * @param {string} userAddress - The user's address
   */
  async generateZkProof(tokenAddress, amount, userAddress) {
    try {
      // Validate parameters (Wasmlanche principle)
      const validTokenAddress = validateParameter(tokenAddress, 'tokenAddress', {
        type: 'string',
        isAddress: true,
        required: true
      });
      
      const validUserAddress = validateParameter(userAddress, 'userAddress', {
        type: 'string',
        isAddress: true,
        required: true
      });
      
      const validAmount = validateParameter(amount, 'amount', {
        required: true
      });
      
      // Create unique key for caching
      const cacheKey = `${validUserAddress}-${validTokenAddress}-${validAmount}`;
      
      // Check if we already have a generated proof for this input
      if (this.zkProofCache.has(cacheKey)) {
        return this.zkProofCache.get(cacheKey);
      }
      
      // In a real implementation, we would generate a ZK proof here
      // For now, simulate ZK proof generation using the zkUtils module
      const zkProof = await zkUtils.generateProof(validUserAddress, validTokenAddress, validAmount);
      
      // Ensure the proof is within size limits
      if (zkProof.length > SAFE_LIMITS.MAX_ZK_PROOF_SIZE) {
        throw new ValidationError('ZK proof exceeds maximum allowed size');
      }
      
      // Cache the proof
      this.zkProofCache.set(cacheKey, zkProof);
      
      // Debug logging as per Wasmlanche principles
      console.log('Generated ZK proof:', {
        userAddress: validUserAddress,
        tokenAddress: validTokenAddress,
        proofSize: zkProof.length
      });
      
      return zkProof;
    } catch (error) {
      console.error('Failed to generate ZK proof:', error.message);
      // Return empty proof instead of throwing
      return new Uint8Array(0);
    }
  }
  
  /**
   * Submit order to batch auction DEX with safe parameter handling
   * @param {Object} params - Order parameters
   */
  async submitOrder(params) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate parameters (Wasmlanche principle)
      const tokenA = validateParameter(params.tokenA, 'tokenA', {
        type: 'string',
        isAddress: true,
        required: true
      });
      
      const tokenB = validateParameter(params.tokenB, 'tokenB', {
        type: 'string',
        isAddress: true,
        required: true
      });
      
      const orderType = validateParameter(params.orderType, 'orderType', {
        type: 'number',
        min: 0, // 0 = BUY, 1 = SELL
        max: 1,
        required: true
      });
      
      const amount = validateParameter(params.amount, 'amount', {
        required: true
      });
      
      const price = validateParameter(params.price, 'price', {
        required: true
      });
      
      // Ensure we have a signer
      const signer = await this.walletConnector.getSigner();
      if (!signer) {
        throw new ValidationError('Wallet not connected');
      }
      
      const userAddress = await signer.getAddress();
      
      // Create encrypted amount
      const encryptedAmount = await this.createEncryptedAmount(amount);
      if (encryptedAmount.length === 0) {
        throw new ValidationError('Failed to create encrypted amount');
      }
      
      // Generate ZK proof
      const sourceToken = orderType === 0 ? tokenB : tokenA; // If BUY, we spend tokenB, else tokenA
      const zkProof = await this.generateZkProof(sourceToken, amount, userAddress);
      if (zkProof.length === 0) {
        throw new ValidationError('Failed to generate ZK proof');
      }
      
      // Create pair ID (tokenA + tokenB)
      const pairId = ethers.solidityPackedKeccak256(
        ['address', 'address'],
        [tokenA, tokenB]
      );
      
      // Connect contract with signer
      const dexWithSigner = this.batchDexContract.connect(signer);
      
      // Submit order to the contract
      const tx = await dexWithSigner.submitOrder(
        pairId,
        orderType,
        ethers.parseUnits(price, 18), // publicPrice
        encryptedAmount,
        zkProof
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Extract order ID from events
      const orderCreatedEvent = receipt.logs.find(
        log => log.topics[0] === dexWithSigner.interface.getEvent('OrderCreated').topicHash
      );
      
      let orderId = null;
      if (orderCreatedEvent) {
        const decodedEvent = dexWithSigner.interface.decodeEventLog(
          'OrderCreated',
          orderCreatedEvent.data,
          orderCreatedEvent.topics
        );
        orderId = decodedEvent.orderId;
      }
      
      // Track the order in our local state
      if (orderId) {
        const order = {
          id: orderId,
          batchId: this.currentBatchId,
          tokenA,
          tokenB,
          orderType,
          amount,
          price,
          status: 'pending',
          timestamp: Date.now()
        };
        
        // Add to batch orders map
        if (!this.ordersByBatch.has(this.currentBatchId)) {
          this.ordersByBatch.set(this.currentBatchId, []);
        }
        this.ordersByBatch.get(this.currentBatchId).push(order);
      }
      
      // Debug logging as per Wasmlanche principles
      console.log('Order submitted:', {
        orderId,
        batchId: this.currentBatchId,
        pairId,
        orderType: orderType === 0 ? 'BUY' : 'SELL',
        txHash: receipt.hash
      });
      
      return {
        success: true,
        orderId,
        batchId: this.currentBatchId,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('Failed to submit order:', error.message);
      // Return error result instead of throwing
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get active orders for the current batch with safe parameter handling
   */
  async getActiveOrders() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Update current batch to ensure we have the latest
      await this._updateCurrentBatch();
      
      if (!this.currentBatchId) {
        return [];
      }
      
      // Get orders from local state with bounds checking
      const activeOrders = this.ordersByBatch.get(this.currentBatchId) || [];
      
      // Ensure we don't return too many orders (Wasmlanche principle)
      return activeOrders.slice(0, SAFE_LIMITS.MAX_BATCH_SIZE);
    } catch (error) {
      console.error('Failed to get active orders:', error.message);
      // Return empty array instead of throwing
      return [];
    }
  }
}

export default AvalancheIntegration;
