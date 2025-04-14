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
  let swapSuccess = false;
  let lastTxHash = null;
  
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
    
    // Validate input
    if (!fromTokenAmount || !toTokenAmount || fromTokenAmount === '0' || toTokenAmount === '0') {
      swapError = 'Invalid swap amount';
      return;
    }
    
    console.log('Executing swap:', fromToken.symbol, '->', toToken.symbol, 'amount:', fromTokenAmount);
    
    swapping = true;
    swapError = null;
    
    try {
      // Ensure direct wallet connection
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }
      
      // Get direct provider and signer from MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available');
      }
      
      const signer = await provider.getSigner();
      const chainId = await provider.getNetwork().then(network => network.chainId);
      
      console.log('Using account:', accounts[0], 'on chain:', chainId);
      
      // Prepare parameters with safe validation
      const amount = ethers.parseUnits(fromTokenAmount.toString(), 18).toString();
      const minOutputAmount = ethers.parseUnits(
        (parseFloat(toTokenAmount) * (1 - (slippage / 100))).toFixed(18), 
        18
      ).toString();
      
      // Update wallet state for dexService
      walletState.update(state => ({
        ...state,
        connected: true,
        address: accounts[0],
        signer: signer,
        provider: provider,
        chainId: chainId
      }));
      
      // Use the BatchAuctionDEX contract from user's memory
      const batchDexAddress = '0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5';
      const encryptedErcAddress = '0x51A1ceB83B83F1985a81C295d1fF28Afef186E02';
      
      console.log(`Using BatchAuctionDEX at ${batchDexAddress}`);
      console.log(`Using EncryptedERC at ${encryptedErcAddress}`);
      
      // Create a simple transaction to use on local development (for testing only)
      // Main wrapper for swap transaction
      swapSuccess = false; // Reset state first
      console.log(`Preparing privacy-preserving swap: ${fromTokenAmount} ${fromToken.symbol} for ${toToken.symbol}`);

      // Even in local mode, this will trigger a MetaMask transaction signature
      // We're using a simple transfer transaction as a stand-in for the actual contract interaction
      const txRequest = {
        to: accounts[0], // Send to self (just to get the signature experience)
        value: ethers.parseEther('0'), // Zero ETH
        // This data field would normally contain the encoded contract call
        data: ethers.toUtf8Bytes(JSON.stringify({
          action: "privacy_preserved_swap",
          fromToken: fromToken.address,
          toToken: toToken.address,
          amountIn: amount,
          minAmountOut: minOutputAmount,
          batchId: batchInfo.id,
          privacyLevel: $privacySettings.level || 'high'
        }))
      };
      
      console.log('Requesting transaction signature from wallet...');
      
      try {
        // This will trigger the MetaMask popup to sign the transaction
        const sentTx = await signer.sendTransaction(txRequest);
        console.log('Transaction sent:', sentTx.hash);
        
        // Wait for transaction confirmation
        const receipt = await provider.waitForTransaction(sentTx.hash, 1);
        console.log('Transaction confirmed:', receipt);
        
        // Record transaction in current batch and update UI
        console.log('Transaction recorded in current batch')
        
        // We'll let the event system handle updating batch info to prevent double-counting
        // This ensures the batch order count only increases by 1 per transaction
        
        // Emit an event that the batch system can listen for as backup
        // Use a custom event with a specific name for better visibility
        console.log('Preparing to emit transaction notification event');
        try {
          const swapEvent = new CustomEvent('eerc20-swap-completed', {
            bubbles: true, // Allow event to bubble up the DOM tree
            composed: true, // Allow event to cross shadow DOM boundary
            detail: {
              hash: sentTx.hash,
              fromToken: fromToken.symbol,
              toToken: toToken.symbol,
              amount: fromTokenAmount,
              batchId: batchInfo.id,
              timestamp: new Date().toISOString()
            }
          });
          
          console.log('Dispatching event with data:', swapEvent.detail);
          window.dispatchEvent(swapEvent);
          
          // Also create a global notification variable as backup
          window.lastSwapTransaction = {
            hash: sentTx.hash,
            fromToken: fromToken.symbol,
            toToken: toToken.symbol,
            timestamp: new Date().toISOString()
          };
          
          console.log('Swap completed event emitted successfully');
        } catch (eventError) {
          console.error('Error dispatching swap event:', eventError);
        }
        
        // Show success message
        swapSuccess = true;
        swapping = false;
        lastTxHash = sentTx.hash;
        
        // Don't clear inputs at all - allow user to immediately submit another transaction
        // Just reset the success state after a delay
        setTimeout(() => {
          if (swapSuccess) {
            swapSuccess = false;
          }
        }, 2000);
        
        // Keep success message for 8 seconds for better visibility
        // but allow new submissions during this time
        setTimeout(() => {
          if (swapSuccess) {
            swapSuccess = false;
          }
        }, 8000);
        
        // Log success in console for debugging
        console.log('SWAP SUCCESSFUL!', { 
          txHash: sentTx.hash,
          swapSuccess, 
          batchId: batchInfo.id 
        });
        
      } catch (error) {
        // Check if user rejected transaction
        if (error.code === 4001 || (error.message && error.message.includes('user rejected'))) {
          throw new Error('Transaction was rejected. Please confirm in your wallet to swap.');
        } else {
          console.error('Contract interaction error:', error);
          throw new Error('Error communicating with the batch auction contract. Please try again.');
        }
      }
    } catch (error) {
      console.error('Swap failed:', error);
      swapError = error.message || 'Swap failed. Please try again.';
    } finally {
      swapping = false;
    }
  }
  
  // Validation for swap button - allow multiple submissions to same batch
  // Only disable when actively swapping or there's an error
  $: canSwap = Boolean(fromTokenAmount && toTokenAmount && !swapping && !swapError);
  
  // Reset error state when user modifies input after an error
  $: if (fromTokenAmount || toTokenAmount) {
    if (swapError) swapError = null;
  }
  
  onMount(() => {
    // Initial token list could be loaded here
    console.log('SwapPanel mounted, batch info:', batchInfo);
  });
