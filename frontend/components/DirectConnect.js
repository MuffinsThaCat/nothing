/**
 * Emergency direct wallet connection utility
 * This file has one job: Trigger the wallet connection popup
 */

/**
 * Connect to wallet with a direct approach
 * @return {Promise<object>} Connection result
 */
export async function directConnectWallet() {
  if (typeof window === 'undefined' || !window.ethereum) {
    return {
      success: false,
      error: 'No ethereum provider found'
    };
  }

  try {
    // Direct request to provider - should trigger popup
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts'
    });
    
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: 'No accounts returned'
      };
    }
    
    return {
      success: true,
      accounts: accounts,
      address: accounts[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Connection failed'
    };
  }
}

export default {
  directConnectWallet
};
