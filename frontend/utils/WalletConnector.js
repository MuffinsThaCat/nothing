/**
 * Universal Wallet Connect Utility
 * 
 * A direct, universal approach for connecting to any web3 wallet
 * Implements Wasmlanche safe parameter handling principles
 */

// Import ethers for provider creation
import { ethers } from 'ethers';

// Generic wallet connection handler that directly triggers wallet popup
export async function connectWallet() {
  console.log('🔐 Directly triggering wallet connection popup...');
  
  try {
    // Check if there's an ethereum provider in the window
    if (typeof window === 'undefined' || !window.ethereum) {
      console.error('Web3 wallet not detected');
      return { 
        success: false, 
        error: 'No Web3 wallet detected. Please install MetaMask or another provider.' 
      };
    }
    
    // DIRECT APPROACH: First use the raw ethereum provider to request accounts
    // This is the most reliable way to trigger the wallet popup
    console.log('Requesting accounts directly from ethereum provider...');
    
    // This line is critical - it will cause the wallet popup to appear
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Validate accounts array - Wasmlanche principle
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from wallet');
    }
    
    const address = accounts[0];
    console.log('Direct wallet connection successful:', address);
    
    // Now create the ethers provider and signer
    try {
      // Create provider after accounts are available
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      return { 
        success: true, 
        address,
        provider,
        signer
      };
    } catch (signerError) {
      console.warn('Failed to get signer, but account is available:', signerError.message);
      
      // Return the connection with just provider if signer fails
      const provider = new ethers.BrowserProvider(window.ethereum);
      return {
        success: true,
        address,
        provider
      };
    }
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to connect to wallet' 
    };
  }
}

export default { connectWallet };
