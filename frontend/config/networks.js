/**
 * Network configuration for the EERC20 Batch DEX frontend
 */

export const NETWORKS = {
  // Local development network (Hardhat)
  hardhat: {
    chainId: 31337,
    name: 'Hardhat Local',
    currency: 'ETH',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    testnet: true
  },
  // Avalanche C-Chain
  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    currency: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
    testnet: false
  },
  // Avalanche Fuji Testnet
  fuji: {
    chainId: 43113,
    name: 'Avalanche Fuji Testnet',
    currency: 'AVAX',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    testnet: true
  }
};

// Default contracts for local testing
export const LOCAL_CONTRACTS = {
  // These are the default Hardhat test addresses - replace with actual deployed addresses
  tokenA: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  tokenB: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  batchDEX: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  dexFactory: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
};

// Helper to get network by chain ID
export function getNetworkByChainId(chainId) {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
}

// Get the current environment's default network
export function getDefaultNetwork() {
  // Use hardhat for local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return NETWORKS.hardhat;
  }
  
  // Use fuji for other test environments
  if (window.location.hostname.includes('test') || window.location.hostname.includes('staging')) {
    return NETWORKS.fuji;
  }
  
  // Use mainnet for production
  return NETWORKS.avalanche;
}

export default {
  NETWORKS,
  LOCAL_CONTRACTS,
  getNetworkByChainId,
  getDefaultNetwork
};
