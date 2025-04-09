/**
 * Avalanche Liquidity Provider Integration
 * 
 * Connects the EERC20 Batch DEX to major Avalanche liquidity sources
 * - Trader Joe
 * - Pangolin
 * - Platypus Finance
 * - GMX
 */
const { ethers } = require('ethers');
const avalancheConfig = require('../../config/avalancheConfig');

// ABI interfaces for major Avalanche DEXes
const TRADER_JOE_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

const PANGOLIN_ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

// Contract addresses on Avalanche
const ADDRESSES = {
  TRADER_JOE_ROUTER: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
  PANGOLIN_ROUTER: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
  PLATYPUS_ROUTER: '0x66357dCaCe80431aee0A7507e2E361B7e2402370',
  GMX_ROUTER: '0x5F719c2F1095F7B9fc68a68e35B51194f4b6abe8',
  WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
};

class AvalancheLiquidityProvider {
  constructor(provider) {
    this.provider = provider;
    this.liquiditySources = {};
    this.initialized = false;
  }

  /**
   * Initialize connections to Avalanche liquidity providers
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Connect to Trader Joe
      this.liquiditySources.traderJoe = new ethers.Contract(
        ADDRESSES.TRADER_JOE_ROUTER,
        TRADER_JOE_ROUTER_ABI,
        this.provider
      );
      
      // Connect to Pangolin
      this.liquiditySources.pangolin = new ethers.Contract(
        ADDRESSES.PANGOLIN_ROUTER,
        PANGOLIN_ROUTER_ABI,
        this.provider
      );
      
      // More connections can be added here for other protocols
      
      this.initialized = true;
      console.log('Successfully connected to Avalanche liquidity sources');
    } catch (error) {
      console.error('Failed to initialize Avalanche liquidity providers:', error);
      throw error;
    }
  }

  /**
   * Get the best price for a token swap across all integrated Avalanche DEXes
   * @param {string} tokenIn - Address of input token
   * @param {string} tokenOut - Address of output token
   * @param {ethers.BigNumber} amountIn - Amount of input token
   * @returns {Promise<Object>} Best price info with source and amounts
   */
  async getBestPrice(tokenIn, tokenOut, amountIn) {
    if (!this.initialized) await this.initialize();
    
    // Check for AVAX as native token
    const isAvaxIn = tokenIn.toLowerCase() === 'avax';
    const isAvaxOut = tokenOut.toLowerCase() === 'avax';
    
    // Convert AVAX to WAVAX for routing
    const actualTokenIn = isAvaxIn ? ADDRESSES.WAVAX : tokenIn;
    const actualTokenOut = isAvaxOut ? ADDRESSES.WAVAX : tokenOut;
    
    // Path for the swap
    const path = [actualTokenIn, actualTokenOut];
    
    // Get quotes from different sources
    const quotes = await Promise.all([
      this._getQuoteWithFallback(this.liquiditySources.traderJoe, 'getAmountsOut', [amountIn, path]),
      this._getQuoteWithFallback(this.liquiditySources.pangolin, 'getAmountsOut', [amountIn, path])
      // Add more sources as needed
    ]);
    
    // Find the best price
    let bestAmountOut = ethers.BigNumber.from(0);
    let bestSource = '';
    
    quotes.forEach((quote, index) => {
      if (quote && quote.length > 1 && quote[1].gt(bestAmountOut)) {
        bestAmountOut = quote[1];
        bestSource = index === 0 ? 'Trader Joe' : 'Pangolin';
      }
    });
    
    if (bestAmountOut.eq(0)) {
      throw new Error('No liquidity found for this pair on Avalanche');
    }
    
    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: bestAmountOut,
      source: bestSource,
      path
    };
  }
  
  /**
   * Get a quote with error handling
   * @private
   */
  async _getQuoteWithFallback(contract, method, params) {
    try {
      return await contract[method](...params);
    } catch (error) {
      console.warn(`Error getting quote from ${contract.address}:`, error.message);
      return null;
    }
  }

  /**
   * Execute a token swap on the best available Avalanche DEX
   * @param {string} tokenIn - Address of input token
   * @param {string} tokenOut - Address of output token
   * @param {ethers.BigNumber} amountIn - Amount of input token
   * @param {ethers.BigNumber} minAmountOut - Minimum acceptable output amount
   * @param {string} recipient - Address to receive output tokens
   * @param {ethers.Signer} signer - Transaction signer
   * @returns {Promise<ethers.providers.TransactionResponse>} Transaction response
   */
  async executeSwap(tokenIn, tokenOut, amountIn, minAmountOut, recipient, signer) {
    // Get the best price info
    const bestPrice = await this.getBestPrice(tokenIn, tokenOut, amountIn);
    
    // Select the appropriate contract
    const routerContract = bestPrice.source === 'Trader Joe' 
      ? this.liquiditySources.traderJoe.connect(signer)
      : this.liquiditySources.pangolin.connect(signer);
    
    // Calculate deadline (5 minutes from now - shorter than Ethereum due to faster Avalanche blocks)
    const deadline = Math.floor(Date.now() / 1000) + 300;
    
    // Execute the swap
    return routerContract.swapExactTokensForTokens(
      amountIn,
      minAmountOut,
      bestPrice.path,
      recipient,
      deadline
    );
  }
  
  /**
   * Source backup liquidity from Avalanche DEXes for the batch auction
   * This helps ensure orders can be filled even with limited direct liquidity
   * @param {string} tokenA - First token in pair
   * @param {string} tokenB - Second token in pair
   * @param {ethers.BigNumber} requiredLiquidity - Amount of liquidity needed
   * @returns {Promise<Object>} Liquidity options with sources and rates
   */
  async sourceLiquidityForBatch(tokenA, tokenB, requiredLiquidity) {
    if (!this.initialized) await this.initialize();
    
    // Check both directions of the trading pair
    const aToB = await this.getBestPrice(tokenA, tokenB, requiredLiquidity);
    const bToA = await this.getBestPrice(tokenB, tokenA, requiredLiquidity);
    
    return {
      aToB,
      bToA,
      availableLiquidity: {
        [tokenA]: aToB.amountIn,
        [tokenB]: bToA.amountIn
      },
      rates: {
        aToB: aToB.amountOut.div(aToB.amountIn),
        bToA: bToA.amountOut.div(bToA.amountIn)
      }
    };
  }
}

module.exports = AvalancheLiquidityProvider;
