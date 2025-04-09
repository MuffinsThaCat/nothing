/**
 * Avalanche Wallet Connector
 * 
 * Provides integration with popular Avalanche-compatible wallets including:
 * - Core Wallet (Avalanche's official wallet)
 * - MetaMask (with Avalanche configuration)
 * - Rabby Wallet
 * - WalletConnect v2
 */
import { ethers } from 'ethers';
import avalancheConfig from '../../config/avalancheConfig.js';

// Metadata for wallet detection and configuration
const AVALANCHE_WALLET_CONFIG = {
  chainId: `0x${avalancheConfig.network.chainId.toString(16)}`, // Hex format required by wallets
  chainName: 'Avalanche C-Chain',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18
  },
  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://snowtrace.io/']
};

// Wallet detection signatures (allows detecting specific wallet injectors)
const WALLET_SIGNATURES = {
  CORE_WALLET: {
    check: () => typeof window !== 'undefined' && typeof window.avalanche !== 'undefined',
    name: 'Core Wallet'
  },
  META_MASK: {
    check: () => typeof window !== 'undefined' && typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask,
    name: 'MetaMask'
  },
  RABBY: {
    check: () => typeof window !== 'undefined' && typeof window.ethereum !== 'undefined' && window.ethereum.isRabby,
    name: 'Rabby'
  }
};

class AvalancheWalletConnector {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.walletType = null;
    this.isConnected = false;
    this.address = null;
    this.chainId = null;
  }

  /**
   * Detect available Avalanche-compatible wallets
   * @returns {Array<Object>} List of available wallets
   */
  detectWallets() {
    const availableWallets = [];

    // Browser environment check
    if (typeof window === 'undefined') {
      return availableWallets;
    }

    // Check for each supported wallet
    Object.entries(WALLET_SIGNATURES).forEach(([id, wallet]) => {
      if (wallet.check()) {
        availableWallets.push({
          id,
          name: wallet.name
        });
      }
    });

    return availableWallets;
  }

  /**
   * Connect to specified wallet type
   * @param {string} walletType - Wallet type to connect to (from detectWallets)
   * @returns {Promise<Object>} Connection result
   */
  async connect(walletType = null) {
    // Browser environment check
    if (typeof window === 'undefined') {
      throw new Error('Cannot connect to wallet outside of browser environment');
    }

    try {
      // Auto-detect if walletType not specified
      if (!walletType) {
        const available = this.detectWallets();
        if (available.length > 0) {
          walletType = available[0].id;
        } else {
          throw new Error('No supported wallets detected');
        }
      }

      let provider;

      // Handle Core Wallet specially (Avalanche's official wallet)
      if (walletType === 'CORE_WALLET' && window.avalanche) {
        // Core Wallet injects 'avalanche' object - ethers v6 uses BrowserProvider
        provider = new ethers.BrowserProvider(window.avalanche);
        this.walletType = 'CORE_WALLET';
      } 
      // Handle MetaMask and other EIP-1193 providers
      else if (window.ethereum) {
        // ethers v6 uses BrowserProvider instead of Web3Provider
        provider = new ethers.BrowserProvider(window.ethereum);
        this.walletType = walletType;
      } else {
        throw new Error('Wallet provider not found');
      }

      // Request access to the wallet - ethers v6 uses connect method
      try {
        // In ethers v6, we first connect then get the signer
        await provider.send('eth_requestAccounts', []);
      } catch (error) {
        console.warn('eth_requestAccounts not supported, using provider.connect()');
        // If the old method fails, try the new connect method
        await provider.connect();
      }
      
      // Get signer and address - ethers v6 getSigner is async
      this.provider = provider;
      this.signer = await provider.getSigner();
      this.address = await this.signer.getAddress();
      
      // Check if connected to Avalanche - in v6 chainId is bigint
      const network = await provider.getNetwork();
      this.chainId = Number(network.chainId);
      const isAvalanche = this.chainId === avalancheConfig.network.chainId;
      
      // If not on Avalanche, prompt to switch
      if (!isAvalanche) {
        await this.switchToAvalanche();
      }
      
      this.isConnected = true;
      
      return {
        address: this.address,
        chainId: this.chainId,
        walletType: this.walletType,
        isAvalanche: this.chainId === avalancheConfig.network.chainId
      };
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  }

  /**
   * Switch the connected wallet to Avalanche C-Chain
   * @returns {Promise<Boolean>} Success status
   */
  async switchToAvalanche() {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      // Try to switch to the Avalanche chain - in ethers v6 we send to provider directly
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: AVALANCHE_WALLET_CONFIG.chainId }
      ]);
      
      // Update chainId after switching
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
      
      return true;
    } catch (error) {
      // If the chain isn't added yet, add it first then switch
      // Code 4902 means the chain hasn't been added to MetaMask
      if (error.code === 4902) {
        try {
          await this.provider.send('wallet_addEthereumChain', [AVALANCHE_WALLET_CONFIG]);
          
          // Update chainId after adding and switching
          const network = await this.provider.getNetwork();
          this.chainId = Number(network.chainId);
          
          return true;
        } catch (addError) {
          console.error('Error adding Avalanche chain:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to Avalanche chain:', error);
        throw error;
      }
    }
  }

  /**
   * Get the current wallet state
   * @returns {Object} Current wallet state
   */
  getState() {
    return {
      isConnected: this.isConnected,
      address: this.address,
      chainId: this.chainId,
      walletType: this.walletType,
      isAvalanche: this.chainId === avalancheConfig.network.chainId
    };
  }

  /**
   * Disconnect the current wallet
   */
  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.walletType = null;
    this.isConnected = false;
    this.address = null;
    this.chainId = null;
  }
}

export default AvalancheWalletConnector;
