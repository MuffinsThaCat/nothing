/**
 * Registrar Service
 * 
 * Handles interaction with the Registrar contract for privacy-preserving operations
 * Implements Wasmlanche safe parameter handling principles
 */
import { ethers } from 'ethers';
import { contracts } from '../config/contracts.js';

/**
 * Get the Registrar contract instance
 * @param {ethers.Provider} provider - The Ethereum provider
 * @param {ethers.Signer} signer - Signer for transactions
 * @return {Promise<ethers.Contract>} Registrar contract instance
 */
export async function getRegistrarContract(provider, signer) {
  try {
    // Following Wasmlanche safe parameter handling principles
    if (!provider) {
      console.error('Missing provider for Registrar contract');
      return null;
    }
    
    // Get contract config - already imported
    
    // Validate contract address - Wasmlanche principle
    if (!contracts.Registrar || !ethers.isAddress(contracts.Registrar)) {
      console.error('Invalid Registrar contract address');
      return null;
    }
    
    // Determine whether to use readonly or writable contract
    const contractSigner = signer || provider;
    
    // Load Registrar ABI
    const registrarAbi = [
      'function registerUser(bytes calldata publicKey) external',
      'function isRegistered(address user) external view returns (bool)',
      'function getPublicKey(address user) external view returns (bytes memory)',
      'function setAuditor(address _auditor) external',
      'function auditor() external view returns (address)'
    ];
    
    // Create contract instance
    return new ethers.Contract(
      contracts.Registrar,
      registrarAbi,
      contractSigner
    );
  } catch (error) {
    console.error('Error getting Registrar contract:', error);
    return null;
  }
}

/**
 * Check if a user is registered with the privacy system
 * @param {ethers.Provider} provider - The Ethereum provider
 * @param {string} address - User address to check
 * @return {Promise<boolean>} Whether the user is registered
 */
export async function isUserRegistered(provider, address) {
  try {
    // Parameter validation (Wasmlanche principle)
    if (!provider || !address || !ethers.isAddress(address)) {
      console.error('Invalid parameters for isUserRegistered');
      return false;
    }
    
    const registrar = await getRegistrarContract(provider);
    
    if (!registrar) {
      return false;
    }
    
    return await registrar.isRegistered(address);
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false;
  }
}

/**
 * Register a user with the privacy system
 * @param {ethers.Signer} signer - Signer for the transaction
 * @param {Uint8Array} publicKey - User's public key for encryption
 * @return {Promise<boolean>} Success status
 */
export async function registerUser(signer, publicKey) {
  try {
    // Parameter validation (Wasmlanche principle)
    if (!signer) {
      console.error('Missing signer for user registration');
      return false;
    }
    
    if (!publicKey || !(publicKey instanceof Uint8Array)) {
      console.error('Invalid public key format');
      return false;
    }
    
    const provider = signer.provider;
    const registrar = await getRegistrarContract(provider, signer);
    
    if (!registrar) {
      return false;
    }
    
    // Check if already registered
    const userAddress = await signer.getAddress();
    const alreadyRegistered = await registrar.isRegistered(userAddress);
    
    if (alreadyRegistered) {
      console.log('User already registered with privacy system');
      return true;
    }
    
    // Register user with their public key
    console.log('Registering user with privacy system...');
    const tx = await registrar.registerUser(publicKey);
    await tx.wait();
    
    console.log('User successfully registered with privacy system');
    return true;
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
}

export default {
  getRegistrarContract,
  isUserRegistered,
  registerUser
};
