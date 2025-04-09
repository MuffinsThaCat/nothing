#!/usr/bin/env node

/**
 * @fileoverview Command-line interface for the eerc20 batch auction DEX solver
 * Provides a way to run the solver, monitor batches, and submit settlements
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const BatchSolver = require('./BatchSolver');
const zkUtils = require('./zkUtils');

// Maximum parameter sizes for safety (following memory about parameter validation)
const MAX_PARAMS = {
  CONFIG_SIZE: 10 * 1024, // 10KB max config file size
  ORDERS_PER_BATCH: 1000,
  KEY_SIZE: 1024,
  PROOF_SIZE: 32 * 1024 // 32KB max proof size
};

// Default configuration
const DEFAULT_CONFIG = {
  rpcUrl: 'http://localhost:8545',
  dexAddress: '',
  privateKey: '',
  batchInterval: 300, // 5 minutes
  maxOrdersPerBatch: 500,
  maxPriceLevels: 50,
  minLiquidity: 100,
  maxSlippage: 5, // 5%
  gasLimit: 5000000,
  logLevel: 'info'
};

/**
 * Parse command-line arguments
 * @return {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    command: args[0] || 'help',
    options: {}
  };
  
  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const option = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      parsed.options[option] = value;
      
      if (value !== 'true') {
        i++; // Skip the value in the next iteration
      }
    }
  }
  
  return parsed;
}

/**
 * Load configuration from file with proper validation
 * @param {string} configPath - Path to configuration file
 * @return {Object} Loaded configuration
 */
function loadConfig(configPath) {
  try {
    // Validate path with proper error handling (from memory)
    if (!configPath) {
      console.warn('No configuration file specified, using defaults');
      return DEFAULT_CONFIG;
    }
    
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      console.warn(`Configuration file ${configPath} not found, using defaults`);
      return DEFAULT_CONFIG;
    }
    
    // Check file size (bounds checking from memory)
    const stats = fs.statSync(configPath);
    if (stats.size > MAX_PARAMS.CONFIG_SIZE) {
      console.error(`Configuration file size (${stats.size} bytes) exceeds maximum (${MAX_PARAMS.CONFIG_SIZE} bytes)`);
      console.warn('Using default configuration instead');
      return DEFAULT_CONFIG;
    }
    
    // Read and parse configuration file
    const configStr = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configStr);
    
    // Merge with defaults
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    // Safe error handling (from memory)
    console.error(`Error loading configuration: ${error.message}`);
    console.warn('Using default configuration instead');
    return DEFAULT_CONFIG;
  }
}

/**
 * Initialize blockchain connection
 * @param {Object} config - Configuration object
 * @return {Object} Provider and signer
 */
