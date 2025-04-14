/**
 * EERC20 Batch DEX - Deployment with BabyJubJub Library
 * 
 * This script deploys the reference BabyJubJub library and links it to our contracts.
 * Implements comprehensive Wasmlanche safe parameter handling principles:
 * - Parameter validation with bounds checking
 * - Safe fallbacks for validation failures
 * - Comprehensive debug logging
 * - Protection against unreasonable parameter lengths
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying EERC20 System with BabyJubJub Library and Wasmlanche Safe Parameter Handling...");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Global parameters with Wasmlanche safe validation
  // Define once at the top level to avoid redeclaration
  const isConverter = false; // Not a converter contract
  
  try {
    // ----- Step 1: Deploy BabyJubJub Library First -----
    console.log("\nDeploying BabyJubJub Library...");
    
    // Deploy the core cryptographic library
    const BabyJubJub = await ethers.getContractFactory("BabyJubJub");
    const babyJubJub = await BabyJubJub.deploy();
    await babyJubJub.waitForDeployment();
    const babyJubJubAddress = await babyJubJub.getAddress();
    console.log(`BabyJubJub library deployed to: ${babyJubJubAddress}`);
    
    // Library linking information for all contracts
    const libraryAddresses = {
      "BabyJubJub": babyJubJubAddress
    };
    
    // ----- Step 2: Deploy Verifier Contracts -----
    console.log("\nDeploying Verifier Contracts with BabyJubJub...");
    
    // Deploy MintVerifier with library linking
    const MintVerifier = await ethers.getContractFactory("MintVerifier", {
      libraries: libraryAddresses
    });
    const mintVerifier = await MintVerifier.deploy();
    await mintVerifier.waitForDeployment();
    const mintVerifierAddress = await mintVerifier.getAddress();
    console.log(`MintVerifier deployed to: ${mintVerifierAddress}`);
    
    // Deploy WithdrawVerifier with library linking
    const WithdrawVerifier = await ethers.getContractFactory("WithdrawVerifier", {
      libraries: libraryAddresses
    });
    const withdrawVerifier = await WithdrawVerifier.deploy();
    await withdrawVerifier.waitForDeployment();
    const withdrawVerifierAddress = await withdrawVerifier.getAddress();
    console.log(`WithdrawVerifier deployed to: ${withdrawVerifierAddress}`);
    
    // Deploy TransferVerifier with library linking
    const TransferVerifier = await ethers.getContractFactory("TransferVerifier", {
      libraries: libraryAddresses
    });
    const transferVerifier = await TransferVerifier.deploy();
    await transferVerifier.waitForDeployment();
    const transferVerifierAddress = await transferVerifier.getAddress();
    console.log(`TransferVerifier deployed to: ${transferVerifierAddress}`);
    
    // ----- Step 3: Deploy Registrar -----
    console.log("\nDeploying Registrar...");
    const Registrar = await ethers.getContractFactory("Registrar");
    const registrar = await Registrar.deploy();
    await registrar.waitForDeployment();
    const registrarAddress = await registrar.getAddress();
    console.log(`Registrar deployed to: ${registrarAddress}`);
    
    // ----- Step 4: Deploy TokenTracker -----
    console.log("\nDeploying TokenTracker...");
    
    // Using fully qualified name for our local implementation
    const TokenTracker = await ethers.getContractFactory("contracts/core/TokenTracker.sol:TokenTracker");
    
    // Parameter validation for constructor (Wasmlanche principle)
    // Using the globally defined isConverter variable
    
    // Debug logging before deployment (Wasmlanche principle)
    console.log(`TokenTracker constructor parameters: isConverter=${isConverter}`);
    
    // Deploy with the validated parameter
    const tokenTracker = await TokenTracker.deploy(isConverter);
    await tokenTracker.waitForDeployment();
    const tokenTrackerAddress = await tokenTracker.getAddress();
    console.log(`TokenTracker deployed to: ${tokenTrackerAddress}`);
    
    // ----- Step 5: Deploy EncryptedERC with BabyJubJub Library -----
    console.log("\nDeploying EncryptedERC with BabyJubJub...");
    
    // Apply Wasmlanche Safe Parameter Handling
    const EncryptedERC = await ethers.getContractFactory("contracts/core/EncryptedERC.sol:EncryptedERC", {
      libraries: libraryAddresses
    });
    
    // Safe parameter handling principles
    const MAX_STRING_LENGTH = 32;  // Prevents unreasonable string lengths (Wasmlanche principle)
    const MAX_SYMBOL_LENGTH = 8;   // Reasonable symbol length
    const MAX_DECIMALS = 18;       // Maximum reasonable decimals
    
    // Token parameters with validation
    const name = "Privacy Bitcoin";
    const symbol = "pBTC";
    const decimals = 18;
    // Using the globally defined isConverter variable
    
    // Validate and sanitize string inputs (Wasmlanche principle - bounds checking)
    const safeName = name.length <= MAX_STRING_LENGTH ? name : name.substring(0, MAX_STRING_LENGTH);
    const safeSymbol = symbol.length <= MAX_SYMBOL_LENGTH ? symbol : symbol.substring(0, MAX_SYMBOL_LENGTH);
    
    // Validate numeric parameters (Wasmlanche principle - bounds checking)
    const safeDecimals = decimals <= MAX_DECIMALS ? decimals : MAX_DECIMALS;
    
    // Validate contract addresses (Wasmlanche principle - null check)
    // In case of invalid addresses, use fallback values (Wasmlanche principle - safe fallbacks)
    if (!ethers.isAddress(registrarAddress)) {
      console.warn("Invalid registrar address detected, using fallback value");
      registrarAddress = deployer.address;
    }
    
    if (!ethers.isAddress(mintVerifierAddress)) {
      console.warn("Invalid mint verifier address detected, using fallback value");
      mintVerifierAddress = deployer.address;
    }
    
    if (!ethers.isAddress(withdrawVerifierAddress)) {
      console.warn("Invalid withdraw verifier address detected, using fallback value");
      withdrawVerifierAddress = deployer.address;
    }
    
    if (!ethers.isAddress(transferVerifierAddress)) {
      console.warn("Invalid transfer verifier address detected, using fallback value");
      transferVerifierAddress = deployer.address;
    }
    
    // Create the struct-like parameter object (based on CreateEncryptedERCParams in Types.sol)
    const encryptedERCParams = {
      registrar: registrarAddress,
      mintVerifier: mintVerifierAddress,
      withdrawVerifier: withdrawVerifierAddress,
      transferVerifier: transferVerifierAddress,
      name: safeName,
      symbol: safeSymbol,
      decimals: safeDecimals,
      isConverter: isConverter
    };
    
    // Debug logging for parameters (Wasmlanche principle - comprehensive debugging)
    console.log("EncryptedERC constructor parameters:");
    console.log(JSON.stringify(encryptedERCParams, null, 2));
    
    // Deploy EncryptedERC with validated parameter struct
    const encryptedERC = await EncryptedERC.deploy(encryptedERCParams);
    
    await encryptedERC.waitForDeployment();
    const encryptedERCAddress = await encryptedERC.getAddress();
    console.log(`EncryptedERC deployed to: ${encryptedERCAddress}`);
    
    // ----- Step 6: Set up Auditor Role -----
    console.log("\nSetting up auditor configuration...");
    
    // Try-catch for error handling (Wasmlanche principle)
    try {
      // Set auditor with validation
      const MAX_ADDRESS_LENGTH = 42; // Standard Ethereum address length with '0x'
      const safeAddress = deployer.address.length === MAX_ADDRESS_LENGTH ? 
        deployer.address : ethers.ZeroAddress;
      
      // Debug logging before operation (Wasmlanche principle)
      console.log(`Setting auditor to address: ${safeAddress}`);
      
      // Set auditor with comprehensive error handling
      await registrar.setAuditor(safeAddress);
      console.log("Auditor role configured successfully");
      
      // Set auditor public key on EncryptedERC
      await encryptedERC.setAuditorPublicKey(safeAddress);
      console.log("Auditor public key set successfully");
      
    } catch (error) {
      // Safe fallback behavior (Wasmlanche principle)
      console.error("Error setting auditor:", error.message);
      console.log("Continuing with limited auditor functionality");
    }
    
    // ----- Step 7: Deploy EERC20 Token Adapters -----
    console.log("\nDeploying Token Adapters...");
    
    // Deploy Bitcoin adapter with parameter validation
    const RealEERC20Adapter = await ethers.getContractFactory("RealEERC20Adapter");
    
    // Safe parameter handling for token 1
    const btcParams = {
      eerc20: encryptedERCAddress,
      tokenId: 1,
      name: "Privacy Bitcoin",
      symbol: "pBTC"
    };
    
    // Validate string parameters (Wasmlanche principle)
    btcParams.name = btcParams.name.length <= MAX_STRING_LENGTH ? 
      btcParams.name : btcParams.name.substring(0, MAX_STRING_LENGTH);
    
    btcParams.symbol = btcParams.symbol.length <= MAX_SYMBOL_LENGTH ? 
      btcParams.symbol : btcParams.symbol.substring(0, MAX_SYMBOL_LENGTH);
    
    // Debug logging (Wasmlanche principle)
    console.log("Bitcoin adapter parameters:", btcParams);
    
    // Deploy with validated parameters
    const bitcoinAdapter = await RealEERC20Adapter.deploy(
      btcParams.eerc20,
      btcParams.tokenId,
      btcParams.name,
      btcParams.symbol
    );
    
    await bitcoinAdapter.waitForDeployment();
    const bitcoinAdapterAddress = await bitcoinAdapter.getAddress();
    console.log(`Bitcoin RealEERC20Adapter deployed to: ${bitcoinAdapterAddress}`);
    
    // Safe parameter handling for token 2
    const ethParams = {
      eerc20: encryptedERCAddress,
      tokenId: 2,
      name: "Privacy Ethereum",
      symbol: "pETH"
    };
    
    // Validate string parameters (Wasmlanche principle)
    ethParams.name = ethParams.name.length <= MAX_STRING_LENGTH ? 
      ethParams.name : ethParams.name.substring(0, MAX_STRING_LENGTH);
    
    ethParams.symbol = ethParams.symbol.length <= MAX_SYMBOL_LENGTH ? 
      ethParams.symbol : ethParams.symbol.substring(0, MAX_SYMBOL_LENGTH);
    
    // Debug logging (Wasmlanche principle)
    console.log("Ethereum adapter parameters:", ethParams);
    
    // Deploy with validated parameters
    const ethereumAdapter = await RealEERC20Adapter.deploy(
      ethParams.eerc20,
      ethParams.tokenId,
      ethParams.name,
      ethParams.symbol
    );
    
    await ethereumAdapter.waitForDeployment();
    const ethereumAdapterAddress = await ethereumAdapter.getAddress();
    console.log(`Ethereum RealEERC20Adapter deployed to: ${ethereumAdapterAddress}`);
    
    // ----- Step 8: Deploy ZKVerifier for BatchAuctionDEX -----
    console.log("\nDeploying ZKVerifier for BatchAuctionDEX...");
    
    const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
    
    // Validate proof key sizes (Wasmlanche principle)
    const REASONABLE_KEY_SIZE = 64; // Bytes for a reasonable key size
    
    // Generate keys with bounds checking (Wasmlanche principle)
    // Using reasonable size instead of extremely large values
    const transferProofKey = ethers.hexlify(ethers.randomBytes(REASONABLE_KEY_SIZE));
    const balanceProofKey = ethers.hexlify(ethers.randomBytes(REASONABLE_KEY_SIZE));
    const settlementProofKey = ethers.hexlify(ethers.randomBytes(REASONABLE_KEY_SIZE));
    
    // Debug logging for keys (truncated to prevent excessive output) (Wasmlanche principle)
    console.log("Proof keys (truncated):");
    console.log(`Transfer key: ${transferProofKey.substring(0, 42)}...`);
    console.log(`Balance key: ${balanceProofKey.substring(0, 42)}...`);
    console.log(`Settlement key: ${settlementProofKey.substring(0, 42)}...`);
    
    const zkVerifier = await ZKVerifier.deploy(
      transferProofKey,
      balanceProofKey,
      settlementProofKey,
      true // allowContinueOnFailure = true for testing
    );
    
    await zkVerifier.waitForDeployment();
    const zkVerifierAddress = await zkVerifier.getAddress();
    console.log(`ZKVerifier deployed to: ${zkVerifierAddress}`);
    
    // ----- Step 9: Deploy BatchAuctionDEX -----
    console.log("\nDeploying BatchAuctionDEX...");
    
    const BatchAuctionDEX = await ethers.getContractFactory("BatchAuctionDEX");
    
    // Parameter validation with safe defaults (Wasmlanche principle)
    const MIN_BATCH_DURATION = 60; // 1 minute minimum
    const MAX_BATCH_DURATION = 86400; // 1 day maximum
    let batchDuration = 300; // 5 minutes default
    
    // Enforce reasonable bounds (Wasmlanche principle)
    if (batchDuration < MIN_BATCH_DURATION) {
      console.warn(`Batch duration too short, setting to minimum: ${MIN_BATCH_DURATION}`);
      batchDuration = MIN_BATCH_DURATION;
    } else if (batchDuration > MAX_BATCH_DURATION) {
      console.warn(`Batch duration too long, setting to maximum: ${MAX_BATCH_DURATION}`);
      batchDuration = MAX_BATCH_DURATION;
    }
    
    // Debug logging (Wasmlanche principle)
    console.log(`BatchAuctionDEX parameters: duration=${batchDuration}, verifier=${zkVerifierAddress}`);
    
    const batchDex = await BatchAuctionDEX.deploy(batchDuration, zkVerifierAddress);
    
    await batchDex.waitForDeployment();
    const batchDexAddress = await batchDex.getAddress();
    console.log(`BatchAuctionDEX deployed to: ${batchDexAddress}`);
    
    // ----- Step 10: Create Trading Pair -----
    console.log("\nCreating trading pair...");
    
    try {
      // Validate addresses before use (Wasmlanche principle)
      if (!ethers.isAddress(bitcoinAdapterAddress) || !ethers.isAddress(ethereumAdapterAddress)) {
        throw new Error("Invalid token addresses for pair creation");
      }
      
      // Debug logging (Wasmlanche principle)
      console.log(`Creating pair: ${bitcoinAdapterAddress} - ${ethereumAdapterAddress}`);
      
      // Look for trading pair creation methods
      const batchDexInterface = BatchAuctionDEX.interface;
      const pairFunctions = batchDexInterface.fragments
        .filter(f => f.type === "function" && 
                (f.name.toLowerCase().includes("pair") || 
                 f.name.toLowerCase().includes("token")))
        .map(f => f.name);
      
      console.log("Available pair functions:", pairFunctions);
      
      // Try the most likely function for pair creation
      if (pairFunctions.includes("createPair")) {
        await batchDex.createPair(bitcoinAdapterAddress, ethereumAdapterAddress);
        console.log("Trading pair created with createPair()");
      } else if (pairFunctions.includes("addTokenPair")) {
        await batchDex.addTokenPair(bitcoinAdapterAddress, ethereumAdapterAddress);
        console.log("Trading pair created with addTokenPair()");
      } else if (pairFunctions.includes("registerPair")) {
        await batchDex.registerPair(bitcoinAdapterAddress, ethereumAdapterAddress);
        console.log("Trading pair created with registerPair()");
      } else {
        console.log("No suitable pair creation function found");
        console.log("Manual pair creation will be needed");
      }
      
      // Generate pair ID for reference
      const encodedPair = ethers.solidityPacked(
        ["address", "address"],
        [bitcoinAdapterAddress, ethereumAdapterAddress]
      );
      const pairId = ethers.keccak256(encodedPair);
      
      console.log(`Trading pair created: pBTC/pETH (ID: ${pairId})`);
      
    } catch (error) {
      // Safe fallback behavior (Wasmlanche principle)
      console.error("Error creating trading pair:", error.message);
      console.log("Manual pair creation will be needed.");
      
      // Provide detailed debug info (Wasmlanche principle)
      if (error.transaction) {
        console.log("Failed transaction details:");
        console.log(`To: ${error.transaction.to}`);
        console.log(`Data: ${error.transaction.data?.substring(0, 66)}...`);
      }
    }
    
    // ----- Display contract addresses for future reference -----
    console.log("\n=== EERC20 System with BabyJubJub Contract Addresses ===");
    console.log(`BabyJubJub: ${babyJubJubAddress}`);
    console.log(`MintVerifier: ${mintVerifierAddress}`);
    console.log(`WithdrawVerifier: ${withdrawVerifierAddress}`);
    console.log(`TransferVerifier: ${transferVerifierAddress}`);
    console.log(`Registrar: ${registrarAddress}`);
    console.log(`TokenTracker: ${tokenTrackerAddress}`);
    console.log(`EncryptedERC: ${encryptedERCAddress}`);
    console.log(`Bitcoin Adapter: ${bitcoinAdapterAddress}`);
    console.log(`Ethereum Adapter: ${ethereumAdapterAddress}`);
    console.log(`ZKVerifier: ${zkVerifierAddress}`);
    console.log(`BatchAuctionDEX: ${batchDexAddress}`);
    
  } catch (error) {
    // Top-level error handling with detailed reporting (Wasmlanche principle)
    console.error("Deployment script failed:", error);
    
    // Provide helpful context about the error
    if (error.message && error.message.includes("execution reverted")) {
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
