<script>
  import { onMount } from 'svelte';
  import { walletState, dexState } from '../services/dexService';
  import dexService from '../services/dexService';
  import { ethers } from 'ethers';
  
  let selectedTab = 'add';
  let processing = false; // Processing state for all operations
  let token1Amount = '';
  let token2Amount = '';
  // Status messages for various operations
  let addLiquidityStatus = null; // For add liquidity operations
  let removeStatus = null; // For remove liquidity operations
  
  // Tokens for add liquidity
  let token1 = {};
  let token2 = {};
  let slippage = 0.5;
  let token1BalanceDisplay = '32.5';
  let token2BalanceDisplay = '1,250.75';
  
  // Add liquidity sub-tab control
  let addLiquiditySubTab = 'browse'; // 'browse' or 'add'
  
  // Remove liquidity state
  let selectedPoolForRemove = null;
  let removeAmount = "";
  
  // For creating new pools
  let newToken1 = { 
    address: '0x4111111111111111111111111111111111111111', 
    symbol: '', 
    decimals: 18 
  };
  let newToken2 = { 
    address: '0x4222222222222222222222222222222222222222', 
    symbol: '', 
    decimals: 6 
  };
  let initialLiquidity1 = '';
  let initialLiquidity2 = '';
  let privacyLevel = 2; // Default to medium privacy
  let creatingPool = false; // For form submission
  let poolCreationStatus = { message: '', error: false };
  
  // Mock liquidity pools
  let myPools = [
    {
      id: 'pool-1',
      token1: { symbol: 'EERC20-AVAX', logo: '🔒' },
      token2: { symbol: 'EERC20-USDC', logo: '🔒' },
      myLiquidity: '$1,250.45',
      totalLiquidity: '$45,230.78',
      apr: '12.4%',
      privacyLevel: 3
    },
    {
      id: 'pool-2',
      token1: { symbol: 'EERC20-USDT', logo: '🔒' },
      token2: { symbol: 'EERC20-BTC', logo: '🔒' },
      myLiquidity: '$589.32',
      totalLiquidity: '$28,742.15',
      apr: '8.9%',
      privacyLevel: 3
    }
  ];
  
  function updateToken2Amount() {
    if (token1Amount) {
      // Mock calculation - in real implementation would use actual rates
      token2Amount = (parseFloat(token1Amount) * 1950).toFixed(6);
    } else {
      token2Amount = '';
    }
  }
  
  function updateToken1Amount() {
    if (token2Amount) {
      // Mock calculation - in real implementation would use actual rates
      token1Amount = (parseFloat(token2Amount) / 1950).toFixed(6);
    } else {
      token1Amount = '';
    }
  }
  
  // Helper function to refresh pools
  async function refreshPools() {
    try {
      // In a real implementation, this would update the pool list from the backend
      console.log('Refreshing pools list');
      // Simulate a pool refresh
      myPools = [...myPools];
    } catch (error) {
      console.error('Error refreshing pools:', error);
    }
  }
  
  // Add more liquidity to an existing pool with proper error checking
  function handleAddMoreLiquidity(pool) {
    // Log for debugging
    console.log('Adding more liquidity to pool:', pool.id);
    
    // Set the tokens directly from the pool (no need to search)
    token1 = {
      symbol: pool.token1.symbol,
      logo: pool.token1.logo || '🔒',
      address: pool.token1.address || '0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B' // Default to the Bitcoin Adapter address
    };
    
    token2 = {
      symbol: pool.token2.symbol,
      logo: pool.token2.logo || '🔒',
      address: pool.token2.address || '0xBEc49fA140aCaA83533fB00A2BB19bDdd0290f25' // Default to the Ethereum Adapter address
    };
    
    // Reset amounts for new entry
    token1Amount = '';
    token2Amount = '';
    
    // Switch to add liquidity form tab
    addLiquiditySubTab = 'add';
  }
  
  // Function to reset the form and go back to pool selection
  function resetForm() {
    token1 = {};
    token2 = {};
    token1Amount = '';
    token2Amount = '';
    addLiquiditySubTab = 'browse';
    addLiquidityStatus = null;
  }
  
  // Switch to remove liquidity tab with the selected pool
  function showRemoveLiquidity(pool) {
    selectedPoolForRemove = pool;
    removeAmount = "";
    selectedTab = 'remove';
  }
  
  // Handle removing liquidity from a pool - implements Wasmlanche safe parameter handling
  async function handleRemoveLiquidity() {
    try {
      // Validate input amount with comprehensive safe parameter checking
      if (!removeAmount || isNaN(parseFloat(removeAmount)) || parseFloat(removeAmount) <= 0) {
        console.warn('Invalid remove amount:', removeAmount);
        removeStatus = {
          success: false,
          message: 'Please enter a valid amount to remove'
        };
        setTimeout(() => { removeStatus = null; }, 3000);
        return;
      }
      
      // Check wallet connection with proper error handling
      if (!$walletState.connected) {
        console.warn('Cannot remove liquidity: wallet not connected');
        removeStatus = {
          success: false,
          message: 'Please connect your wallet first'
        };
        setTimeout(() => { removeStatus = null; }, 3000);
        return;
      }
      
      // Start processing with clear status feedback
      processing = true;
      console.log('Preparing to remove liquidity from pool:', selectedPoolForRemove.id);
      
      // Apply safe parameter bounds checking (Wasmlanche principle)
      const safeAmount = parseFloat(removeAmount) < 100000000 ? removeAmount : '100000000';
      console.log('Safe bounded amount:', safeAmount);
      
      // Call the removeLiquidity function with validated parameters
      const result = await dexService.removeLiquidity({
        poolId: selectedPoolForRemove.id,
        amount: safeAmount,
        slippageTolerance: slippage
      });
      
      processing = false;
      console.log('Remove liquidity result:', result);
      
      if (result.success) {
        // Transaction was successful
        console.log('Liquidity removal successful:', result);
        
        // Update the UI based on the transaction result
        if (result.txHash) {
          removeStatus = {
            success: true,
            message: `Successfully removed ${safeAmount} LP tokens`,
            txHash: result.txHash
          };
        } else {
          removeStatus = {
            success: true,
            message: `Successfully removed ${safeAmount} LP tokens`
          };
        }
        
        // Refresh the pools list
        try {
          await refreshPools();
        } catch (error) {
          console.error('Error refreshing pools after removing liquidity:', error);
        }
      } else {
        // Transaction failed
        removeStatus = {
          success: false,
          message: result.error || 'Failed to remove liquidity'
        };
      }
      
      // Clear status message after a longer delay on success to allow user to see transaction hash
      const clearDelay = result.success ? 6000 : 4000;
      setTimeout(() => { removeStatus = null; }, clearDelay);
    } catch (error) {
      console.error('Error removing liquidity:', error);
      processing = false;
      removeStatus = {
        success: false,
        message: error.message || 'An error occurred while removing liquidity'
      };
      setTimeout(() => { removeStatus = null; }, 3000);
    }
  }
  
  // Go back to pools list from remove liquidity
  function cancelRemove() {
    selectedTab = 'my-pools';
    selectedPoolForRemove = null;
    removeAmount = "";
  }
  
  async function handleAddLiquidity() {
    try {
      // Safe parameter validation (Wasmlanche principle)
      if (!token1Amount || !token2Amount || isNaN(parseFloat(token1Amount)) || isNaN(parseFloat(token2Amount))) {
        console.warn('Invalid liquidity amounts', { token1Amount, token2Amount });
        addLiquidityStatus = {
          success: false,
          message: 'Please enter valid amounts for both tokens'
        };
        setTimeout(() => { addLiquidityStatus = null; }, 3000);
        return;
      }
      
      // Check wallet connection
      if (!$walletState.connected) {
        console.warn('Wallet not connected');
        addLiquidityStatus = {
          success: false,
          message: 'Please connect your wallet first'
        };
        setTimeout(() => { addLiquidityStatus = null; }, 3000);
        return;
      }
      
      processing = true;
      console.log('Adding liquidity for', token1.symbol, 'and', token2.symbol);
      
      // Find the pool ID for this token pair
      const existingPoolIndex = myPools.findIndex(p => 
        p.token1.symbol === token1.symbol && p.token2.symbol === token2.symbol);
      
      let poolId;
      if (existingPoolIndex >= 0) {
        poolId = myPools[existingPoolIndex].id;
      } else {
        // For this demo we'll create a temporary poolId if not found
        poolId = `${token1.symbol.toLowerCase()}-${token2.symbol.toLowerCase()}`;
      }
      
      // Using string values for token amounts to avoid precision issues
      const tokenAmounts = {
        tokenA: token1Amount,
        tokenB: token2Amount
      };
      
      // Provide token addresses to the addLiquidityToPool function
      // Call the dexService addLiquidity function with full parameters
      // This will handle wallet signing and transaction processing
      const result = await dexService.addLiquidityToPool({
        poolId,
        token1: token1,
        token2: token2,
        tokenAmounts,
        slippageTolerance: slippage, // Use the user-selected slippage
        providerAddress: $walletState.address
      });
      
      if (result.success) {
        // Transaction was successful
        console.log('Liquidity addition successful:', result);
        
        // Show success message with transaction details
        addLiquidityStatus = {
          success: true,
          message: `Successfully added ${token1Amount} ${token1.symbol} and ${token2Amount} ${token2.symbol} to the pool`,
          txHash: result.txHash
        };
        
        // Reset input fields
        token1Amount = '';
        token2Amount = '';
        
        // Refresh the pools list
        try {
          await refreshPools();
        } catch (error) {
          console.error('Error refreshing pools after adding liquidity:', error);
        }
      } else {
        // Transaction failed
        addLiquidityStatus = {
          success: false,
          message: result.error || 'Failed to add liquidity'
        };
      }
      
      // Clear status message after a longer delay on success to allow user to see transaction hash
      const clearDelay = result.success ? 6000 : 4000;
      setTimeout(() => { addLiquidityStatus = null; }, clearDelay);
      processing = false;
    } catch (error) {
      console.error('Error adding liquidity:', error);
      processing = false;
      addLiquidityStatus = {
        success: false,
        message: error.message || 'An error occurred while adding liquidity'
      };
      setTimeout(() => { addLiquidityStatus = null; }, 3000);
    }
  }
  
  function removePool(poolId) {
    myPools = myPools.filter(pool => pool.id !== poolId);
  }
  
  // Function to handle creating a new privacy pool
  async function handleCreatePool() {
    poolCreationStatus = { message: '', error: false };
    creatingPool = true;
    
    try {
      // Validate the connected wallet first (Wasmlanche principle: parameter validation)
      if (!$walletState.connected || !$walletState.address) {
        throw new Error('Please connect your wallet first');
      }
      
      // Verify that token symbols are provided (UI validation)
      if (!newToken1.symbol || !newToken2.symbol) {
        throw new Error('Token symbols are required');
      }
      
      // Verify initial liquidity values (UI validation)
      if (!initialLiquidity1 || !initialLiquidity2 || 
          isNaN(parseFloat(initialLiquidity1)) || isNaN(parseFloat(initialLiquidity2))) {
        throw new Error('Valid initial liquidity amounts are required');
      }
      
      // Verify token addresses follow proper format (Wasmlanche principle: param validation)
      if (!newToken1.address.startsWith('0x') || newToken1.address.length !== 42) {
        throw new Error('Invalid Token 1 address format');
      }
      
      if (!newToken2.address.startsWith('0x') || newToken2.address.length !== 42) {
        throw new Error('Invalid Token 2 address format');
      }
      
      // Ensure token decimals are valid (Wasmlanche principle: bounds checking)
      if (newToken1.decimals < 0 || newToken1.decimals > 18 || !Number.isInteger(newToken1.decimals)) {
        throw new Error('Token 1 decimals must be an integer between 0 and 18');
      }
      
      if (newToken2.decimals < 0 || newToken2.decimals > 18 || !Number.isInteger(newToken2.decimals)) {
        throw new Error('Token 2 decimals must be an integer between 0 and 18');
      }
      
      console.log('Creating new privacy pool...');
      
      // Format the request parameters (Wasmlanche principle: safe parameter handling)
      const createPoolParams = {
        token1Address: newToken1.address,
        token2Address: newToken2.address,
        token1Symbol: newToken1.symbol,
        token2Symbol: newToken2.symbol,
        token1Decimals: newToken1.decimals,
        token2Decimals: newToken2.decimals,
        initialLiquidity1: parseFloat(initialLiquidity1),
        initialLiquidity2: parseFloat(initialLiquidity2),
        privacyLevel,
        userAddress: $walletState.address
      };
      
      // Call the privacyPools adapter
      const result = await dexService.createPrivacyPool(createPoolParams);
      
      if (result.success) {
        poolCreationStatus = { 
          message: `Successfully created ${newToken1.symbol}-${newToken2.symbol} privacy pool!`,
          error: false 
        };
        
        // Reset form fields
        newToken1 = { address: '0x4111111111111111111111111111111111111111', symbol: '', decimals: 18 };
        newToken2 = { address: '0x4222222222222222222222222222222222222222', symbol: '', decimals: 6 };
        initialLiquidity1 = '';
        initialLiquidity2 = '';
        
        // Switch to the my-pools tab
        setTimeout(() => {
          selectedTab = 'my-pools';
          poolCreationStatus = { message: '', error: false };
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to create pool');
      }
    } catch (error) {
      console.error('Error creating pool:', error);
      poolCreationStatus = { 
        message: error.message || 'Error creating pool', 
        error: true 
      };
    } finally {
      creatingPool = false;
    }
  }
</script>

<div class="liquidity-panel">
  <div class="liquidity-tabs">
    <button 
      class={selectedTab === 'add' ? 'active' : ''} 
      on:click={() => selectedTab = 'add'}>
      <span class="tab-icon">💧</span>
      <span class="tab-text">Add Liquidity</span>
    </button>
    <button 
      class={selectedTab === 'remove' ? 'active' : ''} 
      on:click={() => selectedTab = 'remove'}>
      <span class="tab-icon">🔄</span>
      <span class="tab-text">Remove Liquidity</span>
    </button>
    <button 
      class={selectedTab === 'my-pools' ? 'active' : ''} 
      on:click={() => selectedTab = 'my-pools'}>
      <span class="tab-icon">🔐</span>
      <span class="tab-text">My Privacy Pools</span>
    </button>
    <button 
      class={selectedTab === 'create' ? 'active' : ''} 
      on:click={() => selectedTab = 'create'}>
      <span class="tab-icon">✨</span>
      <span class="tab-text">Create New Pool</span>
    </button>
  </div>
  
  {#if selectedTab === 'add'}
    <div class="my-pools-container">
      <div class="section-header">
        <h3>Add Liquidity to Privacy Pool</h3>
        <div class="sub-tabs">
          <button 
            class="sub-tab {addLiquiditySubTab === 'browse' ? 'active' : ''}"
            on:click={resetForm}
            aria-label="Browse all pools"
          >
            <span class="sub-tab-icon">🔍</span> Browse Pools
          </button>
          <button 
            class="sub-tab {addLiquiditySubTab === 'add' ? 'active' : ''}"
            on:click={() => token1.symbol && token2.symbol && (addLiquiditySubTab = 'add')}
            disabled={!token1.symbol || !token2.symbol}
            aria-label="Add liquidity form"
          >
            <span class="sub-tab-icon">💧</span> Add Liquidity
          </button>
        </div>
      </div>
      
      {#if addLiquiditySubTab === 'browse'}
        <!-- Pool selection interface -->
        <div class="pools-grid">
          {#each myPools as pool}
            <button 
              class="pool-card clickable"
              on:click={() => handleAddMoreLiquidity(pool)}
              on:keydown={(e) => e.key === 'Enter' && handleAddMoreLiquidity(pool)}
              type="button"
              aria-label="Select {pool.token1.symbol}/{pool.token2.symbol} pool"
            >
              <div class="pool-header">
                <div class="pool-tokens">
                  <div class="token-pair">
                    <div class="token-logo">{pool.token1.logo}</div>
                    <div class="token-logo second">{pool.token2.logo}</div>
                  </div>
                  <div class="token-names">
                    {pool.token1.symbol} / {pool.token2.symbol}
                  </div>
                </div>
                <div class="pool-privacy">
                  <div class="privacy-badge high">
                    <span class="privacy-dot"></span>
                    <span class="privacy-label">High Privacy</span>
                  </div>
                </div>
              </div>
              
              <div class="pool-stats enhanced">
                <div class="stat">
                  <div class="stat-label">Total Liquidity</div>
                  <div class="stat-value">{pool.totalLiquidity}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">APR</div>
                  <div class="stat-value highlight">{pool.apr}</div>
                </div>
              </div>
              
              <div class="pool-action-button primary">Add Liquidity</div>
            </button>
          {/each}
        </div>
      {:else if addLiquiditySubTab === 'add'}
        <!-- Add liquidity form interface -->
        <div class="pool-card add-liquidity-card">
          <div class="pool-header">
            <div class="pool-tokens">
              <div class="token-pair">
                <div class="token-logo shine">{token1.logo}</div>
                <div class="token-logo second shine">{token2.logo}</div>
              </div>
              <div class="token-names">
                {token1.symbol} / {token2.symbol}
              </div>
            </div>
            <div class="pool-privacy">
              <div class="privacy-badge high">
                <span class="privacy-dot"></span>
                <span class="privacy-label">High Privacy</span>
              </div>
            </div>
          </div>
        
          <div class="token-inputs card-section">
          <div class="token-input-container">
            <div class="input-label">
              <span>First Token Amount</span>
              <button class="max-button" on:click={() => token1Amount = token1BalanceDisplay}>MAX</button>
            </div>
            <div class="token-input-wrapper">
              <input 
                type="number" 
                placeholder="0.0" 
                bind:value={token1Amount}
                on:input={updateToken2Amount} 
                class="token-amount-input"
              />
              <button class="token-selector enhanced">
                <span class="token-logo">{token1.logo}</span>
                <span class="token-symbol">{token1.symbol}</span>
                <span class="selector-arrow">▼</span>
              </button>
            </div>
            <div class="token-balance">Balance: <span class="highlight-balance">{token1BalanceDisplay}</span> {token1.symbol}</div>
          </div>
          
          <div class="plus-icon enhanced">+</div>
          
          <div class="token-input-container">
            <div class="input-label">
              <span>Second Token Amount</span>
              <button class="max-button" on:click={() => token2Amount = token2BalanceDisplay}>MAX</button>
            </div>
            <div class="token-input-wrapper">
              <input 
                type="number" 
                placeholder="0.0" 
                bind:value={token2Amount}
                on:input={updateToken1Amount}
                class="token-amount-input"
              />
              <button class="token-selector enhanced">
                <span class="token-logo">{token2.logo}</span>
                <span class="token-symbol">{token2.symbol}</span>
                <span class="selector-arrow">▼</span>
              </button>
            </div>
            <div class="token-balance">Balance: <span class="highlight-balance">{token2BalanceDisplay}</span> {token2.symbol}</div>
          </div>
          
          <div class="exchange-rate-display">
            <div class="rate-arrow">↔</div>
            <div class="rate-text">1 {token1.symbol} = 1950 {token2.symbol}</div>
          </div>
        </div>
        
        <div class="pool-stats enhanced">
          <div class="stat">
            <div class="stat-label">Pool Share</div>
            <div class="stat-value">~2.5%</div>
          </div>
          <div class="stat">
            <div class="stat-label">Est. APR</div>
            <div class="stat-value highlight">8.2% - 12.5%</div>
          </div>
          <div class="stat">
            <div class="stat-label">LP Token</div>
            <div class="stat-value"><span class="privacy-dot high"></span> EERC20-LP</div>
          </div>
        </div>
        
        <div class="card-section slippage-section">
          <div class="input-label">Slippage Tolerance</div>
          <div class="slippage-selector enhanced">
            <button class={slippage === 0.1 ? 'active' : ''} on:click={() => slippage = 0.1}>0.1%</button>
            <button class={slippage === 0.5 ? 'active' : ''} on:click={() => slippage = 0.5}>0.5%</button>
            <button class={slippage === 1.0 ? 'active' : ''} on:click={() => slippage = 1.0}>1.0%</button>
            <button>Custom</button>
          </div>
        </div>
        
        <div class="pool-actions">
          <button 
            class="pool-action-button primary animated" 
            on:click={handleAddLiquidity} 
            disabled={processing || (!token1Amount || !token2Amount)}
          >
            {#if processing}
              <div class="loading-spinner"></div>
              Processing...
            {:else}
              Add Liquidity
            {/if}
          </button>
        </div>
        
        {#if addLiquidityStatus}
          <div class="status-message {addLiquidityStatus.success ? 'success' : 'error'}">
            {addLiquidityStatus.message}
            {#if addLiquidityStatus.success && addLiquidityStatus.txHash}
              <div class="tx-hash">
                Transaction: <span class="hash">{addLiquidityStatus.txHash.substring(0, 10)}...{addLiquidityStatus.txHash.substring(addLiquidityStatus.txHash.length - 8)}</span>
              </div>
            {/if}
          </div>
        {/if}
        </div>
      {/if}
    </div>
  {:else if selectedTab === 'my-pools'}
    <div class="my-pools-container">
      <div class="section-header">
        <h3>My Privacy Pools</h3>
        <div class="privacy-indicator">
          <span class="privacy-stats">🔐 {myPools.length} Active Pools</span>
        </div>
      </div>
      
      {#if myPools.length === 0}
        <div class="empty-message">
          <div class="empty-icon">😕</div>
          <p>You don't have any privacy pools yet</p>
          <p class="empty-subtitle">Create your first pool to start providing liquidity with privacy</p>
          <button class="start-button" on:click={() => selectedTab = 'create'}>Create Your First Pool</button>
        </div>
      {:else}
        <div class="pools-list">
          {#each myPools as pool}
            <div class="pool-card">
              <div class="pool-header">
                <div class="pool-tokens">
                  <div class="token-pair">
                    <div class="token-logo">{pool.token1.logo}</div>
                    <div class="token-logo second">{pool.token2.logo}</div>
                  </div>
                  <div class="token-names">
                    {pool.token1.symbol} / {pool.token2.symbol}
                  </div>
                </div>
                <div class="pool-privacy">
                  {#if pool.privacyLevel === 3}
                    <div class="privacy-badge high">
                      <span class="privacy-dot"></span>
                      High Privacy
                    </div>
                  {:else if pool.privacyLevel === 2}
                    <div class="privacy-badge medium">
                      <span class="privacy-dot"></span>
                      Medium Privacy
                    </div>
                  {:else}
                    <div class="privacy-badge low">
                      <span class="privacy-dot"></span>
                      Low Privacy
                    </div>
                  {/if}
                </div>
              </div>
              
              <div class="pool-stats enhanced">
                <div class="stat">
                  <div class="stat-label">My Liquidity</div>
                  <div class="stat-value">{pool.myLiquidity}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Total Liquidity</div>
                  <div class="stat-value">{pool.totalLiquidity}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">APR</div>
                  <div class="stat-value highlight">{pool.apr}</div>
                </div>
              </div>
              
              <div class="pool-actions">
                <button class="pool-action-button primary" on:click={() => handleAddMoreLiquidity(pool)}>Add More</button>
                <button class="pool-action-button" on:click={() => showRemoveLiquidity(pool)}>Remove</button>
                <button class="pool-action-button danger">Exit</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else if selectedTab === 'remove' && selectedPoolForRemove}
    <div class="my-pools-container">
      <div class="section-header">
        <h3>Remove Liquidity from Privacy Pool</h3>
        <div class="privacy-indicator">
          <span class="privacy-stats">🔐 Remove from {selectedPoolForRemove.token1.symbol}/{selectedPoolForRemove.token2.symbol}</span>
        </div>
      </div>
      
      <div class="pool-card remove-liquidity-card">
        <div class="pool-header">
          <div class="pool-tokens">
            <div class="token-pair">
              <div class="token-logo shine">{selectedPoolForRemove.token1.logo}</div>
              <div class="token-logo second shine">{selectedPoolForRemove.token2.logo}</div>
            </div>
            <div class="token-names">
              {selectedPoolForRemove.token1.symbol} / {selectedPoolForRemove.token2.symbol}
            </div>
          </div>
          <div class="pool-privacy">
            <div class="privacy-badge {selectedPoolForRemove.privacyLevel === 3 ? 'high' : selectedPoolForRemove.privacyLevel === 2 ? 'medium' : 'low'}">
              <span class="privacy-dot"></span>
              <span class="privacy-label">{selectedPoolForRemove.privacyLevel === 3 ? 'High' : selectedPoolForRemove.privacyLevel === 2 ? 'Medium' : 'Low'} Privacy</span>
            </div>
          </div>
        </div>
        
        <div class="token-inputs card-section">
          <div class="token-input-container">
              <div class="input-label">
                <span>LP Tokens to Remove</span>
                <button class="max-button" on:click={() => removeAmount = selectedPoolForRemove.myLiquidity}>MAX</button>
              </div>
            <div class="token-input-wrapper">
              <input 
                type="number" 
                placeholder="0.0" 
                bind:value={removeAmount}
                class="token-amount-input"
              />
              <button class="token-selector enhanced">
                <span class="token-logo">🔒</span>
                <span class="token-symbol">EERC20-LP</span>
                <span class="selector-arrow">▼</span>
              </button>
            </div>
            <div class="token-balance">Balance: <span class="highlight-balance">{selectedPoolForRemove.myLiquidity}</span> LP Tokens</div>
          </div>
        </div>
        
        <div class="card-section expected-returns-section">
          <div class="input-label">Expected Return</div>
          <div class="token-pair-returns">
            <div class="token-return">
              <span class="token-logo">{selectedPoolForRemove.token1.logo}</span>
              <span>{parseFloat(removeAmount || 0) * 0.45 > 0 ? (parseFloat(removeAmount) * 0.45).toFixed(6) : '0.00'} {selectedPoolForRemove.token1.symbol}</span>
            </div>
            <div class="token-return">
              <span class="token-logo">{selectedPoolForRemove.token2.logo}</span>
              <span>{parseFloat(removeAmount || 0) * 1.2 > 0 ? (parseFloat(removeAmount) * 1.2).toFixed(6) : '0.00'} {selectedPoolForRemove.token2.symbol}</span>
            </div>
          </div>
        </div>
        
        <div class="pool-stats enhanced">
          <div class="stat">
            <div class="stat-label">Current Share</div>
            <div class="stat-value">~1.5%</div>
          </div>
          <div class="stat">
            <div class="stat-label">Share After</div>
            <div class="stat-value">~{parseFloat(removeAmount || 0) > 0 ? (1.5 - (parseFloat(removeAmount) / 100)).toFixed(1) : 1.5}%</div>
          </div>
          <div class="stat">
            <div class="stat-label">LP Token</div>
            <div class="stat-value highlight">EERC20-LP</div>
          </div>
        </div>
        
        <div class="card-section slippage-section">
          <div class="input-label">Slippage Tolerance</div>
          <div class="slippage-selector enhanced">
            <button class={slippage === 0.1 ? 'active' : ''} on:click={() => slippage = 0.1}>0.1%</button>
            <button class={slippage === 0.5 ? 'active' : ''} on:click={() => slippage = 0.5}>0.5%</button>
            <button class={slippage === 1.0 ? 'active' : ''} on:click={() => slippage = 1.0}>1.0%</button>
            <button>Custom</button>
          </div>
        </div>

        {#if removeStatus}
          <div class="status-message {removeStatus.success ? 'success' : 'error'}">
            {removeStatus.message}
            {#if removeStatus.success && removeStatus.txHash}
              <div class="tx-hash">
                Transaction: <span class="hash">{removeStatus.txHash.substring(0, 10)}...{removeStatus.txHash.substring(removeStatus.txHash.length - 8)}</span>
              </div>
            {/if}
          </div>
        {/if}
        
        <div class="pool-actions">
          <button 
            class="pool-action-button primary animated" 
            on:click={handleRemoveLiquidity}
            disabled={processing || !removeAmount || parseFloat(removeAmount) <= 0}
          >
            {#if processing}
              <div class="loading-spinner"></div>
              Processing...
            {:else}
              Remove Liquidity
            {/if}
          </button>
          <button class="secondary-button" on:click={() => selectedTab = 'my-pools'}>Back to Pools</button>
        </div>
      </div>
    </div>
  {:else if selectedTab === 'remove' && !selectedPoolForRemove}
    <div class="empty-remove-container">
      <div class="empty-message">
        <div class="empty-icon">😕</div>
        <p>Please select a pool to remove liquidity from</p>
        <button class="start-button" on:click={() => selectedTab = 'my-pools'}>View My Pools</button>
      </div>
    </div>
  {:else if selectedTab === 'create'}
    <div class="my-pools-container">
      <div class="section-header">
        <h3>Create New Privacy Pool</h3>
        <div class="privacy-indicator">
          <span class="privacy-stats">🔐 New Token Pair</span>
        </div>
      </div>
      
      <div class="pool-card create-pool-card">
        <div class="pool-header">
          <div class="pool-tokens">
            <div class="token-pair">
              <div class="token-logo new-token">{newToken1.symbol ? newToken1.symbol.charAt(0) : '?'}</div>
              <div class="token-logo second new-token">{newToken2.symbol ? newToken2.symbol.charAt(0) : '?'}</div>
            </div>
            <div class="token-names">
              {newToken1.symbol || 'Token 1'} / {newToken2.symbol || 'Token 2'}
            </div>
          </div>
          <div class="pool-privacy">
            <div class="privacy-badge {privacyLevel === 3 ? 'high' : privacyLevel === 2 ? 'medium' : 'low'}">
              <span class="privacy-dot"></span>
              {privacyLevel === 3 ? 'High' : privacyLevel === 2 ? 'Medium' : 'Low'} Privacy
            </div>
          </div>
        </div>
        
        <!-- Token pair selection -->
        <div class="card-section token-selection-section">
          <div class="input-label">Token Pair</div>
          <div class="token-selection">
            <div class="token-select-container">
              <label for="token1-symbol">First Token Symbol</label>
              <input
                type="text" 
                id="token1-symbol" 
                placeholder="E.g., EERC20-AVAX" 
                bind:value={newToken1.symbol}
                maxlength="10"
                class="token-address-input"
              />
            </div>
            
            <div class="token-select-container">
              <label for="token1-address">First Token Address</label>
              <input
                type="text" 
                id="token1-address" 
                placeholder="0x..." 
                bind:value={newToken1.address}
                maxlength="42"
                class="token-address-input"
              />
            </div>
            
            <div class="token-select-container">
              <label for="token2-symbol">Second Token Symbol</label>
              <input
                type="text" 
                id="token2-symbol" 
                placeholder="E.g., EERC20-USDC" 
                bind:value={newToken2.symbol}
                maxlength="10"
                class="token-address-input"
              />
            </div>
            
            <div class="token-select-container">
              <label for="token2-address">Second Token Address</label>
              <input
                type="text" 
                id="token2-address" 
                placeholder="0x..." 
                bind:value={newToken2.address}
                maxlength="42"
                class="token-address-input"
              />
            </div>
          </div>
        </div>
        
        <!-- Initial liquidity input -->
        <div class="card-section">
          <div class="input-label">Initial Liquidity</div>
          <div class="token-inputs">
            <div class="token-input-container">
              <div class="input-label">{newToken1.symbol || 'Token 1'} Amount</div>
              <div class="token-input-wrapper">
                <input 
                  type="number" 
                  placeholder="0.0" 
                  bind:value={initialLiquidity1}
                  class="token-amount-input"
                  min="0.000001"
                  step="0.000001"
                />
                <span class="token-symbol-badge">{newToken1.symbol || 'Token 1'}</span>
              </div>
            </div>
            
            <div class="token-input-container">
              <div class="input-label">{newToken2.symbol || 'Token 2'} Amount</div>
              <div class="token-input-wrapper">
                <input 
                  type="number" 
                  placeholder="0.0" 
                  bind:value={initialLiquidity2}
                  class="token-amount-input"
                  min="0.000001"
                  step="0.000001"
                />
                <span class="token-symbol-badge">{newToken2.symbol || 'Token 2'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card-section privacy-section">
          <div class="input-label">Privacy Level</div>
          <div class="privacy-level-selector" id="privacy-level-selector" role="radiogroup" aria-labelledby="privacy-level-label">
            <button
              class={privacyLevel === 1 ? 'active' : ''}
              on:click={() => privacyLevel = 1}
              aria-checked={privacyLevel === 1}
              role="radio"
            >
              <span class="privacy-dot low"></span> Low
            </button>
            <button
              class={privacyLevel === 2 ? 'active' : ''}
              on:click={() => privacyLevel = 2}
              aria-checked={privacyLevel === 2}
              role="radio"
            >
              <span class="privacy-dot medium"></span> Medium
            </button>
            <button
              class={privacyLevel === 3 ? 'active' : ''}
              on:click={() => privacyLevel = 3}
              aria-checked={privacyLevel === 3}
              role="radio"
            >
              <span class="privacy-dot high"></span> High
            </button>
          </div>
        </div>
        
        <div class="privacy-description card-section">
          {#if privacyLevel === 3}
            <strong>High Privacy:</strong> Maximum anonymity with largest anonymity set. 
            Uses advanced zero-knowledge proofs for complete privacy of all transactions.
            Best for sensitive trading activities.
          {:else if privacyLevel === 2}
            <strong>Medium Privacy:</strong> Good balance of privacy and performance.
            Partial zero-knowledge implementation with good anonymity set size.
            Suitable for most privacy-conscious users.
          {:else}
            <strong>Low Privacy:</strong> Basic privacy features with smaller anonymity set.
            Faster transactions with lower gas costs.
            Good for less sensitive trading activities.
          {/if}
        </div>
        
        <div class="pool-actions">
          <button 
            class="pool-action-button primary wide" 
            on:click={handleCreatePool}
            disabled={creatingPool || !newToken1.address || !newToken2.address || !initialLiquidity1 || !initialLiquidity2}
          >
            {#if creatingPool}
              <div class="loading-spinner"></div>
              Creating Pool...
            {:else}
              Create Privacy Pool
            {/if}
          </button>
        </div>
        
        {#if poolCreationStatus.message}
          <div class="status-message {poolCreationStatus.success ? 'success' : 'error'}">
            {poolCreationStatus.message}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .liquidity-panel {
    display: flex;
    flex-direction: column;
  }
  
  .sub-tabs {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  
  .sub-tab {
    background: rgba(20, 20, 20, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    padding: 0.35rem 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  .sub-tab.active {
    background: rgba(232, 65, 66, 0.15);
    border-color: rgba(232, 65, 66, 0.4);
    color: #fff;
  }
  
  .sub-tab:hover:not(:disabled) {
    background: rgba(232, 65, 66, 0.1);
    border-color: rgba(232, 65, 66, 0.3);
  }
  
  .sub-tab:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .sub-tab-icon {
    font-size: 0.9rem;
  }
  
  .pools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .clickable {
    cursor: pointer;
    transition: all 0.2s ease;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    text-align: left;
    padding: 0;
    width: 100%;
  }
  
  .clickable:hover {
    transform: translateY(-2px);
    border-color: rgba(232, 65, 66, 0.4);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
  
  .clickable:focus {
    outline: 2px solid #e84142;
    outline-offset: 2px;
  }
  
  /* Sub-tab styles replace the need for back button */
  
  /* This secondary-button style replaces the old action-button styles */
  .liquidity-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 28px;
    overflow: auto;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 100%);
    padding: 12px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
  
  .liquidity-tabs button {
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
    flex: 1;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  
  .tab-icon {
    font-size: 16px;
  }
  
  .tab-text {
    position: relative;
  }
  
  .secondary-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 48px;
    margin-top: 16px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    font-weight: 500;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .secondary-button:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  
  .liquidity-tabs button:hover {
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    color: rgba(255, 255, 255, 0.9);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .liquidity-tabs button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .liquidity-tabs button:hover::before {
    opacity: 1;
  }
  
  .liquidity-tabs button.active {
    background: linear-gradient(135deg, rgba(232, 65, 66, 0.15), rgba(232, 65, 66, 0.05));
    color: white;
    border-color: rgba(232, 65, 66, 0.3);
    box-shadow: 0 4px 10px rgba(232, 65, 66, 0.15);
  }
  
  .liquidity-tabs button.active .tab-text::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(to right, transparent, rgba(232, 65, 66, 0.7), transparent);
    animation: pulse 2s infinite;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .section-header h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
  }
  
  .privacy-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    padding: 0.4rem 0.8rem;
    border-radius: 1rem;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.05);
    font-weight: 500;
  }
  
  .privacy-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }
  
  .privacy-badge:hover {
    transform: translateY(-1px);
    filter: brightness(1.1);
  }
  
  .privacy-badge.high {
    background: rgba(39, 174, 96, 0.15);
    color: #27AE60;
    border-color: rgba(39, 174, 96, 0.3);
  }
  
  .privacy-badge.medium {
    background: rgba(242, 201, 76, 0.15);
    color: #F2C94C;
    border-color: rgba(242, 201, 76, 0.3);
  }
  
  .privacy-badge.low {
    background: rgba(232, 65, 66, 0.15);
    color: #E84142;
    border-color: rgba(232, 65, 66, 0.3);
  }
  
  .privacy-dot {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    box-shadow: 0 0 5px currentColor;
    position: relative;
    margin-right: 0.2rem;
  }
  
  .privacy-dot::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 50%;
    opacity: 0.5;
    background: radial-gradient(circle, currentColor 0%, transparent 70%);
    animation: pulse 2s infinite;
  }
  
  .privacy-dot.high {
    background-color: #4caf50;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
  }
  
  .privacy-dot.medium {
    background-color: #ff9800;
    box-shadow: 0 0 8px rgba(255, 152, 0, 0.6);
  }
  
  .privacy-dot.low {
    background-color: #f44336;
    box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
  }
  

  
  .token-inputs {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  :global(.pool-tokens) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.75rem;
    display: inline-flex;
  }
  
  :global(.token-symbols) {
    font-weight: 500;
    margin-left: 0.25rem;
  }
  
  /* Remove panel specific styles */

  
  .token-pair-returns {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  
  .token-return {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(to right, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.04));
    padding: 0.85rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
  }
  
  .token-return:hover {
    background: linear-gradient(to right, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.06));
    transform: translateY(-1px);
  }

  .card-section {
    padding: 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
  }
  
  .card-section::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
  }

  .slippage-section {
    padding: 1rem;
  }

  .add-liquidity-card .token-inputs,
  .remove-liquidity-card .token-inputs,
  .create-pool-card .token-inputs {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  .expected-returns-section,
  .token-selection-section,
  .privacy-section {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
  }
  
  .token-symbol-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
  }
  
  /* Enhanced elements for Add Liquidity */
  .enhanced {
    position: relative;
    transition: all 0.2s ease;
  }
  
  .token-selector.enhanced {
    background: linear-gradient(135deg, rgba(232, 65, 66, 0.15) 0%, rgba(232, 65, 66, 0.05) 100%);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-left: 1px solid rgba(232, 65, 66, 0.2);
    position: relative;
    overflow: hidden;
    min-width: 130px;
  }
  
  .token-selector.enhanced:hover {
    background: linear-gradient(135deg, rgba(232, 65, 66, 0.2) 0%, rgba(232, 65, 66, 0.1) 100%);
    border-left: 1px solid rgba(232, 65, 66, 0.3);
    transform: translateY(-1px);
  }
  
  .plus-icon.enhanced {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    margin: 1rem auto;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    font-size: 1.2rem;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .slippage-selector.enhanced {
    display: flex;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.25rem;
    border-radius: 0.5rem;
  }
  
  .slippage-selector.enhanced button {
    flex: 1;
    border-radius: 0.35rem;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.07);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  
  .slippage-selector.enhanced button::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .slippage-selector.enhanced button:hover::after {
    opacity: 1;
  }
  
  .pool-stats.enhanced {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  }
  
  .token-selector {
    background: linear-gradient(to right, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.25));
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1rem;
    color: white;
    cursor: pointer;
    transition: all 0.25s ease;
    min-width: 130px;
    justify-content: center;
  }
  
  .token-input-wrapper {
    display: flex;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.2));
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    transition: all 0.2s ease;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    margin: 0.25rem 0;
  }
  
  .token-input-wrapper:focus-within {
    border-color: rgba(232, 65, 66, 0.4);
    box-shadow: 0 0 0 2px rgba(232, 65, 66, 0.1);
  }
  
  .max-button {
    background: linear-gradient(to right, rgba(232, 65, 66, 0.2), rgba(232, 65, 66, 0.25));
    color: white;
    border: none;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(232, 65, 66, 0.3);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .max-button:hover {
    background: linear-gradient(to right, rgba(232, 65, 66, 0.3), rgba(232, 65, 66, 0.35));
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  }
  
  .input-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    letter-spacing: 0.3px;
  }
  
  .token-balance {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.4rem;
    letter-spacing: 0.3px;
    padding-left: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .token-balance::before {
    content: '💰';
    font-size: 0.8rem;
    opacity: 0.7;
  }
  
  .highlight-balance {
    color: #e84142;
    font-weight: 600;
    position: relative;
    padding: 0 2px;
  }
  
  .highlight-balance::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(232, 65, 66, 0.5), transparent);
  }
  
  .exchange-rate-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .rate-arrow {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .privacy-label {
    margin-left: 0.25rem;
  }
  
  .shine {
    position: relative;
    overflow: hidden;
  }
  
  .shine::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%);
    transform: rotate(30deg);
    animation: shine 4s infinite;
  }
  
  @keyframes shine {
    0% { transform: translateX(-100%) rotate(30deg); }
    20%, 100% { transform: translateX(100%) rotate(30deg); }
  }
  
  .pool-action-button.animated {
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
  
  .pool-action-button.animated::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: all 0.6s;
    z-index: -1;
  }
  
  .pool-action-button.animated:hover::before {
    left: 100%;
  }
  
  .token-selection {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
  }
  
  .token-select-container {
    margin-bottom: 1rem;
  }
  
  .token-select-container label {
    display: block;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }
  
  .token-address-input {
    width: 100%;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    color: white;
    font-size: 0.9rem;
  }
  
  .new-token {
    background: linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%);
    color: white;
    font-weight: bold;
  }
  
  .wide {
    width: 100%;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  

  
  .start-button {
    background: linear-gradient(135deg, #e84142 0%, #b91a1b 100%);
    color: white;
    border: none;
    border-radius: 0.75rem;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .start-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(232, 65, 66, 0.4);
  }
  
  .pools-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .pool-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.04) 100%);
    border-radius: 0.75rem;
    padding: 1.25rem;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
  
  .pool-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.15);
  }
  
  .pool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: -1.25rem -1.25rem 1.25rem -1.25rem;
    padding: 1.5rem;
    background: linear-gradient(to right, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem 0.75rem 0 0;
  }
  
  .pool-tokens {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .token-pair {
    display: flex;
    align-items: center;
  }
  
  .token-pair .token-logo {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-radius: 50%;
    font-size: 0.9rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    position: relative;
    z-index: 2;
  }
  
  .token-pair .token-logo.second {
    margin-left: -8px;
  }
  
  .token-names {
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .pool-stats {
    display: flex;
    justify-content: space-between;
    gap: 1.25rem;
    padding: 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    margin: 0.5rem -1.25rem 1.25rem -1.25rem;
    background: rgba(0, 0, 0, 0.1);
  }
  
  .pool-stats.enhanced {
    background: linear-gradient(to right, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.15));
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  .stat-value {
    font-weight: 600;
    font-size: 0.95rem;
  }
  
  .stat-value.highlight {
    color: #27AE60;
  }
  
  .pool-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .token-amount-input {
    flex: 1;
    background: transparent;
    border: none;
    color: white;
    font-size: 1.1rem;
    padding: 14px 16px;
    outline: none;
    transition: all 0.2s ease;
    font-weight: 500;
    -webkit-appearance: none;
    -moz-appearance: textfield;
    appearance: none;
  }
  
  .token-amount-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  
  .token-amount-input:focus {
    color: rgba(255, 255, 255, 0.95);
  }
  
  /* Remove browser spinner buttons */
  .token-amount-input::-webkit-outer-spin-button,
  .token-amount-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  .pool-action-button {
    flex: 1;
    padding: 0.7rem 0;
    border-radius: 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.9);
    position: relative;
    overflow: hidden;
  }
  
  .pool-action-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: all 0.6s ease;
  }
  
  .pool-action-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .pool-action-button.primary {
    background: linear-gradient(135deg, #e84142 0%, #b91a1b 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(232, 65, 66, 0.3);
  }
  
  .pool-action-button.primary.animated:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(232, 65, 66, 0.4);
  }
  
  .pool-action-button.primary:disabled {
    background: linear-gradient(135deg, #9e9e9e 0%, #616161 100%);
    color: rgba(255, 255, 255, 0.6);
    cursor: not-allowed;
    box-shadow: none;
  }
  
  .pool-action-button.danger {
    background: rgba(239, 68, 68, 0.1);
    color: #EF4444;
  }
  
  .pool-action-button.danger:hover {
    background: rgba(239, 68, 68, 0.2);
  }
  
  /* Light theme styles */
  :global(.light-theme) {
    background: #f5f5f5;
    color: #333;
  }
  
  /* Force all inputs to have transparent background on all browsers */
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active {
    transition: background-color 5000s ease-in-out 0s;
    -webkit-text-fill-color: white !important;
  }
  
  :global(.light-theme) .token-input-container {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .token-selector {
    background: rgba(0, 0, 0, 0.1);
  }
  
  :global(.light-theme) .token-selector:hover {
    background: linear-gradient(to right, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.3));
  }
  
  /* Light theme styles for liquidity interface */
  :global(.light-theme) .token-balance .highlight-balance {
    color: #2563eb;
  }
  
  :global(.light-theme) .slippage-selector button {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.7);
  }
  
  :global(.light-theme) .pool-card,
  :global(.light-theme) .privacy-description {
    /* Light theme styles for pool creation */
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .token-pair .token-logo {
    background: rgba(0, 0, 0, 0.1);
  }
  
  :global(.light-theme) .pool-stats {
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .pool-action-button:hover {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.9);
  }
</style>
