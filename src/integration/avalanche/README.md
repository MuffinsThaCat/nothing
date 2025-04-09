# EERC20 Batch DEX - Avalanche Integration

## Overview

This module integrates the EERC20 Batch DEX with the Avalanche C-Chain, optimizing the DEX for Avalanche's unique characteristics:

- Fast 2-second block times
- High throughput and low gas costs
- Vibrant DeFi ecosystem

## Key Components

### 1. Privacy-Preserving Liquidity Pools (`privacyLiquidityPools.js`)

Specialized liquidity pools that maintain the encrypted nature of EERC20 tokens while allowing interaction with Avalanche's DeFi ecosystem:

- Create dedicated privacy pools for EERC20 token pairs
- Get swap quotes while maintaining privacy guarantees
- Bridge between encrypted EERC20 tokens and standard ERC20 tokens

### 2. Wallet Connector (`walletConnector.js`)

Simplified connection to popular Avalanche wallets:

- Core Wallet integration
- MetaMask with Avalanche network configuration
- Network switching and chain ID validation

### 3. Network Monitor (`networkMonitor.js`)

Real-time monitoring of Avalanche network conditions:

- Track block times, gas prices, and congestion levels
- Dynamically optimize batch parameters based on network conditions
- Provide gas recommendations for different transaction priority levels

### 4. Main Integration (`index.js`)

Coordinates all Avalanche-specific optimizations:

- Initialize all components
- Provide network-aware optimized settings
- Expose simplified APIs for interacting with the Avalanche ecosystem

## Parameter Validation & Error Handling

All components follow strict parameter validation principles to ensure resilience:

- Input validation with reasonable bounds checking
- Properly formatted error objects with descriptive messages
- Fallback behaviors for degraded operations

## Usage Examples

See `src/examples/avalancheIntegrationExample.js` for complete usage examples:

```javascript
// Initialize Avalanche integration
const avalanche = new AvalancheIntegration();
await avalanche.initialize();

// Create and use privacy-preserving liquidity pools
const poolResult = await avalanche.createPrivacyPool(tokenA, tokenB);
const quote = await avalanche.getPrivacyPoolLiquidity(tokenA, tokenB, amount);

// Bridge between EERC20 and standard tokens
const bridgeResult = await avalanche.bridgeTokens(
  eerc20Token, 
  standardToken, 
  isWrapping, 
  amount, 
  userAddress
);

// Get network-optimized settings
const settings = avalanche.getOptimizedSettings();
```

## Network Optimization

The integration automatically adapts to Avalanche network conditions:

- During low congestion: Shorter batch durations, more orders per batch
- During high congestion: Longer batch durations, fewer orders per batch
- Dynamic gas price recommendations based on transaction priority

## Security Considerations

- All interactions with privacy pools maintain encrypted data confidentiality
- Parameter validation prevents invalid inputs from causing unexpected behavior
- Error handling ensures graceful degradation during network issues

## Avalanche-Specific Configuration

See `src/config/avalancheConfig.js` for Avalanche-specific settings:

- Network parameters (RPC URLs, chain IDs)
- Default gas prices and limits
- Batch auction timing parameters