async function initBlockchain(config) {
  try {
    console.log(`Connecting to blockchain at ${config.rpcUrl}`);
    
    // Parameter validation (from memory)
    if (!config.rpcUrl) {
      throw new Error('No RPC URL specified');
    }
    
    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Validate provider connection
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
    
    // Create signer if private key is provided
    let signer = null;
    if (config.privateKey) {
      if (config.privateKey.length > MAX_PARAMS.KEY_SIZE) {
        console.error(`Private key size exceeds maximum (${MAX_PARAMS.KEY_SIZE} bytes)`);
        throw new Error('Invalid private key');
      }
      
      signer = new ethers.Wallet(config.privateKey, provider);
      console.log(`Using account: ${signer.address}`);
    }
    
    return { provider, signer };
  } catch (error) {
    console.error(`Blockchain initialization error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Initialize DEX contract
 * @param {Object} config - Configuration object
 * @param {ethers.Provider} provider - Provider
 * @param {ethers.Signer} signer - Signer (optional)
 * @return {ethers.Contract} DEX contract instance
 */
async function initDEXContract(config, provider, signer) {
  try {
    console.log(`Initializing DEX contract at ${config.dexAddress}`);
    
    // Validate DEX address
    if (!config.dexAddress) {
      throw new Error('No DEX address specified');
    }
    
    // Validate address format
    if (!ethers.isAddress(config.dexAddress)) {
      throw new Error('Invalid DEX address format');
    }
    
    // Load contract ABI
    const abiPath = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'core', 'BatchAuctionDEX.sol', 'BatchAuctionDEX.json');
    let abi;
    
    try {
      const abiFile = fs.readFileSync(abiPath, 'utf8');
      const abiJson = JSON.parse(abiFile);
      abi = abiJson.abi;
    } catch (error) {
      console.error(`Error loading ABI: ${error.message}`);
      throw new Error('Failed to load contract ABI');
    }
    
    // Create contract instance
    const contract = new ethers.Contract(
      config.dexAddress,
      abi,
      signer || provider
    );
    
    // Verify contract
    const [batchId, batchDeadline, batchDuration] = await contract.getBatchInfo();
    console.log(`Connected to BatchAuctionDEX at ${config.dexAddress}`);
    console.log(`Current batch: #${batchId}, deadline: ${new Date(Number(batchDeadline) * 1000)}`);
    
    return contract;
  } catch (error) {
    console.error(`DEX contract initialization error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run the solver as a daemon
 * @param {Object} config - Configuration object
 */
async function runSolver(config) {
  try {
    console.log('Starting eerc20 batch auction DEX solver...');
    
    // Initialize blockchain connection
    const { provider, signer } = await initBlockchain(config);
    
    // Initialize DEX contract
    const dexContract = await initDEXContract(config, provider, signer);
    
    // Create solver instance
    const solver = new BatchSolver(config, dexContract, provider);
    
    // Initialize solver
    await solver.initialize();
    
    console.log('Solver is running...');
    console.log('Press Ctrl+C to stop');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nStopping solver...');
      solver.stop();
      process.exit(0);
    });
    
    // Keep process running
    await new Promise(() => {});
  } catch (error) {
    console.error(`Error running solver: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show current batch information
 * @param {Object} config - Configuration object
 */
async function showBatchInfo(config) {
  try {
    console.log('Fetching current batch information...');
    
    // Initialize blockchain connection
    const { provider } = await initBlockchain(config);
    
    // Initialize DEX contract
    const dexContract = await initDEXContract(config, provider);
    
    // Get batch information
    const [batchId, batchDeadline, batchDuration] = await dexContract.getBatchInfo();
    
    console.log('\nCurrent Batch Information:');
    console.log(`Batch ID: ${batchId}`);
    console.log(`Deadline: ${new Date(Number(batchDeadline) * 1000)}`);
    console.log(`Duration: ${batchDuration} seconds`);
    
    // Get time remaining
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = Number(batchDeadline) - currentTime;
    
    if (timeRemaining > 0) {
      console.log(`Time remaining: ${timeRemaining} seconds`);
    } else {
      console.log('Batch deadline has passed. Waiting for settlement.');
    }
    
    // Get active orders
    const tokenPairs = await dexContract.getAllTokenPairs();
    console.log(`\nToken Pairs: ${tokenPairs.length}`);
    
    let totalOrders = 0;
    
    for (const pairId of tokenPairs) {
      const orders = await dexContract.getActiveOrders(pairId);
      totalOrders += orders.length;
      
      const pair = await dexContract.getTokenPair(pairId);
      console.log(`- Pair ${pairId.slice(0, 10)}... (${pair.tokenA.slice(0, 8)}.../${pair.tokenB.slice(0, 8)}...): ${orders.length} active orders`);
    }
    
    console.log(`\nTotal Active Orders: ${totalOrders}`);
  } catch (error) {
    console.error(`Error fetching batch information: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('eerc20 Batch Auction DEX Solver CLI');
  console.log('Usage: node cli.js [command] [options]');
  console.log('\nCommands:');
  console.log('  run         Run the solver as a daemon');
  console.log('  batch       Show current batch information');
  console.log('  help        Show this help message');
  console.log('\nOptions:');
  console.log('  --config    Path to configuration file');
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command-line arguments
    const args = parseArgs();
    
    // Load configuration
    const config = loadConfig(args.options.config);
    
    // Override configuration with command-line options
    Object.keys(args.options).forEach(key => {
      if (key !== 'config') {
        // Convert numeric values
        if (!isNaN(args.options[key])) {
          config[key] = Number(args.options[key]);
        } else if (args.options[key] === 'true' || args.options[key] === 'false') {
          config[key] = args.options[key] === 'true';
        } else {
          config[key] = args.options[key];
        }
      }
    });
    
    // Execute command
    switch (args.command) {
      case 'run':
        await runSolver(config);
        break;
      case 'batch':
        await showBatchInfo(config);
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
