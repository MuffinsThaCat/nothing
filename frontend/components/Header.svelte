<script>
  import { createEventDispatcher } from 'svelte';
  import { ethers } from 'ethers';
  import dexService from '../services/dexService';
  import DirectConnect from './DirectConnect';
  import ThemeToggle from './ThemeToggle.svelte';
  
  export let connected = false;
  export let address = '';
  export let onConnect = () => {};
  export let onDisconnect = () => {};
  
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
      </div>
    {/if}
  </div>
</header>

<style>
  .dex-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 0;
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
    margin-top: 0.25rem;
    font-size: 0.875rem;
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
    gap: 0.5rem;
    padding: 0.6rem 1.2rem;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.9rem;
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
    color: #E84142;
    opacity: 0.7;
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
