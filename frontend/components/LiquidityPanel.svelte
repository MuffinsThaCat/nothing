<script>
  import { onMount } from 'svelte';
  
  let selectedTab = 'add';
  let token1Amount = '';
  let token2Amount = '';
  let token1 = { symbol: 'EERC20-AVAX', logo: '🔒' };
  let token2 = { symbol: 'EERC20-USDC', logo: '🔒' };
  let slippage = 0.5;
  let processing = false;
  
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
  
  function handleAddLiquidity() {
    processing = true;
    // Mock liquidity addition process
    setTimeout(() => {
      // Add the new pool or update existing
      const existingPoolIndex = myPools.findIndex(p => 
        p.token1.symbol === token1.symbol && p.token2.symbol === token2.symbol);
      
      if (existingPoolIndex >= 0) {
        // Update existing pool
        myPools[existingPoolIndex].myLiquidity = '$' + (
          parseFloat(myPools[existingPoolIndex].myLiquidity.replace('$', '')) + 
          parseFloat(token1Amount) * 100
        ).toFixed(2);
        myPools = [...myPools]; // Trigger reactivity
      } else {
        // Add new pool
        myPools = [
          ...myPools,
          {
            id: 'pool-' + (myPools.length + 1),
            token1: token1,
            token2: token2,
            myLiquidity: '$' + (parseFloat(token1Amount) * 100).toFixed(2),
            totalLiquidity: '$' + (parseFloat(token1Amount) * 1000).toFixed(2),
            apr: (Math.random() * 10 + 5).toFixed(1) + '%',
            privacyLevel: 3
          }
        ];
      }
      
      // Reset form
      token1Amount = '';
      token2Amount = '';
      processing = false;
    }, 2000);
  }
  
  function removePool(poolId) {
    myPools = myPools.filter(pool => pool.id !== poolId);
  }
</script>

