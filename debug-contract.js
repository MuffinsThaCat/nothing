/**
 * BatchAuctionDEX Contract Debug Script
 * 
 * This script tests different interactions with the BatchAuctionDEX contract
 * to diagnose what might be causing the "require(false)" error.
 */

// Run this with:
// node debug-contract.js

const { ethers } = require('ethers');

async function main() {
  console.log('Starting BatchAuctionDEX contract debug...');
  
  try {
    // Connect to provider - using default MetaMask provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    
    console.log(`Connected with account: ${accounts[0]}`);
    
    // Contract addresses from your deployment
    const batchDexAddress = '0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5';
    const encryptedErcAddress = '0x51A1ceB83B83F1985a81C295d1fF28Afef186E02';
    const bitcoinAdapterAddress = '0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B';
    const ethereumAdapterAddress = '0xBEc49fA140aCaA83533fB00A2BB19bDdd0290f25';
    
    // Define contract ABIs
    const batchDexAbi = [
      "function batchId() external view returns (uint256)",
      "function batchDeadline() external view returns (uint256)",
      "function batchSettlementInProgress() external view returns (bool)",
      "function startNewBatch() external returns (uint256)",
      "function tokenPairs(bytes32) external view returns (bool exists, address tokenA, address tokenB, bool isEERC20A, bool isEERC20B)",
      "function addTokenPair(address tokenA, address tokenB, bool isEERC20A, bool isEERC20B) external returns (bytes32)",
      "function placeOrder(bytes32 pairId, uint8 orderType, uint256 price, bytes calldata encryptedAmount, bytes calldata zkProof) external returns (uint256)",
      "function cancelOrder(bytes32 orderId) external",
      "function owner() external view returns (address)",
      "function zkVerifier() external view returns (address)"
    ];
    
    // Create contract instances
    const batchDexContract = new ethers.Contract(batchDexAddress, batchDexAbi, signer);
    
    // Step 1: Check basic contract state
    console.log('\n--- Step 1: Basic Contract State ---');
    const currentBatchId = await batchDexContract.batchId();
    const currentDeadline = await batchDexContract.batchDeadline();
    const settlementInProgress = await batchDexContract.batchSettlementInProgress();
    const contractOwner = await batchDexContract.owner();
    const zkVerifierAddress = await batchDexContract.zkVerifier();
    
    console.log(`Current batch ID: ${currentBatchId}`);
    console.log(`Batch deadline: ${new Date(Number(currentDeadline) * 1000).toLocaleString()}`);
    console.log(`Settlement in progress: ${settlementInProgress}`);
    console.log(`Contract owner: ${contractOwner}`);
    console.log(`ZK Verifier address: ${zkVerifierAddress}`);
    console.log(`Connected account: ${accounts[0]}`);
    console.log(`Is owner: ${contractOwner.toLowerCase() === accounts[0].toLowerCase()}`);
    
    // Step 2: Check if a batch needs to be started
    console.log('\n--- Step 2: Batch Management ---');
    const now = Math.floor(Date.now() / 1000);
    let needsNewBatch = now >= Number(currentDeadline);
    
    console.log(`Current time: ${now}`);
    console.log(`Deadline: ${currentDeadline}`);
    console.log(`Needs new batch: ${needsNewBatch}`);
    
    if (needsNewBatch) {
      console.log('Starting new batch...');
      try {
        const tx = await batchDexContract.startNewBatch();
        console.log('Transaction hash:', tx.hash);
        await tx.wait();
        console.log('New batch started successfully');
      } catch (error) {
        console.error('Failed to start new batch:', error.message);
      }
    }
    
    // Step 3: Check token pair
    console.log('\n--- Step 3: Token Pair Check ---');
    // Create a pair ID using the same logic as in the contract
    const pairTokens = [bitcoinAdapterAddress, ethereumAdapterAddress];
    pairTokens.sort(); // Ensure consistent order as in the contract
    
    const encodedPair = ethers.solidityPacked(
      ["address", "address"],
      [pairTokens[0], pairTokens[1]]
    );
    const pairId = ethers.keccak256(encodedPair);
    console.log(`Checking pair ID: ${pairId}`);
    
    try {
      const pairInfo = await batchDexContract.tokenPairs(pairId);
      console.log('Pair exists:', pairInfo.exists);
      if (pairInfo.exists) {
        console.log('Pair tokens:', {
          tokenA: pairInfo.tokenA,
          tokenB: pairInfo.tokenB,
          isEERC20A: pairInfo.isEERC20A,
          isEERC20B: pairInfo.isEERC20B
        });
      } else {
        console.log('Creating token pair...');
        try {
          const tx = await batchDexContract.addTokenPair(
            pairTokens[0],
            pairTokens[1],
            true, // isEERC20A
            true  // isEERC20B
          );
          console.log('Transaction hash:', tx.hash);
          await tx.wait();
          console.log('Token pair created successfully');
        } catch (error) {
          console.error('Failed to create token pair:', error.message);
        }
      }
    } catch (error) {
      console.error('Error checking token pair:', error.message);
    }
    
    console.log('\nDebugging complete. Check the console logs to identify issues.');
    
  } catch (error) {
    console.error('Debug script error:', error);
  }
}

// Check if we're in a browser environment
if (typeof window !== 'undefined' && window.ethereum) {
  main().catch(console.error);
} else {
  console.log('This script is designed to run in a browser environment with MetaMask.');
  console.log('Please copy this code to your browser console while on your DEX page.');
}
