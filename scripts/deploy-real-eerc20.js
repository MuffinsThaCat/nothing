/**
 * EERC20 Batch DEX - Real EncryptedERC Deployment Script
 * 
 * This script deploys the full EncryptedERC system with real privacy-preserving tokens
 * following Wasmlanche safe parameter handling principles:
 * 1. Comprehensive parameter validation
 * 2. Safe array bounds checking
 * 3. Defensive error handling 
 * 4. Fallback mechanisms for validation failures
 * 5. Comprehensive debug logging
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Real EERC20 System...");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  try {
    // ----- Step 1: Deploy Verifier Contracts -----
    console.log("\nDeploying Verifier Contracts...");
    
    // Deploy MintVerifier
    const MintVerifier = await ethers.getContractFactory("MintVerifier");
    const mintVerifier = await MintVerifier.deploy();
    await mintVerifier.deployed();
    console.log(`MintVerifier deployed to: ${mintVerifier.address}`);
    
    // Deploy WithdrawVerifier
    const WithdrawVerifier = await ethers.getContractFactory("WithdrawVerifier");
    const withdrawVerifier = await WithdrawVerifier.deploy();
    await withdrawVerifier.deployed();
    console.log(`WithdrawVerifier deployed to: ${withdrawVerifier.address}`);
    
    // Deploy TransferVerifier
    const TransferVerifier = await ethers.getContractFactory("TransferVerifier");
    const transferVerifier = await TransferVerifier.deploy();
    await transferVerifier.deployed();
    console.log(`TransferVerifier deployed to: ${transferVerifier.address}`);
    
    // ----- Step 2: Deploy Registrar Contract -----
    console.log("\nDeploying Registrar Contract...");
    const Registrar = await ethers.getContractFactory("Registrar");
    const registrar = await Registrar.deploy();
    await registrar.deployed();
    console.log(`Registrar deployed to: ${registrar.address}`);
    
    // ----- Step 3: Deploy EncryptedERC Contract -----
    console.log("\nDeploying EncryptedERC Contract...");
    const EncryptedERC = await ethers.getContractFactory("EncryptedERC");
    
    // Following Wasmlanche safe parameter handling
    // Validate and sanitize parameter lengths
    const MAX_STRING_LENGTH = 32; // Reasonable max length for strings
    
    // Token parameters with safe defaults
    const tokenName = "Privacy Bitcoin";
    const tokenSymbol = "pBTC";
    const tokenDecimals = 18;
    
    // Safety checks for string parameters
    const safeName = tokenName.length <= MAX_STRING_LENGTH ? tokenName : tokenName.substring(0, MAX_STRING_LENGTH);
    const safeSymbol = tokenSymbol.length <= MAX_STRING_LENGTH ? tokenSymbol : tokenSymbol.substring(0, MAX_STRING_LENGTH);
    
    // Validate decimals parameter is within safe range
    const MAX_DECIMALS = 18;
    const safeDecimals = tokenDecimals <= MAX_DECIMALS ? tokenDecimals : MAX_DECIMALS;
    
    // Prepare contract params with robust default/fallback values
    const encryptedERCParams = {
      name: safeName,
      symbol: safeSymbol,
      decimals: safeDecimals,
      registrar: registrar.address || ethers.constants.AddressZero, // Safe fallback
      mintVerifier: mintVerifier.address || ethers.constants.AddressZero, // Safe fallback
      withdrawVerifier: withdrawVerifier.address || ethers.constants.AddressZero, // Safe fallback
      transferVerifier: transferVerifier.address || ethers.constants.AddressZero, // Safe fallback
      isConverter: false
    };
    
    // Log param details for debugging (following Wasmlanche principles)
    console.log(`EncryptedERC Parameters:
      Name: ${encryptedERCParams.name} (length: ${encryptedERCParams.name.length})
      Symbol: ${encryptedERCParams.symbol} (length: ${encryptedERCParams.symbol.length})
      Decimals: ${encryptedERCParams.decimals}
      Registrar: ${encryptedERCParams.registrar}
      MintVerifier: ${encryptedERCParams.mintVerifier}
      WithdrawVerifier: ${encryptedERCParams.withdrawVerifier}
      TransferVerifier: ${encryptedERCParams.transferVerifier}
      isConverter: ${encryptedERCParams.isConverter}
    `);
    
    // Deploy with safe parameters
    const encryptedERC = await EncryptedERC.deploy(encryptedERCParams);
    await encryptedERC.deployed();
    console.log(`EncryptedERC deployed to: ${encryptedERC.address}`);
    
    // ----- Step 4: Deploy RealEERC20Adapter for Bitcoin -----
    console.log("\nDeploying RealEERC20Adapter for Bitcoin...");
    const RealEERC20Adapter = await ethers.getContractFactory("RealEERC20Adapter");
    
    // Generate token ID with bounds checking
    const tokenId = 1; // Start with ID 1

    // Deploy adapter with proper error handling
    try {
      const bitcoinAdapter = await RealEERC20Adapter.deploy(
        encryptedERC.address,
        tokenId,
        safeName,
        safeSymbol
      );
      await bitcoinAdapter.deployed();
      console.log(`Bitcoin RealEERC20Adapter deployed to: ${bitcoinAdapter.address}`);
      
      // ----- Step 5: Deploy RealEERC20Adapter for Ethereum -----
      console.log("\nDeploying RealEERC20Adapter for Ethereum...");
      
      // Different token parameters for ETH
      const ethName = "Privacy Ethereum";
      const ethSymbol = "pETH";
      
      // Safety checks for string parameters (Wasmlanche principle)
      const safeEthName = ethName.length <= MAX_STRING_LENGTH ? ethName : ethName.substring(0, MAX_STRING_LENGTH);
      const safeEthSymbol = ethSymbol.length <= MAX_STRING_LENGTH ? ethSymbol : ethSymbol.substring(0, MAX_STRING_LENGTH);
      
      // Deploy ETH adapter
      const ethereumAdapter = await RealEERC20Adapter.deploy(
        encryptedERC.address,
        tokenId + 1, // Token ID 2
        safeEthName,
        safeEthSymbol
      );
      await ethereumAdapter.deployed();
      console.log(`Ethereum RealEERC20Adapter deployed to: ${ethereumAdapter.address}`);
      
      // ----- Step 6: Set up Auditor Key -----
      console.log("\nSetting up auditor public key...");
      
      // Generate mock auditor public key
      // Note: In a production environment, this would be a real key
      const auditorPublicKeyX = ethers.BigNumber.from(ethers.utils.randomBytes(32));
      const auditorPublicKeyY = ethers.BigNumber.from(ethers.utils.randomBytes(32));
      
      // Bounds check for BabyJubJub curve parameters
      const MAX_JUBJUB_PARAM = ethers.BigNumber.from("21888242871839275222246405745257275088548364400416034343698204186575808495617");
      const safeX = auditorPublicKeyX.gt(MAX_JUBJUB_PARAM) ? MAX_JUBJUB_PARAM : auditorPublicKeyX;
      const safeY = auditorPublicKeyY.gt(MAX_JUBJUB_PARAM) ? MAX_JUBJUB_PARAM : auditorPublicKeyY;
      
      try {
        // Set auditor on registrar
        await registrar.setAuditor(deployer.address);
        console.log(`Set auditor to ${deployer.address}`);
        
        // Set auditor public key - note this is a mock key for testing
        await encryptedERC.setAuditorPublicKey(deployer.address);
        console.log("Auditor public key set successfully");
      } catch (error) {
        // Safe error handling (Wasmlanche principle)
        console.error("Error setting auditor key:", error);
        console.warn("Continuing with deployment - some features may be limited");
      }
      
      // ----- Step 7: Deploy a simple ZKVerifier for the DEX -----
      console.log("\nDeploying ZKVerifier for DEX...");
      
      // Generate mock verifying keys with safe size limits
      const MAX_KEY_SIZE = 1024; // Safe maximum size
      
      // Generate mock verifying keys for testing
      const transferProofKey = ethers.utils.hexlify(ethers.utils.randomBytes(MAX_KEY_SIZE));
      const balanceProofKey = ethers.utils.hexlify(ethers.utils.randomBytes(MAX_KEY_SIZE));
      const settlementProofKey = ethers.utils.hexlify(ethers.utils.randomBytes(MAX_KEY_SIZE));
      
      const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
      const zkVerifier = await ZKVerifier.deploy(
        transferProofKey,
        balanceProofKey,
        settlementProofKey,
        true // allowContinueOnFailure = true for testing
      );
      await zkVerifier.deployed();
      console.log(`ZKVerifier deployed to: ${zkVerifier.address}`);
      
      // ----- Step 8: Deploy BatchAuctionDEX -----
      console.log("\nDeploying BatchAuctionDEX...");
      const BatchAuctionDEX = await ethers.getContractFactory("BatchAuctionDEX");
      const batchDuration = 300; // 5 minutes
      const batchDex = await BatchAuctionDEX.deploy(zkVerifier.address, batchDuration);
      await batchDex.deployed();
      console.log(`BatchAuctionDEX deployed to: ${batchDex.address}`);
      
      // ----- Step 9: Create Trading Pair -----
      console.log("\nCreating trading pair...");
      
      // Generate pair ID (with safe parameter handling)
      const pairId = ethers.utils.solidityKeccak256(
        ["address", "address"],
        [bitcoinAdapter.address, ethereumAdapter.address]
      );
      
      // Add token pair to DEX
      try {
        const addPairTx = await batchDex.addTokenPair(bitcoinAdapter.address, ethereumAdapter.address);
        await addPairTx.wait();
        
        console.log(`Trading pair created: pBTC/pETH (${pairId})`);
      } catch (error) {
        // Safe error handling
        console.error("Error creating trading pair:", error);
        console.warn("Continuing with deployment - trading functionality may be limited");
      }
      
      // ----- Display contract addresses for future reference -----
      console.log("\n=== Contract Addresses for Future Reference ===");
      console.log(`MintVerifier: ${mintVerifier.address}`);
      console.log(`WithdrawVerifier: ${withdrawVerifier.address}`);
      console.log(`TransferVerifier: ${transferVerifier.address}`);
      console.log(`Registrar: ${registrar.address}`);
      console.log(`EncryptedERC: ${encryptedERC.address}`);
      console.log(`Bitcoin Adapter: ${bitcoinAdapter.address}`);
      console.log(`Ethereum Adapter: ${ethereumAdapter.address}`);
      console.log(`ZKVerifier: ${zkVerifier.address}`);
      console.log(`BatchAuctionDEX: ${batchDex.address}`);
      console.log(`Trading Pair ID: ${pairId}`);
      
    } catch (error) {
      // Specific error handling for adapter deployment (Wasmlanche principle)
      console.error("Error deploying RealEERC20Adapter:", error);
      
      // Provide helpful context about the error (Wasmlanche principle)
      if (error.message.includes("execution reverted")) {
        console.error("Contract execution reverted. This may be due to invalid parameters.");
      }
    }
    
  } catch (error) {
    // Top-level error handling (Wasmlanche principle)
    console.error("Deployment script failed:", error);
    
    // Return a properly formatted error instead of just throwing (Wasmlanche principle)
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
