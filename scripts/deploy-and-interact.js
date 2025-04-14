/**
 * EERC20 Batch DEX Deployment and Interaction Script
 * 
 * This script deploys the core contracts and demonstrates basic interactions:
 * 1. Deploy ZKVerifier
 * 2. Deploy BatchAuctionDEX
 * 3. Set up a trading pair
 * 4. Place orders
 * 5. Trigger a batch auction
 * 
 * Following Wasmlanche safe parameter handling principles:
 * - Input validation with proper bounds checking
 * - Safe fallback handling
 * - Comprehensive debug logging
 */

const { ethers } = require("hardhat");

// Deploy contracts and run basic interactions
async function main() {
  console.log("Deploying EERC20 Batch DEX contracts...");
  
  // Get signers
  const [deployer, user1, user2, user3, user4] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // ----- Deploy ZKVerifier -----
  console.log("\nDeploying ZKVerifier...");
  const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
  
  // Following Wasmlanche safe parameter handling principles
  // Create mock verifying keys with proper size limits
  const MAX_KEY_SIZE = 1024; // Safe maximum size (much smaller than contract's 32KB limit)
  
  // Generate mock verifying keys for testing
  // In a real deployment, these would be actual verifying keys
  const transferProofKey = ethers.utils.hexlify(ethers.utils.randomBytes(MAX_KEY_SIZE));
  const balanceProofKey = ethers.utils.hexlify(ethers.utils.randomBytes(MAX_KEY_SIZE));
  const settlementProofKey = ethers.utils.hexlify(ethers.utils.randomBytes(MAX_KEY_SIZE));
  
  // Log exact key lengths for debugging
  console.log(`Generated mock verifying keys (length: ${transferProofKey.length / 2 - 1} bytes)`);
  
  // Deploy with constructor parameters
  const zkVerifier = await ZKVerifier.deploy(
    transferProofKey,
    balanceProofKey,
    settlementProofKey,
    true // allowContinueOnFailure = true for testing
  );
  
  await zkVerifier.deployed();
  console.log(`ZKVerifier deployed to: ${zkVerifier.address}`);
  
  // ----- Deploy BatchAuctionDEX -----
  console.log("\nDeploying BatchAuctionDEX...");
  const BatchAuctionDEX = await ethers.getContractFactory("BatchAuctionDEX");
  const batchDuration = 300; // 5 minutes
  const batchDex = await BatchAuctionDEX.deploy(zkVerifier.address, batchDuration);
  await batchDex.deployed();
  console.log(`BatchAuctionDEX deployed to: ${batchDex.address}`);
  
  // ----- Deploy Test Tokens -----
  console.log("\nDeploying test tokens...");
  const TokenFactory = await ethers.getContractFactory("EERC20Token");
  
  // Token A - representing BTC
  const tokenA = await TokenFactory.deploy("Bitcoin", "BTC");
  await tokenA.deployed();
  console.log(`Token A (BTC) deployed to: ${tokenA.address}`);
  
  // Token B - representing ETH
  const tokenB = await TokenFactory.deploy("Ethereum", "ETH");
  await tokenB.deployed();
  console.log(`Token B (ETH) deployed to: ${tokenB.address}`);
  
  // ----- Create Trading Pair -----
  console.log("\nCreating trading pair...");
  
  // Following Wasmlanche safe parameter handling principles
  try {
    // Generate pair ID
    const pairId = ethers.utils.solidityKeccak256(
      ["address", "address"],
      [tokenA.address, tokenB.address]
    );
    
    // Add token pair to DEX
    const addPairTx = await batchDex.addTokenPair(tokenA.address, tokenB.address);
    await addPairTx.wait();
    
    console.log(`Trading pair created: BTC/ETH (${pairId})`);
    
    // ----- Mint tokens to users for testing -----
    console.log("\nMinting tokens to users...");
    
    // Proper bounds checking to prevent excessive amounts
    const MAX_MINT_AMOUNT = ethers.utils.parseEther("1000");
    const mintAmount = ethers.utils.parseEther("100");
    
    // Validate mint amount is reasonable
    if (mintAmount.gt(MAX_MINT_AMOUNT)) {
      console.warn(`Mint amount exceeds maximum allowable. Reducing to ${ethers.utils.formatEther(MAX_MINT_AMOUNT)}`);
      mintAmount = MAX_MINT_AMOUNT;
    }
    
    // Mint Token A (BTC) to users
    for (const user of [user1, user2, user3, user4]) {
      await tokenA.mint(user.address, mintAmount);
      
      // Log exact amount for debugging
      console.log(`Minted ${ethers.utils.formatEther(mintAmount)} BTC to ${user.address}`);
    }
    
    // Mint Token B (ETH) to users
    for (const user of [user1, user2, user3, user4]) {
      await tokenB.mint(user.address, mintAmount);
      
      // Log exact amount for debugging
      console.log(`Minted ${ethers.utils.formatEther(mintAmount)} ETH to ${user.address}`);
    }
    
    // ----- Approve DEX to spend tokens -----
    console.log("\nApproving DEX to spend tokens...");
    
    // Safe approval amount with bounds checking
    const approvalAmount = ethers.utils.parseEther("50");
    
    // Token A approvals
    for (const user of [user1, user2, user3, user4]) {
      await tokenA.connect(user).approve(batchDex.address, approvalAmount);
      console.log(`${user.address} approved BatchDEX to spend ${ethers.utils.formatEther(approvalAmount)} BTC`);
    }
    
    // Token B approvals
    for (const user of [user1, user2, user3, user4]) {
      await tokenB.connect(user).approve(batchDex.address, approvalAmount);
      console.log(`${user.address} approved BatchDEX to spend ${ethers.utils.formatEther(approvalAmount)} ETH`);
    }
    
    // ----- Generate mock proofs for testing -----
    console.log("\nGenerating mock order proofs...");
    
    // In a real implementation, this would use actual ZK proofs
    // For testing, we'll use mock proofs
    function generateMockProof(user, isBuy, amount, price) {
      // Following Wasmlanche safe parameter handling principles
      // Validate and normalize parameters to prevent bad inputs
      
      // Validate amount (protection against unreasonable size)
      const MAX_BYTES = 1024;
      const safeAmount = amount > MAX_BYTES ? MAX_BYTES : amount;
      
      // Generate deterministic mock proof
      const mockProofData = ethers.utils.solidityPack(
        ["address", "bool", "uint256", "uint256"],
        [user.address, isBuy, safeAmount, price]
      );
      
      return ethers.utils.keccak256(mockProofData);
    }
    
    // ----- Place orders -----
    console.log("\nPlacing orders...");
    
    // Place buy orders
    const buyOrders = [
      { user: user1, amount: ethers.utils.parseEther("5"), price: 1050 },
      { user: user2, amount: ethers.utils.parseEther("3"), price: 1030 },
      { user: user3, amount: ethers.utils.parseEther("2"), price: 1010 }
    ];
    
    for (const order of buyOrders) {
      const proof = generateMockProof(order.user, true, order.amount, order.price);
      
      // Parameter validation to prevent WebAssembly traps (Wasmlanche principle)
      if (!ethers.utils.isHexString(proof)) {
        console.error(`Invalid proof format: ${proof}`);
        continue; // Skip this order instead of failing
      }
      
      try {
        const tx = await batchDex.connect(order.user).placeOrder(
          pairId,  // Pair ID
          0,       // 0 for BUY
          order.price,
          proof
        );
        const receipt = await tx.wait();
        
        // Extract order ID from events
        const orderCreatedEvent = receipt.events.find(e => e.event === "NewOrder");
        const orderId = orderCreatedEvent ? orderCreatedEvent.args.orderId : "unknown";
        
        console.log(`BUY order placed: ${ethers.utils.formatEther(order.amount)} @ ${order.price} (ID: ${orderId})`);
      } catch (error) {
        // Comprehensive error handling (Wasmlanche principle)
        console.error(`Error placing buy order for ${order.user.address}: ${error.message}`);
        // Continue with other orders rather than failing entirely
      }
    }
    
    // Place sell orders
    const sellOrders = [
      { user: user1, amount: ethers.utils.parseEther("4"), price: 990 },
      { user: user2, amount: ethers.utils.parseEther("5"), price: 1000 },
      { user: user3, amount: ethers.utils.parseEther("1"), price: 1020 }
    ];
    
    for (const order of sellOrders) {
      const proof = generateMockProof(order.user, false, order.amount, order.price);
      
      try {
        const tx = await batchDex.connect(order.user).placeOrder(
          pairId,  // Pair ID
          1,       // 1 for SELL
          order.price,
          proof
        );
        const receipt = await tx.wait();
        
        // Extract order ID from events
        const orderCreatedEvent = receipt.events.find(e => e.event === "NewOrder");
        const orderId = orderCreatedEvent ? orderCreatedEvent.args.orderId : "unknown";
        
        console.log(`SELL order placed: ${ethers.utils.formatEther(order.amount)} @ ${order.price} (ID: ${orderId})`);
      } catch (error) {
        console.error(`Error placing sell order for ${order.user.address}: ${error.message}`);
      }
    }
    
    // ----- Get current batch info -----
    console.log("\nGetting current batch info...");
    const batchInfo = await batchDex.getCurrentBatchInfo();
    const batchId = batchInfo[0];
    const deadline = new Date(batchInfo[1].toNumber() * 1000);
    
    console.log(`Current batch: ID=${batchId}, Deadline=${deadline}`);
    
    // ----- Wait for batch to complete -----
    console.log("\nWaiting for batch to complete...");
    console.log(`Note: In a real environment, you would wait until the deadline (${deadline})`);
    console.log("For testing, we'll use a shorter wait time.");
    
    // In a real environment, this would wait until the batch deadline
    // For testing, we'll use a shorter wait time
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // ----- Start new batch manually -----
    console.log("\nAttempting to start a new batch...");
    try {
      const startNewBatchTx = await batchDex.connect(deployer).startNewBatch();
      await startNewBatchTx.wait();
      console.log("New batch started successfully");
      
      // Get updated batch info
      const newBatchInfo = await batchDex.getCurrentBatchInfo();
      const newBatchId = newBatchInfo[0];
      const newDeadline = new Date(newBatchInfo[1].toNumber() * 1000);
      
      console.log(`New batch: ID=${newBatchId}, Deadline=${newDeadline}`);
    } catch (error) {
      // Print helpful error (Wasmlanche principle)
      console.error(`Error starting new batch: ${error.message}`);
      
      if (error.message.includes("Current batch is still active")) {
        console.log("You need to wait until the current batch deadline passes before starting a new one.");
      }
    }
    
    // ----- Display contract addresses for future reference -----
    console.log("\n=== Contract Addresses for Future Reference ===");
    console.log(`ZKVerifier: ${zkVerifier.address}`);
    console.log(`BatchAuctionDEX: ${batchDex.address}`);
    console.log(`Token A (BTC): ${tokenA.address}`);
    console.log(`Token B (ETH): ${tokenB.address}`);
    console.log(`Trading Pair ID: ${pairId}`);
    
  } catch (error) {
    // Top-level error handling (Wasmlanche principle)
    console.error("Deployment script failed:", error);
    
    // Provide helpful context about the error
    if (error.message.includes("execution reverted")) {
      console.error("Contract execution reverted. This may be due to invalid parameters or contract state.");
    }
    
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
