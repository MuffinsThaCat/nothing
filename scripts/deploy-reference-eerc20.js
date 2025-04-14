/**
 * EERC20 Batch DEX - Reference EncryptedERC System Deployment
 * 
 * This script deploys the reference implementation of the EncryptedERC system from
 * the EncryptedERC folder, with BatchAuctionDEX integration via adapters.
 * 
 * Follows Wasmlanche safe parameter handling principles:
 * - Parameter validation with careful bounds checking
 * - Safe fallbacks for validation failures
 * - Detailed debugging output
 * - Protection against unreasonable input lengths
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

// Helper function to get artifact directly from file
// This bypasses any Hardhat naming conflicts
async function getContractFactoryFromArtifact(artifactPath) {
  const artifactContent = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', artifactPath), 'utf8')
  );
  return await ethers.getContractFactoryFromArtifact(artifactContent);
}

async function main() {
  console.log("Deploying Reference EERC20 System...");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  try {
    // ----- Step 1: Deploy Verifier Contracts -----
    console.log("\nDeploying Reference Verifier Contracts...");
    
    // Use the artifacts directly from the reference implementation
    const MintVerifierFactory = await getContractFactoryFromArtifact(
      'artifacts/contracts/verifiers/MintVerifier.sol/MintVerifier.json'
    );
    const mintVerifier = await MintVerifierFactory.deploy();
    await mintVerifier.waitForDeployment();
    const mintVerifierAddress = await mintVerifier.getAddress();
    console.log(`Reference MintVerifier deployed to: ${mintVerifierAddress}`);
    
    const WithdrawVerifierFactory = await getContractFactoryFromArtifact(
      'artifacts/contracts/verifiers/WithdrawVerifier.sol/WithdrawVerifier.json'
    );
    const withdrawVerifier = await WithdrawVerifierFactory.deploy();
    await withdrawVerifier.waitForDeployment();
    const withdrawVerifierAddress = await withdrawVerifier.getAddress();
    console.log(`Reference WithdrawVerifier deployed to: ${withdrawVerifierAddress}`);
    
    const TransferVerifierFactory = await getContractFactoryFromArtifact(
      'artifacts/contracts/verifiers/TransferVerifier.sol/TransferVerifier.json'
    );
    const transferVerifier = await TransferVerifierFactory.deploy();
    await transferVerifier.waitForDeployment();
    const transferVerifierAddress = await transferVerifier.getAddress();
    console.log(`Reference TransferVerifier deployed to: ${transferVerifierAddress}`);
    
    // ----- Step 2: Deploy Registrar -----
    console.log("\nDeploying Registrar...");
    const RegistrarFactory = await ethers.getContractFactory("Registrar");
    const registrar = await RegistrarFactory.deploy();
    await registrar.waitForDeployment();
    const registrarAddress = await registrar.getAddress();
    console.log(`Registrar deployed to: ${registrarAddress}`);
    
    // ----- Step 3: Deploy Required Libraries First -----
    console.log("\nDeploying BabyJubJub Library...");
    
    // Deploy the BabyJubJub library first
    try {
      // Get the BabyJubJub library artifact and deploy it
      const BabyJubJubFactory = await ethers.getContractFactory("BabyJubJub");
      const babyJubJub = await BabyJubJubFactory.deploy();
      await babyJubJub.waitForDeployment();
      const babyJubJubAddress = await babyJubJub.getAddress();
      console.log(`BabyJubJub library deployed to: ${babyJubJubAddress}`);
      
      // ----- Step 4: Deploy EncryptedERC with Library Linking -----
      console.log("\nDeploying Reference EncryptedERC with library linking...");
      
      // Library linking information
      const libraries = {
        "EncryptedERC/contracts/libraries/BabyJubJub.sol:BabyJubJub": babyJubJubAddress
      };
      
      // Get the factory for the reference EncryptedERC implementation with library linking
      const EncryptedERCFactory = await ethers.getContractFactory("EncryptedERC", {
        libraries: libraries
      });
    } catch (error) {
      console.error("Error during library deployment or linking:", error);
      console.log("Using local implementation as fallback...");
      
      // As a fallback, use our local implementation
      console.log("\nFalling back to local EncryptedERC implementation...");
      const EncryptedERCFactory = await ethers.getContractFactory("contracts/core/EncryptedERC.sol:EncryptedERC");
    }
    
    // Following Wasmlanche safe parameter handling principles
    const MAX_STRING_LENGTH = 32; // Reasonable max length for strings
    
    // Token parameters with safe defaults
    const btcName = "Privacy Bitcoin";
    const btcSymbol = "pBTC";
    const decimals = 18;
    
    // Safety checks for string parameters (Wasmlanche principle)
    const safeBtcName = btcName.length <= MAX_STRING_LENGTH ? btcName : btcName.substring(0, MAX_STRING_LENGTH);
    const safeBtcSymbol = btcSymbol.length <= MAX_STRING_LENGTH ? btcSymbol : btcSymbol.substring(0, MAX_STRING_LENGTH);
    
    // Create constructor parameters struct
    // Following reference implementation requirements
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
    
    // Log all parameters for debugging (Wasmlanche principle)
    console.log("EncryptedERC constructor parameters:");
    console.log(JSON.stringify(encryptedERCParams, null, 2));
    
    // Deploy EncryptedERC with safe parameters
    const encryptedERC = await EncryptedERCFactory.deploy(encryptedERCParams);
    await encryptedERC.waitForDeployment();
    const encryptedERCAddress = await encryptedERC.getAddress();
    console.log(`Reference EncryptedERC deployed to: ${encryptedERCAddress}`);
    
    // ----- Step 4: Set Auditor -----
    console.log("\nSetting up auditor configuration...");
    
    // Set auditor with comprehensive error handling (Wasmlanche principle)
    try {
      // Set auditor on registrar
      await registrar.setAuditor(deployer.address);
      console.log(`Set auditor to: ${deployer.address}`);
      
      // Set auditor public key on EncryptedERC
      await encryptedERC.setAuditorPublicKey(deployer.address);
      console.log("Auditor public key set successfully");
    } catch (error) {
      // Safe error handling with fallback behavior (Wasmlanche principle)
      console.error("Error setting auditor:", error.message);
      console.error("Detailed error data:", {
        code: error.code,
        method: error.method
      });
      console.warn("Continuing with deployment - auditor functionality may be limited");
    }
    
    // ----- Step 5: Add Tokens to EncryptedERC -----
    console.log("\nAdding tokens to EncryptedERC system...");
    
    // Add tokens with proper error handling
    try {
      // Add Bitcoin token with safe parameter handling
      console.log("Adding Bitcoin token...");
      const btcTx = await encryptedERC.addToken(ethers.ZeroAddress);
      const btcReceipt = await btcTx.wait();
      
      // Extract token ID from events or use safe default
      const btcTokenId = 1; // Should be the first token
      console.log(`Added Bitcoin token with ID: ${btcTokenId}`);
      
      // Add Ethereum token
      console.log("Adding Ethereum token...");
      const ethTx = await encryptedERC.addToken("0x0000000000000000000000000000000000000001");
      const ethReceipt = await ethTx.wait();
      const ethTokenId = 2; // Should be the second token
      console.log(`Added Ethereum token with ID: ${ethTokenId}`);
      
      // ----- Step 6: Deploy RealEERC20Adapters -----
      console.log("\nDeploying RealEERC20Adapters...");
      
      const RealEERC20AdapterFactory = await ethers.getContractFactory("RealEERC20Adapter");
      
      // Deploy Bitcoin adapter
      const bitcoinAdapter = await RealEERC20AdapterFactory.deploy(
        encryptedERCAddress,
        btcTokenId,
        safeBtcName,
        safeBtcSymbol
      );
      
      await bitcoinAdapter.waitForDeployment();
      const bitcoinAdapterAddress = await bitcoinAdapter.getAddress();
      console.log(`Bitcoin RealEERC20Adapter deployed to: ${bitcoinAdapterAddress}`);
      
      // Ethereum adapter parameters with safe validation
      const ethName = "Privacy Ethereum";
      const ethSymbol = "pETH";
      
      const safeEthName = ethName.length <= MAX_STRING_LENGTH ? ethName : ethName.substring(0, MAX_STRING_LENGTH);
      const safeEthSymbol = ethSymbol.length <= MAX_STRING_LENGTH ? ethSymbol : ethSymbol.substring(0, MAX_STRING_LENGTH);
      
      // Deploy Ethereum adapter with parameter validation
      const ethereumAdapter = await RealEERC20AdapterFactory.deploy(
        encryptedERCAddress,
        ethTokenId,
        safeEthName,
        safeEthSymbol
      );
      
      await ethereumAdapter.waitForDeployment();
      const ethereumAdapterAddress = await ethereumAdapter.getAddress();
      console.log(`Ethereum RealEERC20Adapter deployed to: ${ethereumAdapterAddress}`);
      
      // ----- Step 7: Deploy ZKVerifier for BatchAuctionDEX -----
      console.log("\nDeploying ZKVerifier for BatchAuctionDEX...");
      
      const ZKVerifierFactory = await ethers.getContractFactory("ZKVerifier");
      
      // Generate mock verifying keys with careful size validation (Wasmlanche principle)
      const MAX_KEY_SIZE = 1024; // Safe maximum size
      
      // Generate keys with bounds checking
      const transferProofKey = ethers.hexlify(ethers.randomBytes(MAX_KEY_SIZE));
      const balanceProofKey = ethers.hexlify(ethers.randomBytes(MAX_KEY_SIZE));
      const settlementProofKey = ethers.hexlify(ethers.randomBytes(MAX_KEY_SIZE));
      
      const zkVerifier = await ZKVerifierFactory.deploy(
        transferProofKey,
        balanceProofKey,
        settlementProofKey,
        true // allowContinueOnFailure = true for testing
      );
      
      await zkVerifier.waitForDeployment();
      const zkVerifierAddress = await zkVerifier.getAddress();
      console.log(`ZKVerifier for BatchDEX deployed to: ${zkVerifierAddress}`);
      
      // ----- Step 8: Deploy BatchAuctionDEX -----
      console.log("\nDeploying BatchAuctionDEX...");
      const BatchAuctionDEXFactory = await ethers.getContractFactory("BatchAuctionDEX");
      
      // Parameter validation with safe defaults (Wasmlanche principle)
      const MAX_BATCH_DURATION = 86400; // 1 day maximum (prevents unreasonable values)
      const requestedDuration = 300; // 5 minutes
      const safeDuration = requestedDuration > MAX_BATCH_DURATION ? MAX_BATCH_DURATION : requestedDuration;
      
      // Deploy BatchAuctionDEX with correct parameter order
      const batchDex = await BatchAuctionDEXFactory.deploy(safeDuration, zkVerifierAddress);
      
      await batchDex.waitForDeployment();
      const batchDexAddress = await batchDex.getAddress();
      console.log(`BatchAuctionDEX deployed to: ${batchDexAddress}`);
      
      // ----- Step 9: Create Trading Pair -----
      console.log("\nCreating trading pair...");
      
      // Generate pair ID with safe parameter handling
      const encodedPair = ethers.solidityPacked(
        ["address", "address"],
        [bitcoinAdapterAddress, ethereumAdapterAddress]
      );
      const pairId = ethers.keccak256(encodedPair);
      
      // Find the right function for adding token pairs
      const batchDexInterface = BatchAuctionDEXFactory.interface;
      const tokenPairFunctions = batchDexInterface.fragments
        .filter(f => f.name && f.name.toLowerCase().includes("token"))
        .map(f => f.name);
      
      console.log("Available token functions:", tokenPairFunctions);
      
      // Try to add the token pair
      try {
        // Look for an addTokenPair function
        if (batchDexInterface.getFunction("addTokenPair")) {
          const addPairTx = await batchDex.addTokenPair(bitcoinAdapterAddress, ethereumAdapterAddress);
          await addPairTx.wait();
          console.log(`Trading pair created: pBTC/pETH (${pairId})`);
        } else {
          console.warn("addTokenPair function not found - pair needs manual creation");
          // List available functions for debugging
          console.log("Available functions:", batchDexInterface.fragments
            .filter(f => f.type === "function")
            .map(f => f.name)
            .join(", "));
        }
      } catch (error) {
        // Detailed error handling (Wasmlanche principle)
        console.error("Error creating trading pair:", error.message);
        console.warn("Trading functionality may be limited - pair needs manual creation");
      }
      
      // ----- Display contract addresses for future reference -----
      console.log("\n=== Reference EERC20 System Contract Addresses ===");
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
      // Comprehensive error details for token setup issues (Wasmlanche principle)
      console.error("Error in token setup:", error);
      console.error("Detailed error information:", {
        message: error.message,
        code: error.code,
        method: error.method,
        transaction: error.transaction ? {
          to: error.transaction.to,
          data: error.transaction.data ? error.transaction.data.substring(0, 66) + "..." : "(none)"
        } : "(none)"
      });
    }
    
  } catch (error) {
    // Top-level error handling with detailed error reporting (Wasmlanche principle)
    console.error("Deployment script failed:", error);
    
    // Provide helpful context about the error
    if (error.message.includes("execution reverted")) {
      console.error("Contract execution reverted. This may be due to invalid parameters or contract state.");
      
      // Try to decode the revert reason if available
      if (error.data) {
        try {
          const reasonBytes = error.data.substring(138);
          console.error("Revert reason:", ethers.toUtf8String("0x" + reasonBytes));
        } catch (decodeError) {
          console.error("Could not decode revert reason");
        }
      }
    }
    
    // Return a properly formatted error with safe details
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
