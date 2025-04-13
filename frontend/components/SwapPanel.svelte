<script>
  import { onMount, getContext } from 'svelte';
  import { ethers } from 'ethers';
  import dexServiceModule from '../services/dexService';
  
  // Get stores from dexService
  const { walletState, privacySettings } = dexServiceModule;
  
  // Get the dexService from context if available, otherwise use the imported one
  const dexService = getContext('dexService') || dexServiceModule;
  
  // Batch information from the DEX backend
  export let batchInfo = {
    id: 'batch-1',
    timeRemaining: '00:00',
    ordersCount: 0,
    tvl: '$0'
  };
  
  // Token input/output state
  let fromTokenAmount = '';
  let toTokenAmount = '';
  let fromToken = { symbol: 'EERC20-A', logo: '', address: '0x1111111111111111111111111111111111111111' };
  let toToken = { symbol: 'EERC20-B', logo: '', address: '0x2222222222222222222222222222222222222222' };
  
  // Swap parameters
  let priceImpact = 0.05;
  let slippage = 0.5;
  let swapping = false;
  let swapError = null;
  
  // Maximum input validation (Wasmlanche principle: parameter bounds checking)
  const MAX_TOKEN_AMOUNT = '1000000000000000000000000'; // 1 million tokens with 18 decimals
  
  // Switch tokens in the UI
  function switchTokens() {
    [fromToken, toToken] = [toToken, fromToken];
    
    // Clear amounts to force recalculation
    const oldFromAmount = fromTokenAmount;
    fromTokenAmount = '';
    toTokenAmount = '';
    
    // If there was a value, update the new direction
    if (oldFromAmount) {
      fromTokenAmount = oldFromAmount;
      updateToAmount();
    }
  }
  
  // Safe number parsing with bounds checking (Wasmlanche principle)
  function safeParseFloat(value, defaultValue = 0) {
    if (!value) return defaultValue;
    
    try {
      // Validate input isn't unreasonably large
      if (value.length > 30) {
        console.warn('Input value too large, truncating:', value);
        value = value.substring(0, 30);
      }
      
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    } catch (error) {
      console.error('Error parsing float value:', error);
      return defaultValue;
    }
  }
  
  // Get quote from backend and update output amount
  async function updateToAmount() {
    if (!fromTokenAmount) {
      toTokenAmount = '';
      return;
    }
    
    try {
      // Bounds checking (Wasmlanche principle)
      if (fromTokenAmount.length > 30) {
        console.warn('Input amount too large, truncating');
        fromTokenAmount = fromTokenAmount.substring(0, 30);
      }
      
      // Safely handle large numbers using ethers.js
      const amount = ethers.parseUnits(
        fromTokenAmount.toString(), 
        18 // Assuming 18 decimals
      ).toString();
      
      // For demo purposes, always fetch the quote regardless of wallet connection
      swapError = null;
      
      // Artificial delay to show responsiveness
      setTimeout(async () => {
        try {
          console.log('Fetching swap quote for tokens:', fromToken.symbol, '->', toToken.symbol, 'amount:', amount);
          
          // Get swap quote with mocked balances
          const quote = await dexService.getSwapQuote(
            fromToken.address,
            toToken.address,
            amount
          );
          
          console.log('Received quote result:', quote);
          
          // Ensure the quote has an amountOut value
          if (!quote.amountOut) {
            console.error('Quote missing amountOut value:', quote);
            toTokenAmount = '0';
            return;
          }
          
          // Format the output amount
          const outputAmount = ethers.formatUnits(quote.amountOut, 18);
          console.log('Formatted output amount:', outputAmount);
          
          // Validate output is reasonable (Wasmlanche principle)
          if (safeParseFloat(outputAmount) <= 0) {
            console.warn('Output amount is zero or negative:', outputAmount);
            toTokenAmount = '0';
          } else {
            toTokenAmount = parseFloat(outputAmount).toFixed(6);
            console.log('Setting display amount to:', toTokenAmount);
          }
          
          // Update price impact
          priceImpact = quote.priceImpact;
        } catch (error) {
          console.error('Error getting swap quote:', error);
          swapError = error.message || 'Failed to get swap quote';
          toTokenAmount = '0';
        }
      }, 300);
    } catch (error) {
      console.error('Error in updateToAmount:', error);
      swapError = error.message || 'Failed to process input amount';
      toTokenAmount = '0';
    }
  }
  
  // Update input amount based on desired output
  function updateFromAmount() {
    if (!toTokenAmount) {
      fromTokenAmount = '';
      return;
    }
    
    try {
      // Bounds checking (Wasmlanche principle)
      if (toTokenAmount.length > 30) {
        console.warn('Output amount too large, truncating');
        toTokenAmount = toTokenAmount.substring(0, 30);
      }
      
      // Simple calculation - in a full implementation, this would call the backend
      fromTokenAmount = (safeParseFloat(toTokenAmount) / 1950 / (1 - (priceImpact / 100))).toFixed(6);
    } catch (error) {
      console.error('Error updating from amount:', error);
      swapError = 'Error calculating input amount';
      fromTokenAmount = '';
    }
  }
  
  // Execute swap through the backend
  async function handleSwap() {
    if (!fromTokenAmount || !toTokenAmount || swapping) return;
    
    // For demo purposes, allow swaps without wallet connection
    if (!fromTokenAmount || !toTokenAmount || fromTokenAmount === '0' || toTokenAmount === '0') {
      swapError = 'Invalid swap amount';
      return;
    }
    
    console.log('Executing swap:', fromToken.symbol, '->', toToken.symbol, 'amount:', fromTokenAmount);
    
    swapping = true;
    swapError = null;
    
    try {
      const amount = ethers.parseUnits(fromTokenAmount.toString(), 18).toString();
      const minOutputAmount = ethers.parseUnits(
        (parseFloat(toTokenAmount) * (1 - (slippage / 100))).toFixed(18), 
        18
      ).toString();
      
      // Debug logging (Wasmlanche principle)
      console.log('Swap parameters:', {
        fromToken: fromToken.address,
        toToken: toToken.address,
        amount,
        minOutputAmount,
        slippage,
        privacyLevel: $privacySettings.level
      });
      
      // Execute the swap through the DEX service
      const result = await dexService.executeSwap(
        fromToken.address,
        toToken.address,
        amount,
        minOutputAmount
      );
      
      console.log('Swap result:', result);
      
      // Reset form after successful swap
      fromTokenAmount = '';
      toTokenAmount = '';
    } catch (error) {
      console.error('Swap failed:', error);
      swapError = error.message || 'Swap failed. Please try again.';
    } finally {
      swapping = false;
    }
  }
  
  // Validation for swap button - for demo purposes, don't require wallet connection
  $: canSwap = Boolean(fromTokenAmount && toTokenAmount && !swapping && !swapError);
  
  onMount(() => {
    // Initial token list could be loaded here
    console.log('SwapPanel mounted, batch info:', batchInfo);
  });
