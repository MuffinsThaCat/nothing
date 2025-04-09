// Deployment script for the eerc20 Batch Auction DEX
const hre = require("hardhat");

async function main() {
  console.log("Deploying eerc20 Batch Auction DEX...");

  // We assume the account in position 0 is the deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // For this example, we're using placeholder empty verifying keys
  // In a real deployment, these would be actual verifying keys for ZK proofs
  const transferProofKey = "0x";
  const balanceProofKey = "0x";
  const settlementProofKey = "0x";

  // Deploy the DEX factory
  const DEXFactory = await hre.ethers.getContractFactory("DEXFactory");
  const dexFactory = await DEXFactory.deploy(
    transferProofKey,
    balanceProofKey,
    settlementProofKey
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

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
