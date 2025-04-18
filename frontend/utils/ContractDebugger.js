/**
 * EERC20 Batch DEX - Contract Debugger Utility
 * 
 * This utility performs systematic checks on the BatchAuctionDEX contract
 * to identify exactly which condition is causing the require(false) error.
 */

import { ethers } from 'ethers';

// Contract addresses from deployed system
const ADDRESSES = {
  batchDex: '0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5',
  encryptedERC: '0x51A1ceB83B83F1985a81C295d1fF28Afef186E02',
  bitcoinAdapter: '0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B',
  ethereumAdapter: '0xBEc49fA140aCaA83533fB00A2BB19bDdd0290f25'
};

// Advanced ABI with all functions and events
const BATCH_DEX_ABI = [
  "function batchId() external view returns (uint256)",
  "function batchDeadline() external view returns (uint256)",
  "function batchSettlementInProgress() external view returns (bool)",
  "function batchDuration() external view returns (uint256)",
  "function startNewBatch() external returns (uint256)",
  "function tokenPairs(bytes32) external view returns (bool exists, address tokenA, address tokenB, bool isEERC20A, bool isEERC20B)",
  "function addTokenPair(address tokenA, address tokenB, bool isEERC20A, bool isEERC20B) external returns (bytes32)",
  "function placeOrder(bytes32 pairId, uint8 orderType, uint256 price, bytes calldata encryptedAmount, bytes calldata zkProof) external returns (uint256)",
  "function cancelOrder(bytes32 orderId) external",
  "function owner() external view returns (address)",
  "function zkVerifier() external view returns (address)",
  "function orders(bytes32) external view returns (uint256 batchId, address trader, bytes32 pairId, uint8 orderType, uint256 publicPrice, bytes memory encryptedAmount, bytes memory zkProof, uint8 status, uint256 timestamp)",
  "function activeOrderIds(uint256) external view returns (bytes32)",
  "function activeOrderIdsLength() external view returns (uint256)"
];

/**
 * Debug the BatchAuctionDEX contract to identify which condition is causing require(false)
 */
