<script>
  import { createEventDispatcher } from 'svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  
  // Props from App.svelte via DexProvider
  export let connected = false;
  export let address = null;
  export let onConnect = () => {};
  export let onDisconnect = () => {};
  
  const dispatch = createEventDispatcher();
  
  // Format address for display
  $: displayAddress = address ? 
    `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 
    '';
  
  function connectWallet() {
    onConnect();
  }
  
  function disconnectWallet() {
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
    
    {#if !connected}
      <button class="connect-button" on:click={connectWallet}>
        <span class="connect-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.97 6.43L12 2L4.03 6.43L12 10.85L19.97 6.43ZM20 7.97V16.5L12.5 20.5L5 16.5V7.97" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        Connect Wallet
      </button>
    {:else}
      <div class="connected-info">
        <div class="address-display">
          <span class="connected-indicator"></span>
          <span class="address-text">{displayAddress}</span>
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
    background: rgba(232, 65, 66, 0.2);
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
