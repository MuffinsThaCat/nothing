/**
 * Deployment script for BatchAuctionDEX with real EERC20 implementation
 * This script deploys the BatchAuctionDEX contract with the RealEERC20Adapter
 * that connects to the real EncryptedERC implementation
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Maximum size limits for safe parameter handling
const MAX_PARAM_SIZE = 32 * 1024; // 32KB

async function main() {
  console.log("Deploying BatchAuctionDEX with real EERC20 implementation...");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the ZKVerifier first (required by BatchAuctionDEX)
  console.log("Deploying ZKVerifier...");
  const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
  const zkVerifier = await ZKVerifier.deploy();
  await zkVerifier.deployed();
  console.log(`ZKVerifier deployed to: ${zkVerifier.address}`);
  
  // Deploy or get the real EncryptedERC contract
  // Note: You might need to adapt this if you're using an existing deployment
  console.log("Deploying EncryptedERC...");
  const EncryptedERC = await ethers.getContractFactory("EncryptedERC");
  const encryptedERC = await EncryptedERC.deploy({
    // Add constructor parameters as required by the actual EncryptedERC implementation
    // This may need adaptation based on the actual contract
  });
  await encryptedERC.deployed();
  console.log(`EncryptedERC deployed to: ${encryptedERC.address}`);
  
  // Create a token in the EncryptedERC system
  // Note: This step might require additional setup based on the actual EncryptedERC implementation
  console.log("Creating a token in EncryptedERC...");
  const tokenId = 1; // Assign appropriate tokenId
  const tokenName = "Real Encrypted Token";
  const tokenSymbol = "RET";
  
  // Deploy the RealEERC20Adapter
  console.log("Deploying RealEERC20Adapter...");
  const RealEERC20Adapter = await ethers.getContractFactory("RealEERC20Adapter");
  
  // Validate inputs to prevent issues (following safe parameter handling practices)
  if (
    !encryptedERC.address || 
    tokenId <= 0 || 
    tokenName.length > MAX_PARAM_SIZE || 
    tokenSymbol.length > MAX_PARAM_SIZE
  ) {
    throw new Error("Invalid parameters for RealEERC20Adapter deployment");
  }
  
  const adapter = await RealEERC20Adapter.deploy(
    encryptedERC.address,
    tokenId,
    tokenName,
    tokenSymbol
  );
  await adapter.deployed();
  console.log(`RealEERC20Adapter deployed to: ${adapter.address}`);
  
  // Deploy the BatchAuctionDEX with a reasonable batch duration
  console.log("Deploying BatchAuctionDEX...");
  const batchDuration = 3600; // 1 hour in seconds
  const BatchAuctionDEX = await ethers.getContractFactory("BatchAuctionDEX");
  
  // Validate parameters for safety
  if (!zkVerifier.address || batchDuration <= 0 || batchDuration > 86400) {
    throw new Error("Invalid parameters for BatchAuctionDEX deployment");
  }
  
  const dex = await BatchAuctionDEX.deploy(zkVerifier.address, batchDuration);
  await dex.deployed();
  console.log(`BatchAuctionDEX deployed to: ${dex.address}`);
  
  // Add a token pair with the real EERC20 implementation
  console.log("Adding token pair to BatchAuctionDEX...");
  // Create a second adapter for the other token in the pair
  // For demonstration, we'll create another token in the EncryptedERC system
  const token2Id = 2; // Assign appropriate tokenId
  const token2Name = "Real Encrypted Token 2";
  const token2Symbol = "RET2";
  
  const adapter2 = await RealEERC20Adapter.deploy(
    encryptedERC.address,
    token2Id,
    token2Name,
    token2Symbol
  );
  await adapter2.deployed();
  console.log(`Second RealEERC20Adapter deployed to: ${adapter2.address}`);
  
  // Add the token pair to the DEX
  // Note: isEERC20A and isEERC20B should be true since both are EERC20 tokens
  await dex.addTokenPair(adapter.address, adapter2.address, true, true);
  console.log("Token pair added to BatchAuctionDEX");
  
  // Save deployment addresses to a file for future reference
  const deploymentInfo = {
    ZKVerifier: zkVerifier.address,
    EncryptedERC: encryptedERC.address,
    RealEERC20Adapter1: adapter.address,
    RealEERC20Adapter2: adapter2.address,
    BatchAuctionDEX: dex.address
  };
  
  const deploymentPath = path.join(__dirname, "../deployment_info.json");
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Deployment information saved to ${deploymentPath}`);
  
  console.log("Deployment completed successfully!");
}

// Handle errors gracefully
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