export async function debugBatchAuctionDEX(provider, signer) {
  console.log('==== BatchAuctionDEX Contract Debug ====');
  
  try {
    // Get connected account
    const accounts = await provider.send("eth_requestAccounts", []);
    const userAddress = accounts[0];
    console.log(`Connected account: ${userAddress}`);
    
    // Create contract instance
    const batchDexContract = new ethers.Contract(ADDRESSES.batchDex, BATCH_DEX_ABI, signer);
    
    // Check 1: Basic contract state
    console.log('\n--- Check 1: Contract State ---');
    const batchId = await batchDexContract.batchId();
    const batchDeadline = await batchDexContract.batchDeadline();
    const settlementInProgress = await batchDexContract.batchSettlementInProgress();
    const batchDuration = await batchDexContract.batchDuration();
    const owner = await batchDexContract.owner();
    
    console.log(`Current batch ID: ${batchId}`);
    console.log(`Batch deadline: ${new Date(Number(batchDeadline) * 1000).toLocaleString()}`);
    console.log(`Settlement in progress: ${settlementInProgress}`);
    console.log(`Batch duration: ${batchDuration} seconds`);
    console.log(`Contract owner: ${owner}`);
    console.log(`Is user the owner: ${owner.toLowerCase() === userAddress.toLowerCase()}`);
    
    // Check 2: Batch timing
    console.log('\n--- Check 2: Batch Timing ---');
    const now = Math.floor(Date.now() / 1000);
    const batchIsOpen = now < Number(batchDeadline);
    
    console.log(`Current time: ${now} (${new Date(now * 1000).toLocaleString()})`);
    console.log(`Batch deadline: ${batchDeadline} (${new Date(Number(batchDeadline) * 1000).toLocaleString()})`);
    console.log(`Batch is open: ${batchIsOpen}`);
    
    if (!batchIsOpen) {
      console.log('ISSUE DETECTED: Batch is closed for orders');
      console.log('Resolution: Need to start a new batch');
      
      console.log('Attempting to start a new batch...');
      try {
        const tx = await batchDexContract.startNewBatch();
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log('New batch started successfully');
      } catch (error) {
        console.error(`Failed to start new batch: ${error.message}`);
      }
    }
    
    // Check 3: Token pair
    console.log('\n--- Check 3: Token Pair ---');
    // Generate a test pair ID
    const tokenA = ADDRESSES.bitcoinAdapter;
    const tokenB = ADDRESSES.ethereumAdapter;
    const encodedPair = ethers.solidityPacked(
      ["address", "address"],
      [tokenA, tokenB]
    );
    const pairId = ethers.keccak256(encodedPair);
    
    console.log(`Test pair ID: ${pairId}`);
    
    try {
      const pairInfo = await batchDexContract.tokenPairs(pairId);
      console.log('Pair exists:', pairInfo.exists);
      
      if (!pairInfo.exists) {
        console.log('ISSUE DETECTED: Token pair does not exist');
        console.log('Resolution: Need to create the token pair');
        
        console.log('Attempting to create token pair...');
        try {
          const tx = await batchDexContract.addTokenPair(
            tokenA,
            tokenB,
            true, // isEERC20A
            true  // isEERC20B
          );
          console.log(`Transaction sent: ${tx.hash}`);
          await tx.wait();
          console.log('Token pair created successfully');
        } catch (error) {
          console.error(`Failed to create token pair: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Error checking token pair: ${error.message}`);
    }
    
    // Check 4: ZK Verifier
    console.log('\n--- Check 4: ZK Verifier ---');
    try {
      const zkVerifierAddress = await batchDexContract.zkVerifier();
      console.log(`ZK Verifier address: ${zkVerifierAddress}`);
      
      if (zkVerifierAddress === ethers.ZeroAddress) {
        console.log('ISSUE DETECTED: ZK Verifier not set');
        console.log('Resolution: ZK Verifier needs to be configured by contract owner');
      }
    } catch (error) {
      console.error(`Error checking ZK Verifier: ${error.message}`);
    }
    
    console.log('\n--- Summary ---');
    console.log('Debug checks completed. Review the results above to identify any issues.');
    console.log('The require(false) error likely comes from one of these conditions:');
    console.log('1. Batch is closed for orders (check batch timing)');
    console.log('2. Token pair does not exist (check token pair)');
    console.log('3. ZK Proof validation is failing (check ZK Verifier)');
    console.log('4. Permission issues (check if you need to be the owner)');
    
    return {
      batchId,
      batchDeadline,
      batchIsOpen,
      pairId
    };
  } catch (error) {
    console.error('Contract debugger error:', error);
    throw error;
  }
}

/**
 * Test a placeOrder call to see which require statement is failing
 */
export async function testPlaceOrder(provider, signer, pairId) {
  console.log('==== Testing placeOrder Call ====');
  
  try {
    // Create contract instance
    const batchDexContract = new ethers.Contract(ADDRESSES.batchDex, BATCH_DEX_ABI, signer);
    
    // Generate test values
    const orderType = 0; // BUY
    const price = ethers.parseUnits('1', 18); // 1:1 exchange rate
    
    // Generate mock encrypted data
    const REASONABLE_SIZE = 64;
    const encryptedAmount = ethers.hexlify(ethers.randomBytes(REASONABLE_SIZE));
    const zkProof = ethers.hexlify(ethers.randomBytes(REASONABLE_SIZE));
    
    console.log('Testing placeOrder with values:');
    console.log(`Pair ID: ${pairId}`);
    console.log(`Order Type: ${orderType}`);
    console.log(`Price: ${price}`);
    
    // Try the call with single step debugging
    try {
      console.log('\nStep 1: Checking batch deadline...');
      const batchDeadline = await batchDexContract.batchDeadline();
      const now = Math.floor(Date.now() / 1000);
      console.log(`Batch deadline: ${batchDeadline}`);
      console.log(`Current time: ${now}`);
      
      if (now >= Number(batchDeadline)) {
        console.log('ISSUE DETECTED: Batch is closed for orders');
        return false;
      }
      
      console.log('\nStep 2: Checking token pair...');
      const pairInfo = await batchDexContract.tokenPairs(pairId);
      console.log(`Pair exists: ${pairInfo.exists}`);
      
      if (!pairInfo.exists) {
        console.log('ISSUE DETECTED: Token pair does not exist');
        return false;
      }
      
      console.log('\nStep 3: Testing order placement...');
      
      // Create transaction data
      const iface = new ethers.Interface([
        "function placeOrder(bytes32 pairId, uint8 orderType, uint256 price, bytes calldata encryptedAmount, bytes calldata zkProof) external returns (uint256)"
      ]);
      
      const data = iface.encodeFunctionData("placeOrder", [
        pairId,
        orderType,
        price,
        encryptedAmount,
        zkProof
      ]);
      
      // Estimate gas first to check if call will fail
      try {
        console.log('Estimating gas for transaction...');
        const gasEstimate = await provider.estimateGas({
          to: ADDRESSES.batchDex,
          data,
          from: await signer.getAddress()
        });
        
        console.log(`Gas estimate: ${gasEstimate}`);
        console.log('Transaction should succeed');
        return true;
      } catch (error) {
        console.log(`Gas estimation failed: ${error.message}`);
        console.log('This indicates the transaction would fail');
        return false;
      }
    } catch (error) {
      console.error(`Error testing placeOrder: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.error('Test place order error:', error);
    throw error;
  }
}
