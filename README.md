# eerc20 Batch Auction DEX

A privacy-focused decentralized exchange for Avalanche's eerc20 token standard, implementing a batch auction model to preserve confidentiality while enabling efficient trading.

## Overview

This DEX is specifically designed for the eerc20 token standard, which uses zero-knowledge proofs and homomorphic encryption to keep balances and transaction amounts private. The batch auction model was chosen as the optimal trading mechanism because it:

- Preserves privacy by aggregating multiple trades together
- Provides efficient price discovery without revealing individual positions
- Reduces MEV and front-running vulnerabilities
- Enables gas-efficient verification of multiple zero-knowledge proofs

## Features

- **Private Trading**: Trade eerc20 tokens without revealing your balance or trade amounts
- **Batch Auctions**: Trades are collected and matched in batches at a uniform clearing price
- **Zero-Knowledge Verification**: All transactions are verified using ZK proofs
- **Regulatory Compliance**: Integration with eerc20's auditability module
- **Multi-Token Support**: Support for both standalone eerc20 tokens and eerc20-wrapped ERC20 tokens
- **Browser Compatibility**: Full support for browser environments with safe parameter handling
- **Graceful Error Handling**: Returns empty results instead of throwing errors for improved resilience

## Project Structure

```
├── contracts/             # Smart contracts
│   ├── core/              # Core DEX functionality
│   ├── interfaces/        # Contract interfaces
│   └── utils/             # Utility contracts
├── scripts/               # Deployment scripts
├── test/                  # Test scripts
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
└── src/                   # Frontend source code
    ├── components/        # React components
    └── utils/             # Frontend utilities
```

## Getting Started

### Prerequisites

- Node.js >= v16.x
- Npm or Yarn
- Go >= 1.23.x (for ZK proof generation/verification)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd eerc20-batch-dex
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Compile the contracts:

```bash
npx hardhat compile
```

### Local Development

Start a local Hardhat node:

```bash
npx hardhat node
```

In a separate terminal, deploy the contracts to the local network:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Deploying to Avalanche

To deploy to Avalanche Fuji Testnet:

```bash
npx hardhat run scripts/deploy.js --network fuji
```

To deploy to Avalanche C-Chain Mainnet:

```bash
npx hardhat run scripts/deploy.js --network avalanche
```

## How It Works

### Batch Auction Process

1. **Order Collection Phase**: Users submit buy/sell orders with encrypted amounts and public limit prices during a fixed time window (e.g., 5 minutes)
2. **Batch Settlement**: At the end of each time window, a uniform clearing price is determined
3. **Zero-Knowledge Execution**: Orders are matched and settled using ZK proofs to maintain privacy
4. **Batch Finalization**: The results are recorded on-chain, starting the next batch auction

### Privacy Preservation

The DEX preserves privacy through:
- Encrypted order amounts using eerc20's homomorphic encryption
- Zero-knowledge proofs for trade validation
- Batch execution to hide individual trade details
- Private state transitions while maintaining verifiable integrity

## Extending the DEX

The DEX can be extended with:
- Additional token pairs
- Enhanced ZK proof systems
- Improved order matching algorithms
- Custom frontend implementations

## License

This project is licensed under the MIT License - see the LICENSE file for details.
