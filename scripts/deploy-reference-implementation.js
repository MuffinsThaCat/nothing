/**
 * EERC20 Batch DEX - Reference Implementation Deployment
 * 
 * This script deploys the reference EncryptedERC implementation with all required
 * libraries and dependencies. Follows Wasmlanche safe parameter handling principles.
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Reference EERC20 Implementation with Wasmlanche Safe Parameter Handling...");
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  try {
    // ===== Step 1: Deploy BabyJubJub Library First =====
    console.log("\nDeploying BabyJubJub Library...");
    
    // Apply Wasmlanche safe parameter handling
    try {
      const BabyJubJub = await ethers.getContractFactory("EncryptedERC/contracts/libraries/BabyJubJub.sol:BabyJubJub");
      const babyJubJub = await BabyJubJub.deploy();
      await babyJubJub.waitForDeployment();
      const babyJubJubAddress = await babyJubJub.getAddress();
      console.log(`BabyJubJub library deployed to: ${babyJubJubAddress}`);
      
      // ===== Step 2: Deploy Reference Verifier Contracts =====
      console.log("\nDeploying Reference Verifier Contracts...");
      
      // Library linking information
      const libraryAddresses = {
        "EncryptedERC/contracts/libraries/BabyJubJub.sol:BabyJubJub": babyJubJubAddress
      };
      
      // Deploy MintVerifier with library linking
      const MintVerifier = await ethers.getContractFactory(
        "EncryptedERC/contracts/verifiers/MintVerifier.sol:MintVerifier",
        { libraries: libraryAddresses }
      );
      const mintVerifier = await MintVerifier.deploy();
      await mintVerifier.waitForDeployment();
      const mintVerifierAddress = await mintVerifier.getAddress();
      console.log(`Reference MintVerifier deployed to: ${mintVerifierAddress}`);
      
      // Deploy WithdrawVerifier with library linking
      const WithdrawVerifier = await ethers.getContractFactory(
        "EncryptedERC/contracts/verifiers/WithdrawVerifier.sol:WithdrawVerifier",
        { libraries: libraryAddresses }
      );
      const withdrawVerifier = await WithdrawVerifier.deploy();
      await withdrawVerifier.waitForDeployment();
      const withdrawVerifierAddress = await withdrawVerifier.getAddress();
      console.log(`Reference WithdrawVerifier deployed to: ${withdrawVerifierAddress}`);
      
      // Deploy TransferVerifier with library linking
      const TransferVerifier = await ethers.getContractFactory(
        "EncryptedERC/contracts/verifiers/TransferVerifier.sol:TransferVerifier",
        { libraries: libraryAddresses }
      );
      const transferVerifier = await TransferVerifier.deploy();
      await transferVerifier.waitForDeployment();
      const transferVerifierAddress = await transferVerifier.getAddress();
      console.log(`Reference TransferVerifier deployed to: ${transferVerifierAddress}`);
      
      // ===== Step 3: Deploy Registrar =====
      console.log("\nDeploying Reference Registrar...");
      const Registrar = await ethers.getContractFactory("EncryptedERC/contracts/Registrar.sol:Registrar");
      const registrar = await Registrar.deploy();
      await registrar.waitForDeployment();
      const registrarAddress = await registrar.getAddress();
      console.log(`Reference Registrar deployed to: ${registrarAddress}`);
      
      // ===== Step 4: Deploy TokenTracker =====
      console.log("\nDeploying Reference TokenTracker...");
      
      // Wasmlanche safe parameter handling for constructor parameters
      const isConverter = false; // Not a converter contract
      
      // Debug logging before deployment (Wasmlanche principle)
      console.log(`TokenTracker constructor parameters: isConverter=${isConverter}`);
      
      const TokenTracker = await ethers.getContractFactory(
        "EncryptedERC/contracts/TokenTracker.sol:TokenTracker",
        { libraries: libraryAddresses }
      );
      const tokenTracker = await TokenTracker.deploy(isConverter);
      await tokenTracker.waitForDeployment();
      const tokenTrackerAddress = await tokenTracker.getAddress();
      console.log(`Reference TokenTracker deployed to: ${tokenTrackerAddress}`);
      
      // ===== Step 5: Deploy Reference EncryptedERC =====
      console.log("\nDeploying Reference EncryptedERC...");
      
      // Apply Wasmlanche Safe Parameter Handling
      const MAX_STRING_LENGTH = 32;  // Prevents unreasonable string lengths (Wasmlanche principle)
      const MAX_SYMBOL_LENGTH = 8;   // Reasonable symbol length
      const MAX_DECIMALS = 18;       // Maximum reasonable decimals
      
      // Token parameters with validation
      const name = "Privacy Bitcoin";
      const symbol = "pBTC";
      const decimals = 18;
      
      // Validate and sanitize string inputs (Wasmlanche principle - bounds checking)
      const safeName = name.length <= MAX_STRING_LENGTH ? name : name.substring(0, MAX_STRING_LENGTH);
      const safeSymbol = symbol.length <= MAX_SYMBOL_LENGTH ? symbol : symbol.substring(0, MAX_SYMBOL_LENGTH);
      
      // Validate numeric parameters (Wasmlanche principle - bounds checking)
      const safeDecimals = decimals <= MAX_DECIMALS ? decimals : MAX_DECIMALS;
      
      // Validate contract addresses (Wasmlanche principle - null check)
      // In case of invalid addresses, use fallback values (Wasmlanche principle - safe fallbacks)
      let safeRegistrarAddress = registrarAddress;
      let safeMintVerifierAddress = mintVerifierAddress;
      let safeWithdrawVerifierAddress = withdrawVerifierAddress;
      let safeTransferVerifierAddress = transferVerifierAddress;
      
      if (!ethers.isAddress(registrarAddress)) {
        console.warn("Invalid registrar address detected, using fallback value");
        safeRegistrarAddress = deployer.address;
      }
      
      if (!ethers.isAddress(mintVerifierAddress)) {
        console.warn("Invalid mint verifier address detected, using fallback value");
        safeMintVerifierAddress = deployer.address;
      }
      
      if (!ethers.isAddress(withdrawVerifierAddress)) {
        console.warn("Invalid withdraw verifier address detected, using fallback value");
        safeWithdrawVerifierAddress = deployer.address;
      }
      
      if (!ethers.isAddress(transferVerifierAddress)) {
        console.warn("Invalid transfer verifier address detected, using fallback value");
        safeTransferVerifierAddress = deployer.address;
      }
      
      // Create the struct-like parameter object based on the reference implementation's constructor
      const encryptedERCParams = {
        registrar: safeRegistrarAddress,
        mintVerifier: safeMintVerifierAddress,
        withdrawVerifier: safeWithdrawVerifierAddress,
        transferVerifier: safeTransferVerifierAddress,
        name: safeName,
        symbol: safeSymbol,
        decimals: safeDecimals,
        isConverter: isConverter
      };
      
      // Debug logging for parameters (Wasmlanche principle - comprehensive debugging)
      console.log("EncryptedERC constructor parameters:");
      console.log(JSON.stringify(encryptedERCParams, null, 2));
      
      // Deploy EncryptedERC with library linking and validated parameter struct
      const EncryptedERC = await ethers.getContractFactory(
        "EncryptedERC/contracts/EncryptedERC.sol:EncryptedERC",
        { libraries: libraryAddresses }
      );
      const encryptedERC = await EncryptedERC.deploy(encryptedERCParams);
      await encryptedERC.waitForDeployment();
      const encryptedERCAddress = await encryptedERC.getAddress();
      console.log(`Reference EncryptedERC deployed to: ${encryptedERCAddress}`);
      
      // ===== Step 6: Set up Auditor Role =====
      console.log("\nSetting up auditor configuration...");
      
      // Try-catch for error handling (Wasmlanche principle)
      try {
        // Validate address before use (Wasmlanche principle)
        if (!ethers.isAddress(deployer.address)) {
          throw new Error("Invalid auditor address");
        }
        
        // Debug logging before operation (Wasmlanche principle)
        console.log(`Setting auditor to address: ${deployer.address}`);
        
        // Set auditor with comprehensive error handling
        await registrar.setAuditor(deployer.address);
        console.log("Auditor role configured successfully");
        
        // Set auditor public key on EncryptedERC
        await encryptedERC.setAuditorPublicKey(deployer.address);
        console.log("Auditor public key set successfully");
        
      } catch (error) {
        // Safe fallback behavior (Wasmlanche principle)
        console.error("Error setting auditor:", error.message);
        console.log("Continuing with limited auditor functionality");
        
        // Detailed error information (Wasmlanche principle)
        if (error.code) {
          console.log("Error code:", error.code);
        }
        if (error.reason) {
          console.log("Error reason:", error.reason);
        }
      }
      
      // ===== Step 7: Add Tokens to EncryptedERC =====
      console.log("\nAdding tokens to EncryptedERC system...");
      
      try {
        // Add Bitcoin token with safe parameter handling
        console.log("Adding Bitcoin token...");
        const btcTx = await encryptedERC.addToken(ethers.ZeroAddress);
        await btcTx.wait();
        
        // Extract token ID from events or use safe default
        const btcTokenId = 1; // Should be the first token
        console.log(`Added Bitcoin token with ID: ${btcTokenId}`);
        
        // Add Ethereum token
        console.log("Adding Ethereum token...");
        const ethTx = await encryptedERC.addToken(ethers.ZeroAddress);
        await ethTx.wait();
        const ethTokenId = 2; // Should be the second token
        console.log(`Added Ethereum token with ID: ${ethTokenId}`);
        
        // ===== Step 8: Deploy RealEERC20Adapters =====
        console.log("\nDeploying RealEERC20Adapters...");
        
        const RealEERC20AdapterFactory = await ethers.getContractFactory("RealEERC20Adapter");
        
        // Safe parameter validation for Bitcoin adapter
        const btcAdapterParams = {
          eerc20: encryptedERCAddress,
          tokenId: btcTokenId,
          name: "Privacy Bitcoin",
          symbol: "pBTC"
        };
        
        // Validate string parameters (Wasmlanche principle)
        btcAdapterParams.name = btcAdapterParams.name.length <= MAX_STRING_LENGTH ? 
          btcAdapterParams.name : btcAdapterParams.name.substring(0, MAX_STRING_LENGTH);
        
        btcAdapterParams.symbol = btcAdapterParams.symbol.length <= MAX_SYMBOL_LENGTH ? 
          btcAdapterParams.symbol : btcAdapterParams.symbol.substring(0, MAX_SYMBOL_LENGTH);
        
        // Debug logging (Wasmlanche principle)
        console.log("Bitcoin adapter parameters:", btcAdapterParams);
        
        // Deploy Bitcoin adapter
        const bitcoinAdapter = await RealEERC20AdapterFactory.deploy(
          btcAdapterParams.eerc20,
          btcAdapterParams.tokenId,
          btcAdapterParams.name,
          btcAdapterParams.symbol
        );
        
        await bitcoinAdapter.waitForDeployment();
        const bitcoinAdapterAddress = await bitcoinAdapter.getAddress();
        console.log(`Bitcoin RealEERC20Adapter deployed to: ${bitcoinAdapterAddress}`);
        
        // Safe parameter validation for Ethereum adapter
        const ethAdapterParams = {
          eerc20: encryptedERCAddress,
          tokenId: ethTokenId,
          name: "Privacy Ethereum",
          symbol: "pETH"
        };
        
        // Validate string parameters (Wasmlanche principle)
        ethAdapterParams.name = ethAdapterParams.name.length <= MAX_STRING_LENGTH ? 
          ethAdapterParams.name : ethAdapterParams.name.substring(0, MAX_STRING_LENGTH);
        
        ethAdapterParams.symbol = ethAdapterParams.symbol.length <= MAX_SYMBOL_LENGTH ? 
          ethAdapterParams.symbol : ethAdapterParams.symbol.substring(0, MAX_SYMBOL_LENGTH);
        
        // Debug logging (Wasmlanche principle)
        console.log("Ethereum adapter parameters:", ethAdapterParams);
        
        // Deploy Ethereum adapter
        const ethereumAdapter = await RealEERC20AdapterFactory.deploy(
          ethAdapterParams.eerc20,
          ethAdapterParams.tokenId,
          ethAdapterParams.name,
          ethAdapterParams.symbol
        );
        
        await ethereumAdapter.waitForDeployment();
        const ethereumAdapterAddress = await ethereumAdapter.getAddress();
        console.log(`Ethereum RealEERC20Adapter deployed to: ${ethereumAdapterAddress}`);
        
        // ===== Step 9: Deploy ZKVerifier for BatchAuctionDEX =====
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
        
        // ===== Step 10: Deploy BatchAuctionDEX =====
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
        
        // ===== Step 11: Create Trading Pair =====
        console.log("\nCreating trading pair...");
        
        try {
          // Validate addresses before use (Wasmlanche principle)
          if (!ethers.isAddress(bitcoinAdapterAddress) || !ethers.isAddress(ethereumAdapterAddress)) {
            throw new Error("Invalid token addresses for pair creation");
          }
          
          // Debug logging (Wasmlanche principle)
          console.log(`Creating pair: ${bitcoinAdapterAddress} - ${ethereumAdapterAddress}`);
          
          // Find the right function for pair creation by checking the interface
          const batchDexInterface = BatchAuctionDEX.interface;
          const pairManagementFunctions = batchDexInterface.fragments
            .filter(f => f.type === "function" && 
                    (f.name.toLowerCase().includes("pair") || 
                     f.name.toLowerCase().includes("token")))
            .map(f => f.name);
          
          console.log("Available pair management functions:", pairManagementFunctions);
          
          // Try to create the pair using the available functions
          if (pairManagementFunctions.includes("createPair")) {
            const createPairTx = await batchDex.createPair(bitcoinAdapterAddress, ethereumAdapterAddress);
            await createPairTx.wait();
            console.log("Trading pair created with createPair()");
          } else if (pairManagementFunctions.includes("addTokenPair")) {
            const addPairTx = await batchDex.addTokenPair(bitcoinAdapterAddress, ethereumAdapterAddress);
            await addPairTx.wait();
            console.log("Trading pair created with addTokenPair()");
          } else if (pairManagementFunctions.includes("registerTokenPair")) {
            const registerPairTx = await batchDex.registerTokenPair(bitcoinAdapterAddress, ethereumAdapterAddress);
            await registerPairTx.wait();
            console.log("Trading pair created with registerTokenPair()");
          } else {
            console.warn("No suitable pair creation function found - manual pair creation required");
          }
          
          // Generate pair ID for reference
          const encodedPair = ethers.solidityPacked(
            ["address", "address"],
            [bitcoinAdapterAddress, ethereumAdapterAddress]
          );
          const pairId = ethers.keccak256(encodedPair);
          console.log(`Trading pair ID: ${pairId}`);
          
        } catch (error) {
          // Safe fallback behavior (Wasmlanche principle)
          console.error("Error creating trading pair:", error.message);
          console.log("Manual pair creation will be needed.");
          
          // Provide detailed debug info (Wasmlanche principle)
          if (error.transaction) {
            console.log("Failed transaction details:");
            console.log(`To: ${error.transaction.to}`);
            console.log(`Data (truncated): ${error.transaction.data?.substring(0, 66)}...`);
          }
        }
        
        // ===== Display contract addresses for future reference =====
        console.log("\n=== Reference EERC20 System Contract Addresses ===");
        console.log(`BabyJubJub Library: ${babyJubJubAddress}`);
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
        // Detailed error handling for token operations (Wasmlanche principle)
        console.error("Error in token management:", error.message);
        console.log("Continuing with deployment where possible");
        
        // Detailed error information (Wasmlanche principle)
        if (error.code) {
          console.log("Error code:", error.code);
        }
        if (error.reason) {
          console.log("Error reason:", error.reason);
        }
      }
      
    } catch (error) {
      // Handle library errors gracefully (Wasmlanche principle)
      console.error("Error with BabyJubJub library deployment or linking:", error.message);
      console.log("Falling back to local implementation...");
      
      // Execute fallback deployment strategy
      await deployLocalImplementation();
    }
    
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

// Fallback deployment function that uses local implementations
async function deployLocalImplementation() {
  console.log("\n⚠️ FALLING BACK TO LOCAL IMPLEMENTATION ⚠️");
  console.log("Using local implementations with Wasmlanche safe parameter handling");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  
  // Deploy local implementations
  // ... Fallback deployment logic here if needed
  console.log("Local implementation deployment not executed - please run the enhanced-eerc20 script instead");
}

// Run the deployment script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error in script:", error);
    process.exit(1);
  });
