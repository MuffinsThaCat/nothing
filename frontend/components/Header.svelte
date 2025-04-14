<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { ethers } from 'ethers';
  import dexService from '../services/dexService';
  import DirectConnect from './DirectConnect';
  import ThemeToggle from './ThemeToggle.svelte';
  import { writable } from 'svelte/store';
  
  export let connected = false;
  export let address = '';
  export let onConnect = () => {};
  export let onDisconnect = () => {};
  
  // Transaction notification system
  let notifications = [];
  let notificationTimeouts = [];
  let maxNotifications = 3;
  let lastNotificationHash = null; // Track last notification to prevent duplicates
  
  let connecting = false;
  let connectionError = null;
  let localConnected = false;
  let localAddress = '';
  const dispatch = createEventDispatcher();
  
  // Use local state for more direct control, if parent props don't update
  $: effectiveConnected = localConnected || connected;
  $: effectiveAddress = localAddress || address;
  
  // Format address for display with safe parameter validation (Wasmlanche principle)
  $: displayAddress = effectiveAddress && typeof effectiveAddress === 'string' && effectiveAddress.length >= 10 ? 
    `${effectiveAddress.substring(0, 6)}...${effectiveAddress.substring(effectiveAddress.length - 4)}` : 
    '';
    

  

  
  async function connectWallet() {
    try {
      console.log('Using DirectConnect utility to force wallet popup...');
      connecting = true;
      connectionError = null;

      // Use the standalone direct connection utility that's designed to force popup
      const result = await DirectConnect.directConnectWallet();
      
      if (result.success && result.accounts?.length > 0) {
        // Set the address immediately for better UX
        address = result.accounts[0];
        
        // Notify the app that we're connected
        onConnect();
      } else {
        throw new Error(result.error || 'No accounts returned from wallet');
      }
    } catch (error) {
      console.error('Error in direct wallet connection:', error);
      connectionError = error.message || 'Failed to connect wallet';
      
      // Fall back to the regular connect method
      onConnect();
    } finally {
      connecting = false;
    }
  }
  
  // Handle wallet disconnection
  function disconnectWallet() {
    localConnected = false;
    localAddress = '';
    onDisconnect();
  }
  

  
  function toggleTheme() {
    dispatch('toggleTheme');
  }
  
  // Add a new transaction notification
  function addTransactionNotification(txInfo) {
    // Skip if no hash or if we've already shown this transaction
    if (!txInfo || !txInfo.hash) {
      console.warn('Invalid transaction info:', txInfo);
      return;
    }
    
    // Prevent duplicate notifications
    if (notifications.some(n => n.txHash === txInfo.hash)) {
      console.log('Duplicate notification prevented for:', txInfo.hash);
      return;
    }
    
    console.log('Creating notification for transaction:', txInfo.hash);
    lastNotificationHash = txInfo.hash;
    
    const notification = {
      id: Date.now(),
      type: 'transaction',
      message: `${txInfo.fromToken} → ${txInfo.toToken} swap added to batch`,
      txHash: txInfo.hash,
      timestamp: new Date()
    };
    
    // Add to beginning of array (newest first)
    notifications = [notification, ...notifications].slice(0, maxNotifications);
    
    // Auto-remove after 10 seconds
    const timeout = setTimeout(() => {
      notifications = notifications.filter(n => n.id !== notification.id);
    }, 10000);
    
    notificationTimeouts.push(timeout);
  }
  
  // Clear a specific notification
  function clearNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
  }
  
  // Listen for transaction events
  onMount(() => {
    // Listen for swap completion events with the new custom event name
    const handleSwapCompleted = (event) => {
      console.log('Transaction event received in header:', event.detail);
      addTransactionNotification(event.detail);
    };
    
    // Listen for both event names to be safe
    window.addEventListener('eerc20-swap-completed', handleSwapCompleted);
    window.addEventListener('swap-completed', handleSwapCompleted);
    
    // Also check for direct variable updates every second as a fallback
    const checkInterval = setInterval(() => {
      if (window.lastSwapTransaction && 
          (!lastNotificationHash || lastNotificationHash !== window.lastSwapTransaction.hash)) {
        console.log('Found new transaction via global variable:', window.lastSwapTransaction);
        addTransactionNotification(window.lastSwapTransaction);
        lastNotificationHash = window.lastSwapTransaction.hash;
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('eerc20-swap-completed', handleSwapCompleted);
      window.removeEventListener('swap-completed', handleSwapCompleted);
      clearInterval(checkInterval);
      // Clear all timeouts
      notificationTimeouts.forEach(t => clearTimeout(t));
    };
  });
</script>

<header class="dex-header">
  <div class="logo-container">
    <div class="logo">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 5L4 30H36L20 5Z" fill="url(#logo-gradient)"/>
        <circle cx="20" cy="20" r="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <path d="M15 20L18 23L25 16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="logo-gradient" x1="4" y1="30" x2="36" y2="5" gradientUnits="userSpaceOnUse">
            <stop stop-color="#E84142"/>
            <stop offset="1" stop-color="#FF9B9B"/>
          </linearGradient>
        </defs>
      </svg>
      <span class="logo-text">EERC20 Privacy DEX</span>
    </div>
    <div class="tag-line">Encrypted Transactions on Avalanche</div>
  </div>
  
  <div class="controls">
    <div class="privacy-badge">
      <span class="privacy-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6V12C4 15.31 7.58 19.8 12 22C16.42 19.8 20 15.31 20 12V6L12 2Z" stroke="#27AE60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 12L11 14L15 10" stroke="#27AE60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="privacy-text">EERC20 Privacy Protection</span>
    </div>
    
    <ThemeToggle on:toggle={toggleTheme} />
    
    {#if !effectiveConnected}
      <button class="connect-button" on:click={connectWallet} disabled={connecting}>
          <span class="connect-icon">
            {#if connecting}
              <span class="spinner">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M16 12h-4"></path>
                </svg>
              </span>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 11V7C7 5.93913 7.42143 4.92172 8.17157 4.17157C8.92172 3.42143 9.93913 3 11 3H13C14.0609 3 15.0783 3.42143 15.8284 4.17157C16.5786 4.92172 17 5.93913 17 7V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            {/if}
          </span>
          <span class="connect-text">{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
      {#if connectionError}
        <div class="connection-error">{connectionError}</div>
      {/if}
    {:else}
      <div class="connected-info">
        <div class="address-display">
          <span class="connected-indicator"></span>
          <!-- Display address with fallback message if not available -->
          {#if displayAddress}
            <span class="address-text">{displayAddress}</span>
          {:else}
            <span class="address-text address-pending">Address pending...</span>
          {/if}
        </div>
        <button class="disconnect-button" on:click={disconnectWallet}>
          <span class="disconnect-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
        
        <!-- Transaction Notifications -->
        {#if notifications.length > 0}
          <div class="transaction-notifications">
            {#each notifications as notification (notification.id)}
              <div class="transaction-notification">
                <div class="notification-content">
                  <div class="notification-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#27AE60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M9 12L11 14L15 10" stroke="#27AE60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="notification-text">
                    <div class="notification-message">{notification.message}</div>
                    <div class="notification-hash">{notification.txHash.substring(0, 8)}...</div>
                  </div>
                </div>
                <button class="notification-close" on:click={() => clearNotification(notification.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</header>

<style>
  .dex-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  /* Add spinner animation */
  @keyframes spinner {
    to {transform: rotate(360deg);}
  }
  
  .spinner {
    animation: spinner 1s linear infinite;
  }
  
  .logo-container {
    display: flex;
    flex-direction: column;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(90deg, #E84142 0%, #FF9B9B 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 10px rgba(232, 65, 66, 0.3);
  }
  
  .tag-line {
    margin-top: 0.1rem;
    font-size: 0.75rem;
    opacity: 0.6;
    margin-left: 3.4rem;
  }
  
  .controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .privacy-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(39, 174, 96, 0.1);
    border: 1px solid rgba(39, 174, 96, 0.2);
    border-radius: 0.75rem;
    padding: 0.4rem 0.8rem;
    margin-right: 1.5rem;
  }
  
  .privacy-icon {
    display: flex;
    align-items: center;
    color: #27AE60;
  }
  
  .privacy-text {
    font-size: 0.8rem;
    font-weight: 500;
    color: #27AE60;
  }
  
  .connect-button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.85rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    background: linear-gradient(135deg, #e84142 0%, #b91a1b 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(232, 65, 66, 0.3);
  }
  
  .connect-button:hover {
    box-shadow: 0 4px 18px rgba(232, 65, 66, 0.4);
    transform: translateY(-1px);
  }
  
  .connected-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative; /* Important for absolute positioning of children */
  }
  
  .address-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.8rem;
    border-radius: 0.75rem;
    background: rgba(39, 174, 96, 0.1);
    border: 1px solid rgba(39, 174, 96, 0.2);
    color: #27AE60;
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  .address-text {
    font-family: monospace;
    font-size: 0.85rem;
    margin-left: 6px;
  }
  
  .address-pending {
    opacity: 0.6;
  }
  
  /* Transaction notifications */
  .transaction-notifications {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    width: 320px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .transaction-notification {
    background: rgba(39, 174, 96, 0.1);
    border: 1px solid rgba(39, 174, 96, 0.2);
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    animation: slideIn 0.3s ease;
  }
  
  .notification-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .notification-icon {
    color: #27AE60;
  }
  
  .notification-text {
    display: flex;
    flex-direction: column;
  }
  
  .notification-message {
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .notification-hash {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  .notification-close {
    background: transparent;
    border: none;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
  }
  
  .notification-close:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }
  
  @keyframes slideIn {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .disconnect-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(232, 65, 66, 0.1);
    color: #E84142;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .disconnect-button:hover {
    background-color: rgba(232, 65, 66, 0.1);
    transform: rotate(90deg);
  }
  
  .connected-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #27AE60;
    box-shadow: 0 0 10px rgba(39, 174, 96, 0.8);
  }
  
  /* Light theme overrides */
  :global(.light-theme) .dex-header {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  :global(.light-theme) .privacy-badge {
    background: rgba(39, 174, 96, 0.05);
    border-color: rgba(39, 174, 96, 0.15);
  }
</style>