<div class="liquidity-panel">
  <div class="liquidity-tabs">
    <button 
      class={selectedTab === 'add' ? 'active' : ''} 
      on:click={() => selectedTab = 'add'}>
      Add Liquidity
    </button>
    <button 
      class={selectedTab === 'my-pools' ? 'active' : ''} 
      on:click={() => selectedTab = 'my-pools'}>
      My Privacy Pools
    </button>
    <button 
      class={selectedTab === 'create' ? 'active' : ''} 
      on:click={() => selectedTab = 'create'}>
      Create New Pool
    </button>
  </div>
  
  {#if selectedTab === 'add'}
    <div class="add-liquidity-container">
      <div class="section-header">
        <h3>Add Liquidity to Privacy Pool</h3>
        <div class="privacy-indicator">
          <span class="privacy-dot high"></span>
          High Privacy
        </div>
      </div>
      
      <div class="token-inputs">
        <div class="token-input-container">
          <div class="input-label">First Token</div>
          <div class="token-input-wrapper">
            <input 
              type="number" 
              placeholder="0.0" 
              bind:value={token1Amount}
              on:input={updateToken2Amount} 
              class="token-amount-input"
            />
            <button class="token-selector">
              <span class="token-logo">{token1.logo}</span>
              <span class="token-symbol">{token1.symbol}</span>
              <span class="selector-arrow">▼</span>
            </button>
          </div>
          <div class="token-balance">Balance: 0.25 {token1.symbol}</div>
        </div>
        
        <div class="plus-icon">+</div>
        
        <div class="token-input-container">
          <div class="input-label">Second Token</div>
          <div class="token-input-wrapper">
            <input 
              type="number" 
              placeholder="0.0" 
              bind:value={token2Amount}
              on:input={updateToken1Amount}
              class="token-amount-input"
            />
            <button class="token-selector">
              <span class="token-logo">{token2.logo}</span>
              <span class="token-symbol">{token2.symbol}</span>
              <span class="selector-arrow">▼</span>
            </button>
          </div>
          <div class="token-balance">Balance: 100.50 {token2.symbol}</div>
        </div>
      </div>
      
      <div class="liquidity-details">
        <div class="detail-row">
          <span class="detail-label">Exchange Rate</span>
          <span class="detail-value">1 {token1.symbol} = 1950 {token2.symbol}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Pool Share</span>
          <span class="detail-value">~2.5%</span>
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
          <span class="detail-label">LP Token</span>
          <span class="detail-value privacy-high">
            <span class="privacy-dot"></span>
            EERC20-LP
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Estimated APR</span>
          <span class="detail-value">8.2% - 12.5%</span>
        </div>
      </div>
      
      <button 
        class="add-liquidity-button" 
        disabled={!token1Amount || !token2Amount || processing}
        on:click={handleAddLiquidity}
      >
        {#if processing}
          <div class="spinner"></div>
          Processing...
        {:else}
          Add Liquidity
        {/if}
      </button>
    </div>
  {:else if selectedTab === 'my-pools'}
    <div class="my-pools-container">
      <div class="section-header">
        <h3>My Privacy Liquidity Pools</h3>
        <div class="pool-count">{myPools.length} Active Pools</div>
      </div>
      
      {#if myPools.length === 0}
        <div class="empty-pools">
          <div class="empty-icon">🏊‍♂️</div>
          <div class="empty-text">You don't have any liquidity positions yet</div>
          <button class="start-button" on:click={() => selectedTab = 'add'}>Add Liquidity</button>
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
              
              <div class="pool-stats">
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
                <button class="pool-action-button primary">Add More</button>
                <button class="pool-action-button">Remove</button>
                <button class="pool-action-button danger" on:click={() => removePool(pool.id)}>Exit</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else if selectedTab === 'create'}
    <div class="create-pool-container">
      <div class="section-header">
        <h3>Create New Privacy Pool</h3>
      </div>
      
      <div class="coming-soon">
        <div class="coming-soon-icon">🔜</div>
        <div class="coming-soon-title">Coming Soon</div>
        <div class="coming-soon-text">This feature will be available in the next release.</div>
      </div>
    </div>
  {/if}
</div>

<style>
  .liquidity-panel {
    display: flex;
    flex-direction: column;
  }
  
  .liquidity-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .liquidity-tabs button {
    background: transparent;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .liquidity-tabs button:hover {
    color: white;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .liquidity-tabs button.active {
    background: rgba(232, 65, 66, 0.1);
    color: #E84142;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .section-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .privacy-indicator, .privacy-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.6rem;
    border-radius: 1rem;
  }
  
  .privacy-indicator, .privacy-badge.high {
    background: rgba(39, 174, 96, 0.1);
    color: #27AE60;
  }
  
  .privacy-badge.medium {
    background: rgba(242, 201, 76, 0.1);
    color: #F2C94C;
  }
  
  .privacy-badge.low {
    background: rgba(232, 65, 66, 0.1);
    color: #E84142;
  }
  
  .privacy-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  
  .privacy-indicator .privacy-dot, .privacy-badge.high .privacy-dot {
    background: #27AE60;
  }
  
  .privacy-badge.medium .privacy-dot {
    background: #F2C94C;
  }
  
  .privacy-badge.low .privacy-dot {
    background: #E84142;
  }
  
  .token-inputs {
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .token-input-container {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1rem;
    padding: 1rem;
  }
  
  .plus-icon {
    margin: 0 1rem;
    font-size: 1.5rem;
    font-weight: 300;
    opacity: 0.7;
  }
  
  .input-label {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    opacity: 0.7;
  }
  
  .token-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .token-amount-input {
    flex-grow: 1;
    background: transparent;
    border: none;
    font-size: 1.25rem;
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
    font-size: 1.1rem;
  }
  
  .token-symbol {
    font-weight: 600;
    font-size: 0.9rem;
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
  
  .liquidity-details {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
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
  
  .privacy-high .privacy-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #27AE60;
  }
  
  .add-liquidity-button {
    background: linear-gradient(135deg, #e84142 0%, #b91a1b 100%);
    color: white;
    border: none;
    border-radius: 0.75rem;
    padding: 1rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .add-liquidity-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(232, 65, 66, 0.4);
  }
  
  .add-liquidity-button:disabled {
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
  
  /* My Pools styles */
  .pool-count {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .empty-pools {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1rem;
  }
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .empty-text {
    margin-bottom: 1.5rem;
    opacity: 0.7;
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
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1rem;
    padding: 1.25rem;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .pool-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    border-color: rgba(232, 65, 66, 0.2);
  }
  
  .pool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
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
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    font-size: 0.9rem;
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
    gap: 1rem;
    padding: 1rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: 1rem;
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
  
  .pool-action-button {
    flex: 1;
    padding: 0.6rem 0;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }
  
  .pool-action-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .pool-action-button.primary {
    background: rgba(232, 65, 66, 0.1);
    color: #E84142;
  }
  
  .pool-action-button.primary:hover {
    background: rgba(232, 65, 66, 0.2);
  }
  
  .pool-action-button.danger {
    background: rgba(239, 68, 68, 0.1);
    color: #EF4444;
  }
  
  .pool-action-button.danger:hover {
    background: rgba(239, 68, 68, 0.2);
  }
  
  /* Coming Soon styles */
  .coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1rem;
  }
  
  .coming-soon-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .coming-soon-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #E84142 0%, #FF9B9B 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .coming-soon-text {
    opacity: 0.7;
  }
  
  /* Light theme overrides */
  :global(.light-theme) .token-input-container {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .token-selector {
    background: rgba(0, 0, 0, 0.1);
  }
  
  :global(.light-theme) .token-selector:hover {
    background: rgba(0, 0, 0, 0.15);
  }
  
  :global(.light-theme) .liquidity-details {
    background: rgba(0, 0, 0, 0.03);
  }
  
  :global(.light-theme) .slippage-selector button {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.7);
  }
  
  :global(.light-theme) .empty-pools,
  :global(.light-theme) .pool-card,
  :global(.light-theme) .coming-soon {
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
  
  :global(.light-theme) .pool-action-button {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(0, 0, 0, 0.7);
  }
  
  :global(.light-theme) .pool-action-button:hover {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.9);
  }
</style>
