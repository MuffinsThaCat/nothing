import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
dotenv.config();

// Load private key from environment variable or use a default one for development
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  // Include EncryptedERC contracts for compilation
  paths: {
    sources: [
      "./contracts",
      "./EncryptedERC/contracts"
    ],
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // Modified solidity config to support real EncryptedERC contracts
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.27',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        // Added for EncryptedERC verifier contracts
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    // Local development
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // Avalanche C-Chain
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      accounts: [PRIVATE_KEY],
      gasPrice: 225000000000,
    },
    // Avalanche Fuji Testnet
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: 43113,
      accounts: [PRIVATE_KEY],
      gasPrice: 225000000000,
    },
  },
  // Gas reporter for optimization
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  // Etherscan verification
  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY || '',
      avalancheFuji: process.env.SNOWTRACE_API_KEY || '',
    },
    customChains: [
      {
        network: 'avalanche',
        chainId: 43114,
        urls: {
          apiURL: 'https://api.snowtrace.io/api',
          browserURL: 'https://snowtrace.io/',
        },
      },
      {
        network: 'avalancheFuji',
        chainId: 43113,
        urls: {
          apiURL: 'https://api-testnet.snowtrace.io/api',
          browserURL: 'https://testnet.snowtrace.io/',
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};