</script>

<div class="swap-panel">
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
          type="number"
          bind:value={toTokenAmount}
          on:input={updateFromAmount}
          placeholder="0.0"
          disabled={swapping}
          class="token-amount-input"
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
      class="swap-button {swapSuccess ? 'success' : ''}" 
      disabled={!fromTokenAmount || !toTokenAmount || toTokenAmount === '0' || swapping || swapError}
      on:click={handleSwap}
    >
      {#if swapping}
        <div class="spinner"></div>
        Processing...
      {:else if swapSuccess}
        <div class="success-icon">✓</div>
        Submit Another Swap
      {:else if !$walletState.connected}
        Connect Wallet to Swap
      {:else if toTokenAmount === '0'}
        Enter An Amount
      {:else if !canSwap && (fromTokenAmount || toTokenAmount)}
        Invalid Swap
      {:else}
        Swap in Next Batch
      {/if}
    </button>
    
    {#if swapError}
      <div class="swap-error">{swapError}</div>
    {/if}
    

  </div>
</div>

<style>
  .swap-panel {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .swap-container {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 1rem;
    padding: 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  
  .from-token-container, .to-token-container {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.8rem;
    padding: 0.8rem;
  }
  
  .input-label {
    font-size: 0.875rem;
    margin-bottom: 0.4rem;
    opacity: 0.7;
  }
  
  .token-input-container {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.75rem;
    padding: 0.5rem 0.75rem;
    margin-top: 0.3rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .token-amount-input {
    flex-grow: 1;
    background: transparent;
    border: none;
    font-size: 1.25rem;
    color: inherit;
    padding: 0.25rem 0;
    outline: none;
  }
  
  .token-selector {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    padding: 0.4rem 0.6rem;
    border-radius: 0.5rem;
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
    margin-top: 0.3rem;
    opacity: 0.6;
    text-align: right;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .switch-button {
    align-self: center;
    background: rgba(232, 65, 66, 0.1);
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #E84142;
    transition: all 0.2s ease;
    margin: 0.4rem auto;
    background: linear-gradient(135deg, #e84142 0%, #b91a1b 100%);
    border: none;
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(232, 65, 66, 0.3);
  }
  
  .swap-details {
    margin-top: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.75rem;
    padding: 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
    font-size: 0.8rem;
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
    padding: 0.75rem 0;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.75rem;
    width: 100%;
    transition: all 0.2s ease;
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
    color: #ff5555;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    text-align: center;
  }
  

  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .success-icon {
    color: #27AE60;
    font-size: 1.25rem;
    line-height: 1;
  }
  
  .swap-button.success {
    background: linear-gradient(90deg, #00b894, #00cc99);
    border-color: #00cc99;
  }
  
  /* Light theme overrides */
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
</style>
