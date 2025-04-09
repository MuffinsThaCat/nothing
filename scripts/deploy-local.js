// Script to deploy contracts to local Hardhat node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const hre = require('hardhat');
const ethers = hre.ethers;

async function main() {
  console.log("Deploying EERC20 Batch DEX contracts to local network...");

  // Get the ContractFactory for our contracts
  const BatchAuctionDEX = await ethers.getContractFactory("BatchAuctionDEX");
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const TestToken = await ethers.getContractFactory("TestToken");

  // Deploy test tokens for liquidity
  console.log("Deploying test tokens...");
  const tokenA = await TestToken.deploy("Test Token A", "TTA", ethers.utils.parseEther("1000000"));
  const tokenB = await TestToken.deploy("Test Token B", "TTB", ethers.utils.parseEther("1000000"));
  
  await tokenA.deployed();
  await tokenB.deployed();
  
  console.log(`Token A deployed to: ${tokenA.address}`);
  console.log(`Token B deployed to: ${tokenB.address}`);

  // Deploy DEX Factory
  console.log("Deploying DEX Factory...");
  const dexFactory = await DEXFactory.deploy();
  await dexFactory.deployed();
  console.log(`DEX Factory deployed to: ${dexFactory.address}`);

  // Deploy a Batch Auction DEX
  console.log("Deploying Batch Auction DEX...");
  const batchDex = await BatchAuctionDEX.deploy(
    tokenA.address, 
    tokenB.address,
    30, // 30 second batch cycle
    ethers.utils.parseEther("0.001") // 0.1% fee
  );
  await batchDex.deployed();
  console.log(`Batch Auction DEX deployed to: ${batchDex.address}`);

  // Register the DEX with the factory
  await dexFactory.registerDEX(batchDex.address);
  console.log("DEX registered with factory");

  // Add initial liquidity from deployer
  const [deployer] = await ethers.getSigners();
  
  // Approve tokens for the DEX
  await tokenA.approve(batchDex.address, ethers.utils.parseEther("10000"));
  await tokenB.approve(batchDex.address, ethers.utils.parseEther("10000"));
  
  // Add liquidity
  console.log("Adding initial liquidity...");
  await batchDex.addLiquidity(
    ethers.utils.parseEther("10000"),
    ethers.utils.parseEther("10000")
  );
  
  console.log("Initial liquidity added");
  console.log("\nDeployment complete! Contract addresses:");
  console.log("======================================");
  console.log(`Token A: ${tokenA.address}`);
  console.log(`Token B: ${tokenB.address}`);
  console.log(`DEX Factory: ${dexFactory.address}`);
  console.log(`Batch Auction DEX: ${batchDex.address}`);
  console.log("\nUse these addresses in your frontend configuration.");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
