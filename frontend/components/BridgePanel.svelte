<!--
  Bridge Panel Component
  
  Provides a user interface for interacting with the TEE bridge to transfer assets
  across chains securely, with privacy guarantees maintained.
  
  Follows safe parameter handling principles throughout:
  - Validates all inputs before processing
  - Uses bounds checking to prevent overflows
  - Returns empty results instead of throwing errors
  - Implements comprehensive error handling
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import dexService from '../services/dexService.js';
  
  // Reactive stores
  const { walletState, bridgeState, dexState } = dexService;
  
  // Component state
  let selectedToken = null;
  let amount = '';
  let destinationChain = null;
  let recipient = '';
  let isProcessing = false;
  let errorMessage = '';
  let successMessage = '';
  let supportedChains = [];
  let pendingTransactions = [];
  let tokens = [];
  
  // Status refresh interval (in ms)
  const STATUS_REFRESH_INTERVAL = 15000;
  let statusRefreshTimer = null;
  
  // Input validation with safe bounds
  $: isAmountValid = validateAmount(amount);
  $: isRecipientValid = validateAddress(recipient);
  $: isFormValid = selectedToken && isAmountValid && destinationChain && isRecipientValid && !isProcessing;
  
  // Load supported chains and tokens on mount
  onMount(async () => {
    if ($bridgeState.initialized) {
      loadChains();
      loadTokens();
      refreshTransactionStatus();
      
      // Setup periodic status refresh with reasonable interval
      statusRefreshTimer = setInterval(refreshTransactionStatus, STATUS_REFRESH_INTERVAL);
    }
  });
  
  // Clean up on component destruction
  onDestroy(() => {
    if (statusRefreshTimer) {
      clearInterval(statusRefreshTimer);
    }
  });
  
  // Watch for bridge state changes
  $: if ($bridgeState) {
    supportedChains = $bridgeState.supportedChains;
    pendingTransactions = $bridgeState.pendingTransactions;
  }
  
  /**
   * Load supported chains with safe error handling
   */
  async function loadChains() {
    try {
      supportedChains = await dexService.getSupportedBridgeChains();
      
      // Set first chain as default if available
      if (supportedChains && supportedChains.length > 0) {
        destinationChain = supportedChains[0];
      }
    } catch (error) {
      console.error('Error loading chains:', error.message);
      // Use empty array as safe fallback
      supportedChains = [];
    }
  }
  
  /**
   * Load available tokens with safe error handling
   */
  async function loadTokens() {
    try {
      // In a real implementation, this would fetch the actual user's tokens
      // with balances from the blockchain
      tokens = [
        { address: '0xEERC20000000000000000000000000000001', symbol: 'eUSDC', decimals: 6, balance: '1000000000' },
        { address: '0xEERC20000000000000000000000000000002', symbol: 'eETH', decimals: 18, balance: '1000000000000000000' },
        { address: '0xEERC20000000000000000000000000000003', symbol: 'eAVAX', decimals: 18, balance: '5000000000000000000' }
      ];
      
      // Set first token as default
      if (tokens.length > 0) {
        selectedToken = tokens[0];
      }
    } catch (error) {
      console.error('Error loading tokens:', error.message);
      // Use empty array as safe fallback
      tokens = [];
    }
  }
  
  /**
   * Validate amount with safe parameter handling
   * @param {string} value - Amount to validate
   * @return {boolean} Is valid
   */
  function validateAmount(value) {
    if (!value || value === '') return false;
    
    try {
      // Check for valid number format
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) return false;
      
      // Check if selected token exists
      if (!selectedToken) return false;
      
      // Check against user balance with bounds checking
      const userBalance = selectedToken ? selectedToken.balance : '0';
      const userBalanceNum = parseFloat(userBalance) / Math.pow(10, selectedToken.decimals);
      
      return numValue <= userBalanceNum;
    } catch (error) {
      console.warn('Amount validation error:', error.message);
      return false;
    }
  }
  
  /**
   * Validate address format with safe parameter handling
   * @param {string} address - Address to validate
   * @return {boolean} Is valid
   */
  function validateAddress(address) {
    if (!address || address === '') return false;
    
    // Check for reasonable length to detect obvious errors
    if (address.length < 10 || address.length > 50) return false;
    
    // Basic format check (should be 0x + 40 hex chars for ETH-like addresses)
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }
  
  /**
   * Bridge assets to destination chain with comprehensive parameter validation
   */
  async function bridgeAssets() {
    if (!isFormValid) return;
    
    try {
      isProcessing = true;
      errorMessage = '';
      successMessage = '';
      
      // Safety check for wallet connection
      if (!$walletState.connected) {
        errorMessage = 'Wallet is not connected. Please connect your wallet first.';
        isProcessing = false;
        return;
      }
      
      // Safety check for bridge initialization
      if (!$bridgeState.initialized) {
        errorMessage = 'Bridge service is not initialized. Please try again later.';
        isProcessing = false;
        return;
      }
      
      // Convert amount to token units with correct decimals
      const amountInTokenUnits = (parseFloat(amount) * Math.pow(10, selectedToken.decimals)).toString();
      
      // Prepare bridge parameters with validation
      const params = {
        tokenAddress: selectedToken.address,
        chainId: destinationChain.id,
        amount: amountInTokenUnits,
        recipient: recipient
      };
      
      // Call bridge service with validated parameters
      const result = await dexService.bridgeToChain(params);
      
      if (result.success) {
        successMessage = `Transaction submitted! Hash: ${result.transactionHash}`;
        
        // Reset form on success
        amount = '';
        recipient = '';
      } else {
        errorMessage = result.error || 'Bridge transaction failed. Please try again.';
      }
    } catch (error) {
      // Safe error handling
      console.error('Bridge error:', error.message);
      errorMessage = error.message || 'An unexpected error occurred. Please try again.';
    } finally {
      isProcessing = false;
    }
  }
  
  /**
   * Refresh transaction status with safe error handling
   */
  async function refreshTransactionStatus() {
    try {
      // Update all pending transaction statuses
      for (const tx of pendingTransactions) {
        if (tx.status === 'pending' || tx.status === 'processing') {
          await dexService.getBridgeTransactionStatus(tx.hash);
        }
      }
    } catch (error) {
      console.warn('Error refreshing transaction status:', error.message);
      // Don't show error to user for background refresh
    }
  }
  
  /**
   * Format amount for display with safe parameter handling
   * @param {string} value - Amount in token units
   * @param {number} decimals - Token decimals
   * @return {string} Formatted amount
   */
  function formatAmount(value, decimals) {
    try {
      if (!value) return '0';
      
      // Convert to number with bounds checking
      const rawValue = parseFloat(value);
      if (isNaN(rawValue)) return '0';
      
      // Ensure decimals is within reasonable range
      const safeDecimals = Math.min(Math.max(0, decimals || 0), 18);
      
      // Format with token decimals
      const divisor = Math.pow(10, safeDecimals);
      const amount = rawValue / divisor;
      
      // Format with up to 6 decimal places
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      });
    } catch (error) {
      console.warn('Format amount error:', error.message);
      return '0';
    }
  }
  
  /**
   * Get transaction status text
   * @param {string} status - Transaction status
   * @return {string} Status text
   */
  function getStatusText(status) {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'complete': return 'Complete';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  }
  
  /**
   * Get transaction status class
   * @param {string} status - Transaction status
   * @return {string} Status class
   */
  function getStatusClass(status) {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'complete': return 'status-complete';
      case 'failed': return 'status-failed';
      default: return '';
    }
  }
