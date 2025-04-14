<script>
  import { onMount } from 'svelte';
import SafeParameterHandler, { safeLogger } from './utils/SafeParameterHandler.js';
import EERC20Adapter from './adapters/EERC20Adapter.js';
  import Header from './components/Header.svelte';
  import SwapPanel from './components/SwapPanel.svelte';
  import LiquidityPanel from './components/LiquidityPanel.svelte';
  import PrivacyDashboard from './components/PrivacyDashboard.svelte';
  import NetworkStatus from './components/NetworkStatus.svelte';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import DexProvider from './components/DexProvider.svelte';
  import BridgePanel from './components/BridgePanel.svelte';
  import { writable } from 'svelte/store';
  import dexService, { 
    walletState, 
    dexState,
    bridgeState,
    networkStatus, 
    currentBatch 
  } from './services/dexService';
  
  // Global state
  const currentView = writable('swap');
  const darkMode = writable(true);
  
  // Connection handler
  const handleConnect = async () => {
    try {
      console.log('Connecting wallet...');
      // First initialize services if needed
      if (!dexService.isInitialized) {
        await dexService.initializeDexServices();
      }
      // Then connect the wallet
      await dexService.connectWallet();
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
  
  // Batch system state
  let batchTimeRemaining = '--:--';
  let privacyLevel = 'Low';
  let privacyScore = 0;
  let batchActive = false;
  let orderCount = 0;
  let batchStartTime = null;
  let currentBatchId = 1; // Start with batch 1
  let processedTransactions = new Set(); // Track transaction hashes to prevent double-counting
  
  // Function to start a new batch when first order is placed
  function startNewBatch() {
    if (!batchActive) {
      batchActive = true;
      batchStartTime = Date.now();
      orderCount = 1; // First order
      // Don't increment batch ID here - only increment when a batch completes
      console.log(`Starting batch ${currentBatchId} at ${new Date().toISOString()}`);      
      updateBatchState();
    }
  }
  
  // Function to add an order to the current batch
  function addOrderToBatch() {
    if (!batchActive) {
      startNewBatch();
    } else {
      orderCount++;
      updateBatchState();
    }
  }
  
  // Make the function available in the window object for components to access
  onMount(() => {
    window.appFunctions = {
      addOrderToBatch,
      updateBatchState
    };

    // Also listen for swap events to update batch
    const handleSwapCompleted = (event) => {
      try {
        if (!event || !event.detail || !event.detail.hash) {
          console.log('Invalid swap event, cannot update batch');
          return;
        }
        
        const txHash = event.detail.hash;
        
        // Check if we've already processed this transaction
        if (processedTransactions.has(txHash)) {
          console.log('Transaction already counted in batch:', txHash);
          return;
        }
        
        // Add to processed set to prevent double-counting
        processedTransactions.add(txHash);
        console.log('App detected new swap completion, updating batch information');
        addOrderToBatch();
      } catch (error) {
        console.error('Error handling swap event:', error);
      }
    };
    
    window.addEventListener('eerc20-swap-completed', handleSwapCompleted);
    window.addEventListener('swap-completed', handleSwapCompleted);
    
    return () => {
      window.removeEventListener('eerc20-swap-completed', handleSwapCompleted);
      window.removeEventListener('swap-completed', handleSwapCompleted);
      delete window.appFunctions;
    };
  });
  
  // Function to update the batch state
  function updateBatchState() {
    if (!batchActive) {
      batchTimeRemaining = '--:--';
      privacyLevel = 'Low';
      privacyScore = 0;
      return;
    }
    
    // Calculate time remaining in 5-minute batch
    const now = Date.now();
    const batchCycleMs = 5 * 60 * 1000; // 5 minute batches
    const elapsedMs = now - batchStartTime;
    const remainingMs = Math.max(0, batchCycleMs - elapsedMs);
    
    // Check if batch has ended
    if (remainingMs <= 0) {
      // Mark the current batch as completed with batch settlement
      const completedBatchId = currentBatchId;
      console.log(`Batch ${completedBatchId} completed with ${orderCount} orders at ${new Date().toISOString()}`);
      
      // Increment batch ID for the next batch that will start
      currentBatchId++;
      
      // Clear processed transactions from previous batch
      processedTransactions.clear();
      
      // Reset for new batch
      batchActive = false;
      orderCount = 0;
      batchTimeRemaining = '--:--';
      privacyLevel = 'Low';
      privacyScore = 0;
      
      // Simulate batch settlement notification
      if (orderCount > 0) {
        setTimeout(() => {
          const settlementEvent = new CustomEvent('batch-settled', {
            detail: { batchId: completedBatchId, orders: orderCount }
          });
          window.dispatchEvent(settlementEvent);
        }, 1000);
      }
      
      return;
    }
    
    // Update countdown display
    const seconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    batchTimeRemaining = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    // Update privacy metrics based on order count
    if (orderCount < 5) {
      privacyLevel = 'Low';
      privacyScore = Math.min(40, orderCount * 10);
    } else if (orderCount < 15) {
      privacyLevel = 'Medium';
      privacyScore = 40 + ((orderCount - 5) * 4);
    } else {
      privacyLevel = 'High';
      privacyScore = Math.min(98, 80 + ((orderCount - 15) * 1.2));
    }
  }
  
  // Timer interval for updating the batch state
  let batchInterval;
  
  // Listen for transaction events from SwapPanel
  function handleSwapCompleted() {
    addOrderToBatch();
  }
  
  onMount(() => {
    // Start the batch update interval
    batchInterval = setInterval(() => {
      if (batchActive) {
        updateBatchState();
      }
    }, 1000); // Update every second
    
    // Initialize theme - always use dark mode for this privacy-focused DEX
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    darkMode.set(true);
    
    // Start the batch monitoring interval
    updateBatchState();
    
    // Add event listener for transaction events
    window.addEventListener('swap-completed', handleSwapCompleted);
    
    return () => {
      // Clean up on component destroy
      if (batchInterval) clearInterval(batchInterval);
      window.removeEventListener('swap-completed', handleSwapCompleted);
    };
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
          <div class="batch-info-container">
            <div class="batch-header">
              <h3>Current Batch</h3>
              <div class="batch-id">batch-{currentBatchId}</div>
            </div>
            
            <div class="batch-stats">
              <div class="stat">
                <span class="stat-value">{batchTimeRemaining}</span>
                <span class="stat-label">Remaining</span>
              </div>
              <div class="stat">
                <span class="stat-value">{orderCount}</span>
                <span class="stat-label">Orders</span>
              </div>
            </div>
            
            <div class="privacy-meter">
              <div class="privacy-label">Privacy Level: <span class="privacy-value" class:high={privacyLevel === 'High'} class:medium={privacyLevel === 'Medium'} class:low={privacyLevel === 'Low'}>{privacyLevel}</span></div>
              <div class="progress-bar">
                <div class="progress" style={`width: ${privacyScore}%`} class:high={privacyLevel === 'High'} class:medium={privacyLevel === 'Medium'} class:low={privacyLevel === 'Low'}></div>
              </div>
            </div>
          </div>
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
            {:else if $currentView === 'bridge'}
              <BridgePanel />
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
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .sidebar {
    flex: 0 0 300px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .batch-info-container {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.75rem;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .batch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }
  
  .batch-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  
  .privacy-meter {
    margin-top: 0.75rem;
  }
  
  .privacy-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
  }
  
  .privacy-value {
    font-weight: 600;
  }
  
  .privacy-value.high {
    color: #27AE60;
  }
  
  .privacy-value.medium {
    color: #F2C94C;
  }
  
  .privacy-value.low {
    color: #E84142;
  }
  
  .progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress {
    height: 100%;
    transition: width 0.5s ease;
  }
  
  .progress.high {
    background: #27AE60;
  }
  
  .progress.medium {
    background: #F2C94C;
  }
  
  .progress.low {
    background: #E84142;
  }
  
  .batch-id {
    background: rgba(232, 65, 66, 0.1);
    padding: 0.3rem 0.7rem;
    border-radius: 0.75rem;
    font-size: 0.8rem;
    color: #E84142;
    font-family: monospace;
  }
  
  .batch-stats {
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.5rem;
    border-radius: 0.5rem;
    flex: 1;
  }
  
  .stat-value {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
    opacity: 0.6;
  }
  
  .main-panel {
    flex-grow: 1;
    border-radius: 0.75rem;
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
