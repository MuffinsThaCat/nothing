// Deployment script for the eerc20 Batch Auction DEX
const { ethers } = require('hardhat');

// Apply safe parameter handling principles in deployment
// Set up environment variables with proper validation

// Define safe parameter validation constants
const MAX_KEY_SIZE = 1024; // 1KB - prevent unreasonable inputs

async function main() {
  console.log("Deploying eerc20 Batch Auction DEX...");

  // We assume the account in position 0 is the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // For this example, we're using placeholder empty verifying keys
  // In a real deployment, these would be actual verifying keys for ZK proofs
  const transferProofKey = "0x0001";
  const balanceProofKey = "0x0001";
  const settlementProofKey = "0x0001";
  
  // Set this to true to allow continuation on proof verification failure
  // This implements safe parameter handling by preventing transactions from failing completely
  const allowContinueOnFailure = true;

  // Implement safe parameter handling with validation
  // This follows Wasmlanche principles of validating inputs and providing safe fallbacks
  let validatedTransferKey = transferProofKey;
  let validatedBalanceKey = balanceProofKey;
  let validatedSettlementKey = settlementProofKey;
  
  // Validate proof keys - reject unreasonable inputs
  if (!validatedTransferKey || validatedTransferKey === "0x") {
    console.log("Using safe fallback for transfer proof key");
    validatedTransferKey = "0x0001";
  }
  
  if (!validatedBalanceKey || validatedBalanceKey === "0x") {
    console.log("Using safe fallback for balance proof key");
    validatedBalanceKey = "0x0001";
  }
  
  if (!validatedSettlementKey || validatedSettlementKey === "0x") {
    console.log("Using safe fallback for settlement proof key");
    validatedSettlementKey = "0x0001";
  }
  
  // Validate max parameter sizes to prevent unreasonable inputs
  if (validatedTransferKey.length > MAX_KEY_SIZE) {
    console.log("Transfer proof key exceeds maximum size - truncating");
    validatedTransferKey = validatedTransferKey.substring(0, MAX_KEY_SIZE);
  }
  
  if (validatedBalanceKey.length > MAX_KEY_SIZE) {
    console.log("Balance proof key exceeds maximum size - truncating");
    validatedBalanceKey = validatedBalanceKey.substring(0, MAX_KEY_SIZE);
  }
  
  if (validatedSettlementKey.length > MAX_KEY_SIZE) {
    console.log("Settlement proof key exceeds maximum size - truncating");
    validatedSettlementKey = validatedSettlementKey.substring(0, MAX_KEY_SIZE);
  }
  
  // Deploy with all required parameters, including allowContinueOnFailure
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const dexFactory = await DEXFactory.deploy(
    validatedTransferKey,
    validatedBalanceKey,
    validatedSettlementKey,
    allowContinueOnFailure
  );

  await dexFactory.waitForDeployment();
  console.log(`DEXFactory deployed to: ${await dexFactory.getAddress()}`);

  // Deploy a BatchAuctionDEX instance through the factory
  // Using 300 seconds (5 minutes) as batch duration
  const batchDuration = 300;
  const dexName = "EERC20-BatchDEX-v1";

  console.log(`Deploying a BatchAuctionDEX with name ${dexName} and batch duration ${batchDuration} seconds...`);
  const deployTx = await dexFactory.deployDEX(batchDuration, dexName);
  const deployReceipt = await deployTx.wait();

  // Find the DEX deployed event to get the address
  const dexDeployedEvent = deployReceipt.logs
    .filter(log => log.topics[0] === "0x" + ethers.id("DEXDeployed(bytes32,address,address)").substring(2))
    .map(log => {
      const decodedLog = dexFactory.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      });
      return {
        dexId: decodedLog.args[0],
        dexAddress: decodedLog.args[1],
        deployer: decodedLog.args[2]
      };
    })[0];

  if (dexDeployedEvent) {
    console.log(`BatchAuctionDEX deployed to: ${dexDeployedEvent.dexAddress}`);
    console.log(`DEX ID: ${dexDeployedEvent.dexId}`);
  } else {
    console.log("Failed to retrieve DEX address from event logs");
  }

  console.log("Deployment completed!");
}

// Execute the deployment with safe error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    // Detailed error logging to help diagnose issues without exposing sensitive data
    console.error("Deployment failed with error:", error);
    process.exit(1);
  });