</script>

<div class="bridge-panel">
  <h2>Bridge Assets</h2>
  <p class="subtitle">Transfer assets across chains with privacy guarantees</p>
  
  {#if !$bridgeState.initialized}
    <div class="bridge-status">
      <p>TEE Bridge is initializing...</p>
    </div>
  {:else}
    <div class="form-container">
      <!-- Error and success messages -->
      {#if errorMessage}
        <div class="error-message" transition:fade>
          {errorMessage}
        </div>
      {/if}
      
      {#if successMessage}
        <div class="success-message" transition:fade>
          {successMessage}
        </div>
      {/if}
      
      <!-- Bridge form -->
      <div class="form-group">
        <label for="token">Token:</label>
        <select id="token" bind:value={selectedToken} disabled={isProcessing}>
          {#each tokens as token}
            <option value={token}>{token.symbol} (Balance: {formatAmount(token.balance, token.decimals)})</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label for="amount">Amount:</label>
        <input
          id="amount"
          type="text"
          bind:value={amount}
          placeholder="0.0"
          disabled={isProcessing}
          class={!isAmountValid && amount ? 'invalid' : ''}
        />
        {#if selectedToken && !isAmountValid && amount}
          <div class="input-error">
            Invalid amount or exceeds balance
          </div>
        {/if}
      </div>
      
      <div class="form-group">
        <label for="destination">Destination Chain:</label>
        <select id="destination" bind:value={destinationChain} disabled={isProcessing}>
          {#each supportedChains as chain}
            <option value={chain}>{chain.name}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label for="recipient">Recipient Address:</label>
        <input
          id="recipient"
          type="text"
          bind:value={recipient}
          placeholder="0x..."
          disabled={isProcessing}
          class={!isRecipientValid && recipient ? 'invalid' : ''}
        />
        {#if !isRecipientValid && recipient}
          <div class="input-error">
            Invalid address format
          </div>
        {/if}
      </div>
      
      <button
        class="bridge-button"
        on:click={bridgeAssets}
        disabled={!isFormValid}
      >
        {isProcessing ? 'Processing...' : 'Bridge Assets'}
      </button>
    </div>
    
    <!-- Recent transactions -->
    {#if pendingTransactions.length > 0}
      <div class="transactions-container" transition:slide>
        <h3>Recent Transactions</h3>
        <div class="transactions-list">
          {#each pendingTransactions as tx}
            <div class="transaction-item">
              <div class="transaction-details">
                <div class="transaction-title">
                  Bridge {formatAmount(tx.amount, selectedToken?.decimals || 18)} to {tx.chainId}
                </div>
                <div class="transaction-hash">
                  TX: {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 8)}
                </div>
                <div class="transaction-time">
                  {new Date(tx.timestamp).toLocaleString()}
                </div>
              </div>
              <div class="transaction-status">
                <span class={getStatusClass(tx.status)}>
                  {getStatusText(tx.status)}
                </span>
                {#if tx.confirmations > 0}
                  <div class="confirmations">
                    {tx.confirmations} confirmation{tx.confirmations !== 1 ? 's' : ''}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .bridge-panel {
    background-color: var(--card-bg);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
  }
  
  h2 {
    font-size: 1.5rem;
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
  
  .subtitle {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
  
  .form-container {
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-weight: 500;
  }
  
  input, select {
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 1rem;
  }
  
  input.invalid {
    border-color: var(--error-color);
  }
  
  .input-error {
    color: var(--error-color);
    font-size: 0.8rem;
    margin-top: 0.3rem;
  }
  
  .bridge-button {
    width: 100%;
    padding: 0.8rem;
    border-radius: 8px;
    border: none;
    background-color: var(--primary-color);
    color: white;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 1rem;
  }
  
  .bridge-button:hover:not(:disabled) {
    background-color: var(--primary-color-hover);
  }
  
  .bridge-button:disabled {
    background-color: var(--disabled-color);
    cursor: not-allowed;
  }
  
  .error-message {
    background-color: var(--error-bg);
    color: var(--error-color);
    padding: 0.8rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .success-message {
    background-color: var(--success-bg);
    color: var(--success-color);
    padding: 0.8rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .transactions-container {
    margin-top: 2rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    color: var(--text-primary);
  }
  
  .transactions-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  
  .transaction-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: var(--card-bg-secondary);
    border-radius: 8px;
  }
  
  .transaction-title {
    font-weight: 500;
    margin-bottom: 0.3rem;
  }
  
  .transaction-hash, .transaction-time {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
  
  .transaction-status {
    text-align: right;
  }
  
  .status-pending {
    color: var(--pending-color);
  }
  
  .status-processing {
    color: var(--processing-color);
  }
  
  .status-complete {
    color: var(--success-color);
  }
  
  .status-failed {
    color: var(--error-color);
  }
  
  .confirmations {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.3rem;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .transaction-item {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .transaction-status {
      text-align: left;
      margin-top: 0.5rem;
    }
  }
</style>
