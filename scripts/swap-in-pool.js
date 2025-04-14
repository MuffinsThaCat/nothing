/**
 * EERC20 Batch DEX - Swap Tokens in Pool
 * 
 * This script demonstrates creating a trading pair and swapping tokens in a pool
 * following Wasmlanche safe parameter handling principles:
 * - Parameter validation with bounds checking
 * - Safe fallbacks for validation failures
 * - Comprehensive debug logging
 * - Protection against unreasonable parameter lengths
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("Setting up Privacy-Preserving Swap in BatchAuctionDEX...");
  
  // Get signers representing different users
  const [deployer, trader1, trader2] = await ethers.getSigners();
  console.log(`Deployer/Operator: ${deployer.address}`);
  console.log(`Trader 1: ${trader1.address}`);
  console.log(`Trader 2: ${trader2.address}`);
  
  try {
    // ----- Step 1: Load contract instances from the last deployment -----
    console.log("\nLoading previously deployed contracts...");
    
    // Following Wasmlanche principles - validate addresses before use
    // For this example, replace these with your actual deployed addresses from the previous script
    // In a production environment, these would be loaded from a configuration file with validation
    
    const encryptedERCAddress = "0x51A1ceB83B83F1985a81C295d1fF28Afef186E02";
    const bitcoinAdapterAddress = "0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B";
    const ethereumAdapterAddress = "0xBEc49fA140aCaA83533fB00A2BB19bDdd0290f25";
    const batchDexAddress = "0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5";
    
    // Validate addresses - Wasmlanche principle: parameter validation
    const addressLength = 42; // Standard Ethereum address with '0x'
    
    // Function to validate addresses with fallback (Wasmlanche principle: safe fallbacks)
    function validateAddress(address, name, fallbackAddress) {
      const isValid = ethers.isAddress(address) && address.length === addressLength;
      if (!isValid) {
        console.warn(`Invalid ${name} address. Using fallback.`);
        return fallbackAddress;
      }
      return address;
    }
    
    // Apply validation to all addresses
    const safeEncryptedERCAddress = validateAddress(encryptedERCAddress, "EncryptedERC", deployer.address);
    const safeBitcoinAdapterAddress = validateAddress(bitcoinAdapterAddress, "Bitcoin Adapter", deployer.address);
    const safeEthereumAdapterAddress = validateAddress(ethereumAdapterAddress, "Ethereum Adapter", deployer.address);
    const safeBatchDexAddress = validateAddress(batchDexAddress, "BatchAuctionDEX", deployer.address);
    
    // Get contract instances
    const EncryptedERC = await ethers.getContractFactory("contracts/core/EncryptedERC.sol:EncryptedERC");
    const encryptedERC = await EncryptedERC.attach(safeEncryptedERCAddress);
    
    const RealEERC20Adapter = await ethers.getContractFactory("RealEERC20Adapter");
    const bitcoinAdapter = await RealEERC20Adapter.attach(safeBitcoinAdapterAddress);
    const ethereumAdapter = await RealEERC20Adapter.attach(safeEthereumAdapterAddress);
    
    const BatchAuctionDEX = await ethers.getContractFactory("BatchAuctionDEX");
    const batchDex = await BatchAuctionDEX.attach(safeBatchDexAddress);
    
    // ----- Step 2: Create the token pair in the DEX (if not already created) -----
    console.log("\nCreating token pair in BatchAuctionDEX...");
    
    try {
      // Generate the pair ID to check if it already exists
      const encodedPair = ethers.solidityPacked(
        ["address", "address"],
        [safeBitcoinAdapterAddress, safeEthereumAdapterAddress]
      );
      const pairId = ethers.keccak256(encodedPair);
      console.log(`Pair ID: ${pairId}`);
      
      // Try to add the pair
      try {
        // Try to get pair info first to check if it exists
        const pairInfo = await batchDex.tokenPairs(pairId);
        if (pairInfo.exists) {
          console.log("Token pair already exists, skipping creation.");
        } else {
          throw new Error("Pair doesn't exist, creating now.");
        }
      } catch (error) {
        console.log("Creating new token pair...");
        const addPairTx = await batchDex.addTokenPair(
          safeBitcoinAdapterAddress,
          safeEthereumAdapterAddress,
          true,  // Both are EERC20 tokens
          true
        );
        await addPairTx.wait();
        console.log("Token pair created successfully!");
      }
      
      // ----- Step 3: Mint privacy tokens for trading -----
      console.log("\nMinting privacy tokens for trading...");
      
      // In a real implementation, we would generate actual zero-knowledge proofs
      // For this demonstration, we'll use mock values and assume the proofs validate
      
      // Prepare mock encrypted data and ZK proof
      // Wasmlanche principle: reasonable parameter lengths
      const REASONABLE_SIZE = 64; // 64 bytes for mock data
      
      // Generate mock encrypted data and ZK proof for minting
      // In production, these would be real encrypted values and ZK proofs
      const mintAmount = ethers.parseEther("100"); // 100 tokens
      const mockEncryptedAmount = ethers.hexlify(ethers.randomBytes(REASONABLE_SIZE));
      const mockZKProof = ethers.hexlify(ethers.randomBytes(REASONABLE_SIZE));
      
      // Debug logging (Wasmlanche principle)
      console.log("Mock encrypted mint data (first 20 bytes): " + mockEncryptedAmount.substring(0, 42) + "...");
      
      // In a real implementation, we would:
      // 1. Generate real ZK proofs for minting
      // 2. Call the mint function on the privacy tokens
      
      console.log("Would mint 100 pBTC and 100 pETH tokens for each trader");
      console.log("In a real implementation, this would use proper ZK proofs");
      
      // ----- Step 4: Place orders in the batch auction -----
      console.log("\nPlacing orders in the batch auction...");
      
      // In a real implementation, these would be properly encrypted with ZK proofs
      // Checking the current batch deadline
      const currentBatchId = await batchDex.batchId();
      const currentDeadline = await batchDex.batchDeadline();
      
      console.log(`Current batch ID: ${currentBatchId}`);
      console.log(`Batch deadline: ${new Date(Number(currentDeadline) * 1000).toLocaleString()}`);
      
      // Check if we need to start a new batch
      const now = Math.floor(Date.now() / 1000);
      
      if (now >= Number(currentDeadline)) {
        console.log("Starting a new batch auction...");
        const newBatchTx = await batchDex.startNewBatch();
        await newBatchTx.wait();
        console.log("New batch started");
      }
      
      // Generate mock order data
      // Trader 1 places a buy order for pBTC
      // Trader 2 places a sell order for pBTC
      
      const mockOrderData = {
        pairId,
        buyPrice: ethers.parseEther("1"),   // 1 pETH per pBTC
        sellPrice: ethers.parseEther("0.9"), // 0.9 pETH per pBTC
        buyAmount: mockEncryptedAmount,
        sellAmount: mockEncryptedAmount,
        buyProof: mockZKProof,
        sellProof: mockZKProof
      };
      
      console.log("Preparing to place mock orders for demonstration:");
      console.log(`- Buy order: 1 pETH per pBTC (trader 1)`);
      console.log(`- Sell order: 0.9 pETH per pBTC (trader 2)`);
      
      // In a real implementation with actual proofs, we would:
      /* 
      // Place buy order from trader 1
      await batchDex.connect(trader1).placeOrder(
        mockOrderData.pairId,
        0, // BUY
        mockOrderData.buyPrice,
        mockOrderData.buyAmount,
        mockOrderData.buyProof
      );
      
      // Place sell order from trader 2
      await batchDex.connect(trader2).placeOrder(
        mockOrderData.pairId,
        1, // SELL
        mockOrderData.sellPrice,
        mockOrderData.sellAmount,
        mockOrderData.sellProof
      );
      */
      
      // ----- Step 5: Settle the batch auction -----
      console.log("\nSettling the batch auction (simulation)...");
      
      // In a real implementation, after placing orders and waiting for the batch to close:
      /*
      // Prepare settlement data
      const settlementPrice = ethers.parseEther("0.95"); // Clearing price between buy and sell
      const matchedOrderIds = [buyOrderId, sellOrderId]; // IDs of the matched orders
      const fillAmountHashes = [
        ethers.hexlify(ethers.randomBytes(REASONABLE_SIZE)),
        ethers.hexlify(ethers.randomBytes(REASONABLE_SIZE))
      ]; // Encrypted fill amounts
      const settlementProof = ethers.hexlify(ethers.randomBytes(REASONABLE_SIZE)); // ZK proof
      
      // Settle the batch
      await batchDex.settleBatch(
        pairId,
        settlementPrice,
        matchedOrderIds,
        fillAmountHashes,
        settlementProof
      );
      */
      
      console.log("In a production environment, we would now:");
      console.log("1. Wait for orders to be placed");
      console.log("2. Wait for the batch deadline to pass");
      console.log("3. Compute the clearing price");
      console.log("4. Generate valid settlement proofs");
      console.log("5. Execute the batch settlement transaction");
      
      // ----- Step 6: Show the result of the swap -----
      console.log("\nExpected result after swap (simulation):");
      console.log("- Trader 1 would receive pBTC in exchange for pETH");
      console.log("- Trader 2 would receive pETH in exchange for pBTC");
      console.log("- All transactions would maintain balance privacy through zero-knowledge proofs");
      
    } catch (error) {
      // Token pair creation error (Wasmlanche principle: detailed error handling)
      console.error("Error creating token pair:", error.message);
      if (error.data) {
        try {
          const reasonBytes = error.data.substring(138);
          console.error("Revert reason:", ethers.toUtf8String("0x" + reasonBytes));
        } catch (decodeError) {
          console.error("Could not decode revert reason");
        }
      }
    }
    
    // ----- Step 7: Summary of auction setup -----
    console.log("\n=== Privacy-Preserving Swap Setup Complete ===");
    console.log(`EncryptedERC: ${safeEncryptedERCAddress}`);
    console.log(`Bitcoin Adapter: ${safeBitcoinAdapterAddress}`);
    console.log(`Ethereum Adapter: ${safeEthereumAdapterAddress}`);
    console.log(`BatchAuctionDEX: ${safeBatchDexAddress}`);
    console.log("\nTo execute a real swap with zero-knowledge proofs, you would need to:");
    console.log("1. Generate real ZK proofs for minting and balance verification");
    console.log("2. Create encrypted orders with valid proofs");
    console.log("3. Generate valid settlement proofs");
    console.log("4. Execute the settlement with proper cryptographic validation");
    console.log("\nAll operations would maintain privacy while ensuring correctness through ZK proofs");
    
  } catch (error) {
    // Top-level error handling with detailed reporting (Wasmlanche principle)
    console.error("Script execution failed:", error);
    
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

// Run the swap script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error in script:", error);
    process.exit(1);
  });
