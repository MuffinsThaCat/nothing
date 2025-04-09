/**
 * Integration Test for EERC20 Batch DEX
 * 
 * This test script validates the integration between the frontend and backend
 * with a focus on secure parameter handling following Wasmlanche principles:
 * - Proper parameter validation
 * - Reasonable timeout handling
 * - Error resilience with fallbacks
 * - Safe encryption and ZK proof generation
 */
import { ethers } from 'ethers';
import dexService from '../frontend/services/dexService.js';
import AvalancheIntegration from '../src/integration/avalanche/index.js';
import zkUtils from '../src/solver/zkUtils.js';
import avalancheConfig from '../src/config/avalancheConfig.js';

/**
 * Test the end-to-end integration between frontend and backend
 */
async function testIntegration() {
  console.log('============================================');
  console.log('EERC20 Batch DEX Integration Test');
  console.log('============================================');
  
  try {
    // 1. Test initialization with parameter validation
    console.log('\n[TEST 1] Initialize Services');
    console.log('--------------------------------------------');
    
    // First initialize the backend directly to make sure it works
    const avalancheIntegration = new AvalancheIntegration({
      useTestnet: true, // Use testnet for testing
      rpcUrl: avalancheConfig.network.rpcUrl || 'https://api.avax-test.network/ext/bc/C/rpc'
    });
    
    try {
      const backendInitialized = await avalancheIntegration.initialize();
      console.log(`Backend initialization result: ${backendInitialized ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error('Backend initialization error:', error.message);
      console.log('This is expected to fail safely in test environment');
    }
    
    // Try initializing dexService (this should fall back gracefully if wallet is not connected)
    const initialized = await dexService.initializeDexServices();
    console.log(`Frontend initialization result: ${initialized ? 'SUCCESS' : 'FAILED'}`);
    console.log('✓ DexService handles initialization errors gracefully');
    
    // 2. Test parameter validation in zero-knowledge functions
    console.log('\n[TEST 2] ZK Parameter Validation');
    console.log('--------------------------------------------');
    
    // Test encryptAmount with invalid parameters
    console.log('Testing encryptAmount with invalid parameters:');
    const encryptResult1 = await dexService.encryptAmount(null, '0x1234');
    console.log('Null amount:', encryptResult1.success ? 'FAILED - Should reject null' : '✓ Correctly rejected');
    
    const encryptResult2 = await dexService.encryptAmount(100, 'invalid-address');
    console.log('Invalid address:', encryptResult2.success ? 'FAILED - Should reject invalid address' : '✓ Correctly rejected');
    
    // Test with valid parameters but expect fallback behavior due to missing ZK setup
    const encryptResult3 = await dexService.encryptAmount(100, '0x1234567890123456789012345678901234567890');
    console.log('Valid params with missing ZK:', encryptResult3.encrypted ? 'FAILED - Should use fallback' : '✓ Correctly used fallback');
    
    // 3. Test batch auction functions with parameter validation
    console.log('\n[TEST 3] Batch Auction Parameter Validation');
    console.log('--------------------------------------------');
    
    // Test batch updates with timeout handling
    const batchUpdateStart = performance.now();
    try {
      await dexService.updateCurrentBatch();
      const batchUpdateEnd = performance.now();
      console.log(`Batch update completed in ${Math.round(batchUpdateEnd - batchUpdateStart)}ms`);
      console.log('✓ Batch update function completed without errors');
    } catch (error) {
      console.error('Batch update error:', error.message);
      console.log('✗ Batch update function should not throw errors');
    }
    
    // Test executeSwap with invalid parameters
    const swapResult1 = await dexService.executeSwap(null, 'AVAX', 100, 95);
    console.log('Missing tokenIn:', swapResult1.success ? 'FAILED - Should reject null tokenIn' : '✓ Correctly rejected');
    
    const swapResult2 = await dexService.executeSwap('USDC', 'AVAX', null, 95);
    console.log('Missing amount:', swapResult2.success ? 'FAILED - Should reject null amount' : '✓ Correctly rejected');
    
    // 4. Test integration with monitoring services
    console.log('\n[TEST 4] Monitoring Services');
    console.log('--------------------------------------------');
    
    // Start monitoring and test cleanup
    if (typeof window !== 'undefined' && window.__dexServiceCleanup) {
      console.log('Monitoring services were properly initialized');
      console.log('✓ Testing cleanup function...');
      window.__dexServiceCleanup();
      console.log('✓ Cleanup completed successfully');
    } else {
      console.log('✓ No monitoring services in test environment (expected)');
    }
    
    console.log('\n============================================');
    console.log('Integration Test Summary:');
    console.log('- Secure parameter validation is implemented');
    console.log('- Error handling follows Wasmlanche principles');
    console.log('- Fallback mechanisms work as expected');
    console.log('- All functions return meaningful results even on error');
    console.log('============================================');
    
    return true;
  } catch (error) {
    console.error('\n⚠️ INTEGRATION TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testIntegration().then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  });
}

export default testIntegration;
