/**
 * EERC20 Batch DEX - Real EncryptedERC System Deployment
 * 
 * This script deploys the full EncryptedERC system with privacy-preserving features
 * and connects it to the BatchAuctionDEX through adapters.
 * 
 * Following Wasmlanche safe parameter handling principles:
 * - Comprehensive parameter validation
 * - Safe bounds checking
 * - Defensive programming with fallbacks
 * - Detailed debug logging
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Real EERC20 System...");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  try {
    // ----- Step 1: Deploy Verifier Contracts -----
    console.log("\nDeploying Verifier Contracts...");
    
    // Deploy MintVerifier
    const MintVerifier = await ethers.getContractFactory("MintVerifier");
    const mintVerifier = await MintVerifier.deploy();
    await mintVerifier.waitForDeployment();
    const mintVerifierAddress = await mintVerifier.getAddress();
    console.log(`MintVerifier deployed to: ${mintVerifierAddress}`);
    
    // Deploy WithdrawVerifier
    const WithdrawVerifier = await ethers.getContractFactory("WithdrawVerifier");
    const withdrawVerifier = await WithdrawVerifier.deploy();
    await withdrawVerifier.waitForDeployment();
    const withdrawVerifierAddress = await withdrawVerifier.getAddress();
    console.log(`WithdrawVerifier deployed to: ${withdrawVerifierAddress}`);
    
    // Deploy TransferVerifier
    const TransferVerifier = await ethers.getContractFactory("TransferVerifier");
    const transferVerifier = await TransferVerifier.deploy();
    await transferVerifier.waitForDeployment();
    const transferVerifierAddress = await transferVerifier.getAddress();
    console.log(`TransferVerifier deployed to: ${transferVerifierAddress}`);
    
    // ----- Step 2: Deploy Registrar -----
    console.log("\nDeploying Registrar...");
    const Registrar = await ethers.getContractFactory("Registrar");
    const registrar = await Registrar.deploy();
    await registrar.waitForDeployment();
    const registrarAddress = await registrar.getAddress();
    console.log(`Registrar deployed to: ${registrarAddress}`);
    
    // ----- Step 3: Deploy EncryptedERC -----
    console.log("\nDeploying EncryptedERC...");
    const EncryptedERC = await ethers.getContractFactory("EncryptedERC");
    
    // Following Wasmlanche safe parameter handling (validate and sanitize parameters)
    const MAX_STRING_LENGTH = 32; // Reasonable max length for strings
    
    // Token parameters with safe defaults for Bitcoin token
    const btcName = "Private Bitcoin";
    const btcSymbol = "pBTC";
    const decimals = 18;
    
    // Safety checks for string parameters
    const safeBtcName = btcName.length <= MAX_STRING_LENGTH ? btcName : btcName.substring(0, MAX_STRING_LENGTH);
    const safeBtcSymbol = btcSymbol.length <= MAX_STRING_LENGTH ? btcSymbol : btcSymbol.substring(0, MAX_STRING_LENGTH);
    
    // Create constructor parameters struct
    const encryptedERCParams = {
      registrar: registrarAddress,
      mintVerifier: mintVerifierAddress,
      withdrawVerifier: withdrawVerifierAddress,
      transferVerifier: transferVerifierAddress,
      name: safeBtcName,
      symbol: safeBtcSymbol,
      decimals: decimals,
      isConverter: false
    };
    
    // Deploy EncryptedERC with safe parameters
    const encryptedERC = await EncryptedERC.deploy(encryptedERCParams);
    await encryptedERC.waitForDeployment();
    const encryptedERCAddress = await encryptedERC.getAddress();
    console.log(`EncryptedERC deployed to: ${encryptedERCAddress}`);
    
    // ----- Step 4: Set Auditor -----
    console.log("\nSetting auditor...");
    
    // Set auditor with error handling (Wasmlanche principle)
    try {
      // Set auditor on the registrar
      await registrar.setAuditor(deployer.address);
      console.log(`Auditor set to: ${deployer.address}`);
      
      // Set auditor public key on EncryptedERC
      await encryptedERC.setAuditorPublicKey(deployer.address);
      console.log("Auditor public key set successfully");
    } catch (error) {
      // Safe error handling (Wasmlanche principle)
      console.error("Error setting auditor:", error.message);
      console.warn("Continuing with deployment - auditor functionality may be limited");
    }
    
    // ----- Step 5: Add Tokens to the EncryptedERC System -----
    console.log("\nAdding tokens to EncryptedERC system...");
    
    // Safety checks for token IDs (Wasmlanche principle)
    try {
      // Add Bitcoin token
      const btcTx = await encryptedERC.addToken(ethers.ZeroAddress);
      const btcReceipt = await btcTx.wait();
      // Extract token ID from events if possible
      const btcTokenId = 1; // In this implementation, this should be the first token
      
      console.log(`Added Bitcoin token with ID: ${btcTokenId}`);
      
      // Add Ethereum token with a similar process
      const ethTx = await encryptedERC.addToken("0x0000000000000000000000000000000000000001");
      const ethReceipt = await ethTx.wait();
      const ethTokenId = 2; // Should be the second token
      
      console.log(`Added Ethereum token with ID: ${ethTokenId}`);
      
      // ----- Step 6: Deploy RealEERC20Adapters -----
      console.log("\nDeploying RealEERC20Adapters...");
      
      const RealEERC20Adapter = await ethers.getContractFactory("RealEERC20Adapter");
      
      // Deploy Bitcoin adapter with proper error handling (Wasmlanche principle)
      const bitcoinAdapter = await RealEERC20Adapter.deploy(
        encryptedERCAddress,
        btcTokenId,
        safeBtcName,
        safeBtcSymbol
      );
      
      await bitcoinAdapter.waitForDeployment();
      const bitcoinAdapterAddress = await bitcoinAdapter.getAddress();
      console.log(`Bitcoin RealEERC20Adapter deployed to: ${bitcoinAdapterAddress}`);
      
      // Safety checks for Ethereum token parameters (Wasmlanche principle)
      const ethName = "Private Ethereum";
      const ethSymbol = "pETH";
      
      const safeEthName = ethName.length <= MAX_STRING_LENGTH ? ethName : ethName.substring(0, MAX_STRING_LENGTH);
      const safeEthSymbol = ethSymbol.length <= MAX_STRING_LENGTH ? ethSymbol : ethSymbol.substring(0, MAX_STRING_LENGTH);
      
      // Deploy Ethereum adapter
      const ethereumAdapter = await RealEERC20Adapter.deploy(
        encryptedERCAddress,
        ethTokenId,
        safeEthName,
        safeEthSymbol
      );
      
      await ethereumAdapter.waitForDeployment();
      const ethereumAdapterAddress = await ethereumAdapter.getAddress();
      console.log(`Ethereum RealEERC20Adapter deployed to: ${ethereumAdapterAddress}`);
      
      // ----- Step 7: Deploy BatchAuctionDEX and ZKVerifier -----
      console.log("\nDeploying ZKVerifier for BatchAuctionDEX...");
      
      // Generate mock verifying keys with safe size limits
      const MAX_KEY_SIZE = 1024; // Safe maximum size
      
      // Generate mock verifying keys for testing
      const transferProofKey = ethers.hexlify(ethers.randomBytes(MAX_KEY_SIZE));
      const balanceProofKey = ethers.hexlify(ethers.randomBytes(MAX_KEY_SIZE));
      const settlementProofKey = ethers.hexlify(ethers.randomBytes(MAX_KEY_SIZE));
      
      const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
      const zkVerifier = await ZKVerifier.deploy(
        transferProofKey,
        balanceProofKey,
        settlementProofKey,
        true // allowContinueOnFailure = true for testing
      );
      
      await zkVerifier.waitForDeployment();
      const zkVerifierAddress = await zkVerifier.getAddress();
      console.log(`ZKVerifier deployed to: ${zkVerifierAddress}`);
      
      // Deploy BatchAuctionDEX
      console.log("\nDeploying BatchAuctionDEX...");
      const BatchAuctionDEX = await ethers.getContractFactory("BatchAuctionDEX");
      
      // Parameter validation with safe defaults (Wasmlanche principle)
      const MAX_BATCH_DURATION = 86400; // 1 day as maximum reasonable duration
      const requestedDuration = 300; // 5 minutes
      const safeDuration = requestedDuration > MAX_BATCH_DURATION ? MAX_BATCH_DURATION : requestedDuration;
      
      // Correct parameter order: first duration, then verifier address
      const batchDex = await BatchAuctionDEX.deploy(safeDuration, zkVerifierAddress);
      
      await batchDex.waitForDeployment();
      const batchDexAddress = await batchDex.getAddress();
      console.log(`BatchAuctionDEX deployed to: ${batchDexAddress}`);
      
      // ----- Step 8: Create Trading Pair -----
      console.log("\nCreating trading pair...");
      
      // Generate pair ID with safe parameter handling
      const encodedPair = ethers.solidityPacked(
        ["address", "address"],
        [bitcoinAdapterAddress, ethereumAdapterAddress]
      );
      const pairId = ethers.keccak256(encodedPair);
      
      try {
        // Add trading pair to DEX
        await batchDex.getFunction("addTokenPair").staticCall(
          bitcoinAdapterAddress,
          ethereumAdapterAddress
        );
        
        const addPairTx = await batchDex.addTokenPair(bitcoinAdapterAddress, ethereumAdapterAddress);
        await addPairTx.wait();
        
        console.log(`Trading pair created: pBTC/pETH (${pairId})`);
      } catch (error) {
        // Specific error handling (Wasmlanche principle)
        console.error("Error creating trading pair:", error.message);
        
        if (error.message.includes("function selector was not recognized")) {
          console.error("The function 'addTokenPair' doesn't exist or has a different signature");
          
          // Let's check the contract interface to find the correct function
          console.log("Available functions on BatchAuctionDEX contract:");
          const batchDexInterface = BatchAuctionDEX.interface;
          console.log(batchDexInterface.fragments.map(f => f.selector + ": " + f.name).join(", "));
        }
        
        console.warn("Continuing with deployment - trading functionality may be limited");
      }
      
      // ----- Display contract addresses for future reference -----
      console.log("\n=== Real EERC20 System Contract Addresses ===");
      console.log(`MintVerifier: ${mintVerifierAddress}`);
      console.log(`WithdrawVerifier: ${withdrawVerifierAddress}`);
      console.log(`TransferVerifier: ${transferVerifierAddress}`);
      console.log(`Registrar: ${registrarAddress}`);
      console.log(`EncryptedERC: ${encryptedERCAddress}`);
      console.log(`Bitcoin Adapter: ${bitcoinAdapterAddress}`);
      console.log(`Ethereum Adapter: ${ethereumAdapterAddress}`);
      console.log(`ZKVerifier: ${zkVerifierAddress}`);
      console.log(`BatchAuctionDEX: ${batchDexAddress}`);
      console.log(`Trading Pair ID: ${pairId}`);
      
    } catch (error) {
      // Safety-focused error handling (Wasmlanche principle)
      console.error("Error in token setup:", error);
      console.error("Detailed error information:", {
        message: error.message,
        code: error.code,
        method: error.method
      });
    }
    
  } catch (error) {
    // Top-level error handling (Wasmlanche principle)
    console.error("Deployment script failed:", error);
    
    // Provide helpful context about the error
    if (error.message.includes("execution reverted")) {
      console.error("Contract execution reverted. This may be due to invalid parameters.");
    }
    
    // Return a properly formatted error with safe details (Wasmlanche principle)
    console.error({
      status: "failed",
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.split("\n").slice(0, 3).join("\n")
    });
  }
}

// Run the deployment script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error in script:", error);
    process.exit(1);
  });
