<script>
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import SwapPanel from './components/SwapPanel.svelte';
  import LiquidityPanel from './components/LiquidityPanel.svelte';
  import PrivacyDashboard from './components/PrivacyDashboard.svelte';
  import NetworkStatus from './components/NetworkStatus.svelte';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import DexProvider from './components/DexProvider.svelte';
  import { writable } from 'svelte/store';
  import dexService, { 
    walletState, 
    privacySettings, 
    networkStatus, 
    currentBatch 
  } from './services/dexService';
  
  // Global state
  const currentView = writable('swap');
  const darkMode = writable(true);
  
  // Connection handler
  const handleConnect = async () => {
    try {
      await dexService.initializeDexServices();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };
  
  // Disconnection handler
  const handleDisconnect = () => {
    dexService.disconnectWallet();
  };
  
  const toggleTheme = () => {
    darkMode.update(value => !value);
    document.body.classList.toggle('dark-theme');
  };
  
  // Toggle privacy features
  const togglePrivacyFeature = (feature, value) => {
    privacySettings.update(settings => ({ ...settings, [feature]: value }));
  };
  
  onMount(() => {
    // Initialize theme based on user preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-theme');
    }
  });
</script>

<svelte:head>
  <title>EERC20 Privacy DEX | Avalanche</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<DexProvider>
  <main class={$darkMode ? 'dark-theme' : 'light-theme'}>
    <div class="dex-container">
      <Header 
        connected={$walletState.connected} 
        address={$walletState.address}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        on:toggleTheme={toggleTheme} 
      />
      
      <div class="content-area">
        <div class="sidebar">
          <PrivacyDashboard />
          <NetworkStatus metrics={$networkStatus} />
        </div>
        
        <div class="main-panel">
          <div class="view-tabs">
            <button 
              class={$currentView === 'swap' ? 'active' : ''} 
              on:click={() => $currentView = 'swap'}>
              Swap
            </button>
            <button 
              class={$currentView === 'liquidity' ? 'active' : ''} 
              on:click={() => $currentView = 'liquidity'}>
              Liquidity
            </button>
            <button 
              class={$currentView === 'bridge' ? 'active' : ''} 
              on:click={() => $currentView = 'bridge'}>
              Bridge
            </button>
          </div>
          
          <div class="panel-container">
            {#if $currentView === 'swap'}
              <SwapPanel batchInfo={$currentBatch} />
            {:else if $currentView === 'liquidity'}
              <LiquidityPanel />
            {:else}
              <div class="bridge-panel">
                <h2>EERC20 Bridge</h2>
                <p>Connect wallet to access privacy-preserving bridging between EERC20 and standard tokens.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </main>
</DexProvider>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    transition: background-color 0.3s ease;
  }
  
  :global(body.dark-theme) {
    background: linear-gradient(135deg, #0c0e14 0%, #111827 100%);
    color: #e5e7eb;
  }
  
  :global(body.light-theme) {
    background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
    color: #111827;
  }
  
  .dex-container {
    max-width: 1440px;
    margin: 0 auto;
    padding: 1rem;
    min-height: 100vh;
  }
  
  .content-area {
    display: flex;
    gap: 2rem;
    margin-top: 2rem;
  }
  
  .sidebar {
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .main-panel {
    flex-grow: 1;
    border-radius: 1rem;
    overflow: hidden;
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.03);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  
  .view-tabs {
    display: flex;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  
  .view-tabs button {
    background: transparent;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 0.5rem;
  }
  
  .view-tabs button:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
  }
  
  .view-tabs button.active {
    color: #ffffff;
    background: linear-gradient(135deg, #e84142 0%, #b91a1b 100%);
    box-shadow: 0 4px 12px rgba(232, 65, 66, 0.3);
  }
  
  .panel-container {
    padding: 2rem;
  }
  
  :global(.dark-theme) .main-panel {
    background: rgba(10, 10, 15, 0.8);
  }
  
  :global(.light-theme) .main-panel {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .view-tabs {
    background: rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
  
  :global(.light-theme) .view-tabs button {
    color: rgba(0, 0, 0, 0.6);
  }
  
  :global(.light-theme) .view-tabs button:hover {
    color: rgba(0, 0, 0, 0.9);
    background: rgba(0, 0, 0, 0.05);
  }
</style>
