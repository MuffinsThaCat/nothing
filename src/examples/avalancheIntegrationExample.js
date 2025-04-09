/**
 * Avalanche Ecosystem Integration Example
 * 
 * Demonstrates how to use the EERC20 Batch DEX with Avalanche-specific integrations:
 * - Connecting to Avalanche wallets (Core Wallet support)
 * - Sourcing liquidity from Avalanche DEXes (Trader Joe, Pangolin)
 * - Optimizing for Avalanche's performance characteristics
 */

const { ethers } = require('ethers');
const AvalancheIntegration = require('../integration/avalanche');
const BatchSolver = require('../solver/BatchSolver');
const zkUtils = require('../solver/zkUtils');

// Safe parameter validation (applying Wasmlanche memory lessons)
function validateParams(params, maxSize = 1024) {
  // Check parameters exist
  if (!params) {
    console.warn('Empty parameters detected');
    return false;
  }
  
  // Validate size to prevent overflows
  const size = JSON.stringify(params).length;
  if (size > maxSize) {
    console.warn(`Parameter size (${size} bytes) exceeds maximum (${maxSize} bytes)`);
    return false;
  }
  
  return true;
}

async function runAvalancheExample() {
  try {
    console.log('Initializing Avalanche ecosystem integration...');
    
    // Create the integration
    const avalanche = new AvalancheIntegration({
      useTestnet: false // Set to true for Fuji testnet
    });
    
    // Initialize with proper error handling
    try {
      await avalanche.initialize();
    } catch (error) {
      console.error('Initialization error:', error.message);
      // Apply fallback handling per Wasmlanche memory lessons
      console.log('Using fallback RPC configuration...');
      // Retry with backup RPC
      await new AvalancheIntegration({
        rpcUrl: 'https://avalanche-c-chain.publicnode.com',
        useTestnet: false
      }).initialize();
    }
    
    // Get optimal batch settings for Avalanche
    const optimizedSettings = avalanche.getOptimizedSettings();
    console.log('Avalanche-optimized settings:', optimizedSettings);
    
    // Browser wallet connection example (would run in browser context)
    if (typeof window !== 'undefined') {
      // Detect available wallets
      const wallets = avalanche.walletConnector.detectWallets();
      console.log('Available Avalanche wallets:', wallets);
      
      // Check for Core Wallet specifically
      const hasCoreWallet = wallets.some(w => w.id === 'CORE_WALLET');
      if (hasCoreWallet) {
        console.log('Core Wallet detected! Connecting...');
        await avalanche.connectWallet('CORE_WALLET');
      } else {
        console.log('Connecting to available wallet...');
        await avalanche.connectWallet();
      }
      
      // Log wallet state
      const walletState = avalanche.getWalletState();
      console.log('Wallet connection state:', walletState);
    }
    
    // Batch processing example
    console.log('Demonstrating batch processing on Avalanche...');
    
    // Example DEX contract (placeholder in this example)
    const dexContract = { address: '0xDEXContractAddress' };
    
    // Example orders (in a real system, these would come from users)
    const exampleOrders = [
      { id: '1', type: 'BUY', price: 100, amount: ethers.utils.parseEther('1') },
      { id: '2', type: 'SELL', price: 99, amount: ethers.utils.parseEther('2') }
    ];
    
    // Create a batch solver with Avalanche-optimized config
    const batchSolver = new BatchSolver({
      chainId: optimizedSettings.chainId,
      batchDuration: optimizedSettings.batchDuration,
      maxOrdersPerBatch: optimizedSettings.maxOrdersPerBatch
    }, dexContract, avalanche.getProvider());
    
    // Define EERC20 tokens for privacy pools
    const eerc20TokenA = '0x1111111111111111111111111111111111111111'; // Example EERC20 token
    const eerc20TokenB = '0x2222222222222222222222222222222222222222'; // Example EERC20 token
    const standardTokenA = '0x3333333333333333333333333333333333333333'; // Standard ERC20 version
    
    // Perform safe parameter validation before proceeding (per Wasmlanche memory)
    if (!validateParams({ 
      eerc20TokenA, 
      eerc20TokenB,
      standardTokenA
    }, 2048)) {
      console.error('Invalid token parameters');
      return;
    }
    
    // Create a privacy pool for EERC20 tokens
    console.log('Creating privacy-preserving liquidity pool for EERC20 tokens...');
    try {
      const createPoolResult = await avalanche.createPrivacyPool(
        eerc20TokenA,
        eerc20TokenB,
        { isTokenBEncrypted: true }
      );
      
      if (createPoolResult.success) {
        console.log('Privacy pool created:', createPoolResult.pool.id);
        
        // Get liquidity quote from the privacy pool
        console.log('Getting liquidity from privacy-preserving pool...');
        const requiredLiquidity = ethers.utils.parseEther('10');
        const liquidityInfo = await avalanche.getPrivacyPoolLiquidity(
          eerc20TokenA,
          eerc20TokenB,
          requiredLiquidity
        );
        console.log('Privacy pool liquidity info:', liquidityInfo);
        
        // Demonstrate bridging between encrypted and standard tokens
        console.log('Demonstrating token bridging (EERC20 <-> ERC20)...');
        const userAddress = '0x0000000000000000000000000000000000000001';
        const bridgeAmount = ethers.utils.parseEther('5');
        
        // Wrapping example (EERC20 -> standard ERC20)
        const wrapResult = await avalanche.bridgeTokens(
          eerc20TokenA,
          standardTokenA,
          true, // isWrapping
          bridgeAmount,
          userAddress
        );
        console.log('Wrapped tokens result:', wrapResult);
        
        // Unwrapping example (standard ERC20 -> EERC20)
        const unwrapResult = await avalanche.bridgeTokens(
          eerc20TokenA,
          standardTokenA,
          false, // isWrapping (false = unwrapping)
          bridgeAmount,
          userAddress
        );
        console.log('Unwrapped tokens result:', unwrapResult);
      } else {
        // Handle failure per Wasmlanche memory - provide detailed error info
        console.error('Failed to create privacy pool:', createPoolResult.error);
        console.log('Continuing with fallback options...');
      }
    } catch (error) {
      // Proper error logging with fallback behavior
      console.error('Error working with privacy pools:', error.message);
      console.log('Continuing with alternative approach...');
    }
    
    // Get network statistics and monitoring information
    console.log('\nFetching Avalanche network statistics...');
    const networkStats = avalanche.getNetworkStatistics();
    console.log('Current network state:', networkStats.networkState);
    console.log('Recommended batch settings:', networkStats.recommendedSettings);
    
    // Estimate gas costs with different priority levels
    console.log('\nEstimating gas costs for example transaction with different priority levels...');
    const exampleTransaction = {
      to: '0x1234567890123456789012345678901234567890',
      value: ethers.utils.parseEther('0.1'),
      data: '0x'
    };
    
    // Define parameter validation per Wasmlanche memory principles
    const validateTransaction = (tx) => {
      if (!tx || !tx.to || !ethers.utils.isAddress(tx.to.toLowerCase())) {
        console.error('Invalid transaction address');
        return false;
      }
      return true;
    };
    
    if (validateTransaction(exampleTransaction)) {
      try {
        // Get estimates for different priority levels
        const priorities = ['low', 'standard', 'high', 'urgent'];
        
        for (const priority of priorities) {
          const gasEstimate = await avalanche.estimateGasCosts(exampleTransaction, priority);
          console.log(`Gas estimate (${priority} priority):`, {
            gasCostInAvax: gasEstimate.gasCostInAvax,
            gasPriceGwei: gasEstimate.gasPriceGwei,
            estimatedConfirmationTime: `~${gasEstimate.estimatedConfirmationTime} seconds`,
            networkCongestion: gasEstimate.networkCongestionDescription
          });
        }
      } catch (error) {
        // Safe error handling with fallback
        console.error('Error estimating gas:', error.message);
      }
    }
    
    console.log('Avalanche integration example completed successfully');
  } catch (error) {
    console.error('Error in Avalanche integration example:', error);
  }
}

// Run the example
if (require.main === module) {
  runAvalancheExample()
    .then(() => console.log('Example completed'))
    .catch(err => console.error('Example failed:', err));
}

module.exports = { runAvalancheExample };
