/**
 * WalletConnector Adapter
 * 
 * Adapts the backend WalletConnector for use in the frontend following
 * Wasmlanche safe parameter handling principles.
 */
import { ethers } from 'ethers';

class WalletConnectorAdapter {
  constructor(config = {}) {
    this.config = config;
    this.provider = null;
    this.signer = null;
    this.address = null;
  }

  /**
   * Connect to a wallet using Metamask/Web3 provider
   * Implements safe parameter handling following Wasmlanche principles
   */
  async connect() {
    try {
      // Safe parameter bounds checking
      if (!window.ethereum) {
        throw new Error('No Web3 provider detected. Please install Metamask or another wallet');
      }

      // Request accounts with proper error handling
      let accounts;
      try {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
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
        throw new Error('No accounts returned from provider');
      }

      // Get user's address with bounds checking
      const address = accounts[0];
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address format received from wallet');
      }

      // Create ethers provider and signer with validation
      const provider = new ethers.BrowserProvider(window.ethereum);
      if (!provider) {
        throw new Error('Failed to create provider');
      }

      const signer = await provider.getSigner();
      if (!signer) {
        throw new Error('Failed to get signer');
      }

      // Get chain ID with bounds checking
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Bounds check for chainId (Wasmlanche principle)
      if (isNaN(chainId) || chainId <= 0 || chainId > 2147483647) {
        throw new Error('Invalid chain ID');
      }

      // Debug logging (Wasmlanche principle)
      console.log('Wallet connected:', {
        address: address,
        chainId: chainId,
        networkName: network.name
      });

      // Store connection
      this.provider = provider;
      this.signer = signer;
      this.address = address;

      return {
        success: true,
        provider,
        signer,
        address,
        chainId
      };
    } catch (error) {
      console.error('Wallet connection error:', error);
      
      // Return empty results instead of throwing (Wasmlanche principle)
      return {
        success: false,
        error: error.message || 'Failed to connect wallet',
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
    try {
      if (!this.provider) return false;
      
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Avalanche C-Chain has chainId 43114
      return chainId === 43114;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  }
}

export default WalletConnectorAdapter;
