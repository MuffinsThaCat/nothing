<script>
  import { onMount, onDestroy, setContext } from 'svelte';
  import dexService, { 
    walletState, 
    privacySettings, 
    networkStatus, 
    currentBatch,
    liquidityPools,
    userBalances,
    isInitialized
  } from '../services/dexService';
  
  export let autoConnect = false;
  
  let initializationAttempted = false;
  let initializationError = null;
  
  // Make DexService available to all child components via context
  setContext('dexService', dexService);
  
  // Initialization function
  async function initialize() {
    if (initializationAttempted) return;
    
    initializationAttempted = true;
    try {
      if (autoConnect) {
        await dexService.initializeDexServices();
      }
    } catch (error) {
      console.error('Failed to initialize DEX services:', error);
      initializationError = error.message;
    }
  }
  
  onMount(() => {
    initialize();
    
    // Return a cleanup function
    return () => {
      // Disconnect wallet when component is destroyed
      if ($walletState.connected) {
        dexService.disconnectWallet();
      }
    };
  });
</script>

<slot 
  walletState={$walletState}
  privacySettings={$privacySettings}
  networkStatus={$networkStatus}
  currentBatch={$currentBatch}
  liquidityPools={$liquidityPools}
  userBalances={$userBalances}
  isInitialized={$isInitialized}
  error={initializationError}
></slot>
