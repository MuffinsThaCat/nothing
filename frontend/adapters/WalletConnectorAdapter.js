/**
 * WalletConnector Adapter
 * 
 * Adapts the backend WalletConnector for use in the frontend following
 * Wasmlanche safe parameter handling principles:
 * - Strict parameter validation with bounds checking
 * - Returns empty results instead of throwing exceptions
 * - Comprehensive debug logging
 * - Safe data copy and validation
 */
import { ethers } from 'ethers';

class WalletConnectorAdapter {
  constructor(config = {}) {
    this.config = config;
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.initialized = false;
  }
  
  /**
   * Initialize wallet connector with safe parameter validation
   * @param {Object} provider - Optional provider to use
   * @param {Object} options - Additional options
   * @return {Promise<boolean>} Success status
   */
  async initialize(provider = null, options = {}) {
    console.log('Initializing WalletConnectorAdapter with safe parameter handling...');
    
    try {
      // Use provided provider or window.ethereum with validation
      if (provider) {
        this.provider = provider;
      } else if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        console.warn('No provider available for initialization');
        return false;
      }
      
      // Give wallet demo balances for testing
      this.mockBalances = {
        '0x1111111111111111111111111111111111111111': ethers.parseUnits('1000', 18).toString(),
        '0x2222222222222222222222222222222222222222': ethers.parseUnits('2000', 18).toString(),
        '0x3333333333333333333333333333333333333333': ethers.parseUnits('3000', 18).toString(),
      };
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing wallet connector:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Connect to a wallet using Metamask/Web3 provider
   * Implements safe parameter handling following Wasmlanche principles
   */
  async connect() {
    console.log('Attempting to connect wallet...');
    
    try {
      // Safe parameter bounds checking
      if (!window.ethereum) {
        console.warn('No Web3 provider detected');
        return {
          success: false,
          error: 'No Web3 provider detected. Please install Metamask or another wallet',
          provider: null,
          signer: null,
          address: null,
          chainId: null
        };
      }

      // Request accounts with proper error handling
      let accounts;
      try {
        console.log('Requesting accounts from wallet...');
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('Accounts received:', accounts ? accounts.length : 0);
      } catch (error) {
        console.error('Account request error:', error);
        // Return properly formatted error (Wasmlanche principle)
        return {
          success: false,
          error: error.message || 'Failed to request accounts',
          provider: null,
          signer: null,
          address: null,
          chainId: null
        };
      }

      // Validate results (Wasmlanche principle: parameter validation)
      if (!accounts || accounts.length === 0) {
        console.warn('No accounts returned from provider');
        return {
          success: false,
          error: 'No accounts returned from provider',
          provider: null,
          signer: null,
          address: null,
          chainId: null
        };
      }

      // Get user's address with bounds checking
      const address = accounts[0];
      console.log('Using address:', address);
      
      try {
        // Address validation - ethers v6 changes
        if (!address || typeof address !== 'string' || address.length !== 42 || !address.startsWith('0x')) {
          throw new Error('Invalid address format received from wallet');
        }
        
        console.log('Creating BrowserProvider...');
        // Create ethers provider with validation
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        console.log('Getting signer...');
        // Get signer with timeout for resilience
        let signer;
        try {
          signer = await Promise.race([
            provider.getSigner(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Signer request timeout')), 10000))
          ]);
        } catch (error) {
          console.error('Error getting signer:', error);
          return {
            success: false,
            error: 'Failed to get wallet signer: ' + error.message,
            provider,
            signer: null,
            address,
            chainId: null
          };
        }
        
        console.log('Getting network...');
        // Get chain ID with bounds checking and timeout
        let chainId;
        try {
          const network = await Promise.race([
            provider.getNetwork(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Network request timeout')), 10000))
          ]);
          chainId = Number(network.chainId);
      
          // Bounds check for chainId (Wasmlanche principle)
          if (isNaN(chainId) || chainId <= 0 || chainId > 2147483647) {
            console.warn('Invalid chain ID:', chainId);
            return {
              success: false,
              error: 'Invalid chain ID received from network',
              provider,
              signer,
              address,
              chainId: null
            };
          }

          // Debug logging (Wasmlanche principle)
          console.log(`Connected to wallet. Address: ${address}, Chain ID: ${chainId}`);

          // Store connection information
          this.provider = provider;
          this.signer = signer;
          this.address = address;

          // Return successful connection with validated data
          return {
            success: true,
            provider,
            signer,
            address,
            chainId
          };
        } catch (error) {
          console.error('Network error:', error);
          return {
            success: false,
            error: error.message || 'Failed to get network information',
            provider,
            signer,
            address,
            chainId: null
          };
        }
      } catch (error) {
        console.error('Address validation or signer error:', error);
        return {
          success: false,
          error: error.message || 'Failed to validate address or get signer',
          provider: null,
          signer: null,
          address,
          chainId: null
        };
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      // Reset state and return error - applying Wasmlanche principles
      this.provider = null;
      this.signer = null;
      this.address = null;
      
      // Return formatted error (Wasmlanche principle - return empty results instead of exceptions)
      return {
        success: false,
        error: error.message || 'Unknown wallet connection error',
        provider: null,
        signer: null,
        address: null,
        chainId: null
      };
    }
  }

  /**
   * Disconnect the wallet
   */
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    
    return { success: true };
  }

  /**
   * Check if wallet is connected to Avalanche C-Chain
   */
  async isConnectedToAvalanche() {
    if (!this.provider) {
      return { connected: false, error: 'No provider' };
    }
    
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Avalanche C-Chain IDs: 43114 (mainnet), 43113 (Fuji testnet)
      const isAvalanche = chainId === 43114 || chainId === 43113;
      
      return { 
        connected: isAvalanche,
        chainId,
        networkName: network.name
      };
    } catch (error) {
      console.error('Network check error:', error);
      return { connected: false, error: error.message };
    }
  }
}

export default WalletConnectorAdapter;
