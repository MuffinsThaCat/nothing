// Deploy script for local Hardhat testing
// CommonJS syntax (for Hardhat compatibility)

async function main() {
  console.log("========================================");
  console.log("Deploying EERC20 Batch DEX contracts to local Hardhat network");
  console.log("========================================");

  // Get signers with comprehensive logging
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  try {
    // Deploy SimpleZKVerifier with parameter validation
    console.log("\nDeploying SimpleZKVerifier...");
    const SimpleZKVerifier = await ethers.getContractFactory("SimpleZKVerifier");
    const zkVerifier = await SimpleZKVerifier.deploy();
    await zkVerifier.deployed();
    
    // Validate deployment result
    if (!zkVerifier.address) {
      console.error("ZKVerifier deployment failed or returned invalid address");
      process.exit(1);
    }
    console.log(`SimpleZKVerifier deployed to: ${zkVerifier.address}`);
    
    // Deploy test tokens A and B with parameter validation
    console.log("\nDeploying test tokens...");
    const TestToken = await ethers.getContractFactory("TestToken");
    
    // Validate parameters - token A
    const tokenAName = "EERC20 Token A";
    const tokenASymbol = "EERC20A";
    const tokenASupply = ethers.utils.parseEther("1000000"); // 1 million tokens
    
    // Bounds checking for token supply
    if (tokenASupply.lte(ethers.utils.parseEther("0"))) {
      console.error("Token supply must be positive");
      process.exit(1);
    }
    
    // Deploy token A with safe parameters
    const tokenA = await TestToken.deploy(tokenAName, tokenASymbol, tokenASupply);
    await tokenA.deployed();
    console.log(`Token A (${tokenASymbol}) deployed to: ${tokenA.address}`);
    
    // Deploy token B with safe parameters
    const tokenB = await TestToken.deploy("EERC20 Token B", "EERC20B", ethers.utils.parseEther("2000000"));
    await tokenB.deployed();
    console.log(`Token B (EERC20B) deployed to: ${tokenB.address}`);
    
    // Deploy the BatchAuctionDEX with parameter validation
    console.log("\nDeploying BatchAuctionDEX...");
    const BatchDEX = await ethers.getContractFactory("BatchAuctionDEX");
    
    // Safe parameter handling - batch duration
    const batchDuration = 300; // 5 minutes in seconds
    if (batchDuration <= 0) {
      console.error("Batch duration must be positive");
      process.exit(1);
    }
    
    // Ensure ZK verifier address is valid
    if (!zkVerifier.address || zkVerifier.address === ethers.constants.AddressZero) {
      console.error("Invalid ZK verifier address");
      process.exit(1);
    }
    
    // Deploy with validated parameters
    const dex = await BatchDEX.deploy(batchDuration, zkVerifier.address);
    await dex.deployed();
    console.log(`BatchAuctionDEX deployed to: ${dex.address}`);
    
    // Add token pair to DEX
    console.log("\nAdding token pair to DEX...");
    const tx = await dex.addTokenPair(tokenA.address, tokenB.address);
    await tx.wait();
    console.log("Token pair added successfully");
    
    // Transfer some tokens to the deployer's account
    console.log("\nTransferring test tokens to deployer...");
    await tokenA.transfer(deployer.address, ethers.utils.parseEther("10000"));
    await tokenB.transfer(deployer.address, ethers.utils.parseEther("10000"));
    console.log("Token transfer complete");
    
    // Output deployment information for frontend configuration
    console.log("\n========================================");
    console.log("DEPLOYMENT COMPLETE! Contract addresses:");
    console.log("========================================");
    console.log(`Token A: ${tokenA.address}`);
    console.log(`Token B: ${tokenB.address}`);
    console.log(`ZK Verifier: ${zkVerifier.address}`);
    console.log(`BatchAuctionDEX: ${dex.address}`);
    console.log("========================================");
    console.log("Update your frontend/config/networks.js LOCAL_CONTRACTS with these addresses");
    
  } catch (error) {
    // Safe error handling
    console.error("Deployment failed with error:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