</script>

<div class="swap-panel">
  <div class="batch-info">
    <div class="batch-header">
      <h3>Current Batch</h3>
      <div class="batch-id">{batchInfo.id}</div>
    </div>
    
    <div class="batch-stats">
      <div class="stat">
        <span class="stat-value">{batchInfo.timeRemaining}</span>
        <span class="stat-label">Remaining</span>
      </div>
      <div class="stat">
        <span class="stat-value">{batchInfo.ordersCount}</span>
        <span class="stat-label">Orders</span>
      </div>
      <div class="stat">
        <span class="stat-value">{batchInfo.tvl}</span>
        <span class="stat-label">TVL</span>
      </div>
    </div>
  </div>
  
  <div class="swap-container">
    <div class="from-token-container">
      <div class="input-label">From</div>
      <div class="token-input-container">
        <input 
          type="number" 
          placeholder="0.0" 
          bind:value={fromTokenAmount}
          on:input={updateToAmount} 
          class="token-amount-input"
        />
        <button class="token-selector">
          <span class="token-logo">{fromToken.logo}</span>
          <span class="token-symbol">{fromToken.symbol}</span>
          <span class="selector-arrow">▼</span>
        </button>
      </div>
      <div class="token-balance">Balance: 0.25 {fromToken.symbol}</div>
    </div>
    
    <button class="switch-button" on:click={switchTokens}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10L12 5L17 10M7 14L12 19L17 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    
    <div class="to-token-container">
      <div class="input-label">To (Estimated)</div>
      <div class="token-input-container">
        <input
          type="text"
          bind:value={toTokenAmount}
          on:input={updateFromAmount}
          placeholder="0.00"
          disabled={swapping}
        />
        <button class="token-selector">
          <span class="token-logo">{toToken.logo}</span>
          <span class="token-symbol">{toToken.symbol}</span>
          <span class="selector-arrow">▼</span>
        </button>
        {#if fromTokenAmount && parseFloat(fromTokenAmount) > 0 && toTokenAmount === '0'}
          <div class="error-message">No price available</div>
        {/if}
      </div>
      <div class="token-balance">Balance: 100.50 {toToken.symbol}</div>
    </div>
    
    <div class="swap-details">
      <div class="detail-row">
        <span class="detail-label">Rate</span>
        <span class="detail-value">1 {fromToken.symbol} ≈ 1950 {toToken.symbol}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Price Impact</span>
        <span class="detail-value price-impact">
          {typeof priceImpact === 'number' ? priceImpact.toFixed(2) : '0.00'}%
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Slippage Tolerance</span>
        <div class="slippage-selector">
          <button class={slippage === 0.1 ? 'active' : ''} on:click={() => slippage = 0.1}>0.1%</button>
          <button class={slippage === 0.5 ? 'active' : ''} on:click={() => slippage = 0.5}>0.5%</button>
          <button class={slippage === 1.0 ? 'active' : ''} on:click={() => slippage = 1.0}>1.0%</button>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">Privacy Level</span>
        <span class="detail-value privacy-high">
          <span class="privacy-dot"></span>
          High
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Batch Fee</span>
        <span class="detail-value">0.15%</span>
      </div>
    </div>
    
    <button 
      class="swap-button" 
      disabled={!fromTokenAmount || !toTokenAmount || toTokenAmount === '0' || swapping}
      on:click={handleSwap}
    >
      {#if swapping}
        <div class="spinner"></div>
        Processing...
      {:else if !$walletState.connected}
        Connect Wallet to Swap
      {:else if toTokenAmount === '0'}
        Enter An Amount
      {:else}
        Swap in Next Batch
      {/if}
      
      {#if swapError}
        <div class="swap-error">{swapError}</div>
      {/if}
    </button>
  </div>
</div>

<style>
  .swap-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .batch-info {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 1rem;
    padding: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .batch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .batch-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .batch-id {
    background: rgba(232, 65, 66, 0.1);
    padding: 0.3rem 0.7rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    color: #E84142;
    font-family: monospace;
  }
  
  .batch-stats {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.75rem;
    border-radius: 0.75rem;
    flex: 1;
  }
  
  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  .swap-container {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 1.5rem;
    padding: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .from-token-container, .to-token-container {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1rem;
    padding: 1rem;
  }
  
  .input-label {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    opacity: 0.7;
  }
  
  .token-input-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .token-amount-input {
    flex-grow: 1;
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: inherit;
    padding: 0.5rem 0;
    outline: none;
  }
  
  .token-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: inherit;
  }
  
  .token-selector:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .token-logo {
    font-size: 1.2rem;
  }
  
  .token-symbol {
    font-weight: 600;
  }
  
  .selector-arrow {
    font-size: 0.6rem;
    opacity: 0.6;
  }
  
  .token-balance {
    font-size: 0.75rem;
    margin-top: 0.5rem;
    opacity: 0.7;
    text-align: right;
  }
  
  .switch-button {
    align-self: center;
    background: rgba(232, 65, 66, 0.1);
    border: none;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #E84142;
    transition: all 0.2s ease;
    margin: 0.5rem 0;
  }
  
  .switch-button:hover {
    background: rgba(232, 65, 66, 0.2);
    transform: scale(1.05);
  }
  
  .swap-details {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }
  
  .detail-label {
    opacity: 0.7;
  }
  
  .price-impact {
    color: #E8A941;
  }
  
  .slippage-selector {
    display: flex;
    gap: 0.25rem;
  }
  
  .slippage-selector button {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    padding: 0.2rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    color: inherit;
  }
  
  .slippage-selector button.active {
    background: rgba(232, 65, 66, 0.2);
    color: #E84142;
  }
  
  .privacy-high {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #27AE60;
  }
  
  .privacy-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #27AE60;
  }
  
  .swap-button {
    background: linear-gradient(135deg, #e84142 0%, #b91a1b 100%);
    color: white;
    border: none;
    border-radius: 0.75rem;
    padding: 1rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .swap-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(232, 65, 66, 0.4);
  }
  
  .swap-button:disabled {
    background: linear-gradient(135deg, #8d8d8d 0%, #5e5e5e 100%);
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .swap-error {
    color: #E84142;
    font-size: 0.85rem;
    font-weight: 500;
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(232, 65, 66, 0.1);
    border-radius: 0.5rem;
    text-align: center;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
    word-break: break-word;
  }
  
  /* Light theme overrides */
  :global(.light-theme) .batch-info,
  :global(.light-theme) .swap-container {
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .from-token-container,
  :global(.light-theme) .to-token-container {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .swap-details {
    background: rgba(0, 0, 0, 0.03);
  }
  
  :global(.light-theme) .token-selector {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .token-selector:hover {
    background: rgba(0, 0, 0, 0.1);
  }
  
  :global(.light-theme) .stat {
    background: rgba(0, 0, 0, 0.05);
  }
</style>
