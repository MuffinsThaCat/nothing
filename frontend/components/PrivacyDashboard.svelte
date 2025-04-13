<script>
  import dexService from '../services/dexService';
  const { privacySettings } = dexService;
  
  // Privacy features of EERC20 Batch DEX
  let features = [
    { 
      name: 'Transaction Privacy', 
      active: true,
      description: 'EERC20 token transaction obfuscation'
    },
    { 
      name: 'Batch Auctions', 
      active: true,
      description: 'Trades executed in private batches'
    },
    { 
      name: 'MEV Protection', 
      active: $privacySettings.enableMEVProtection,
      description: 'Front-running prevention'
    },
    { 
      name: 'Metadata Encryption', 
      active: $privacySettings.encryptMetadata,
      description: 'Encrypted transaction metadata'
    }
  ];
</script>

<div class="privacy-dashboard">
  <div class="dashboard-header">
    <h2>EERC20 Privacy Shield</h2>
    <div class="privacy-status">
      <div class="status-indicator active"></div>
      <span>Active</span>
    </div>
  </div>
  
  <div class="features-list">
    {#each features as feature}
      <div class="feature-item" class:active={feature.active}>
        <div class="feature-status">
          {#if feature.active}
            <svg class="feature-icon active" viewBox="0 0 24 24" width="18" height="18">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
          {:else}
            <svg class="feature-icon" viewBox="0 0 24 24" width="18" height="18">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
          {/if}
        </div>
        <div class="feature-info">
          <div class="feature-name">{feature.name}</div>
          <div class="feature-description">{feature.description}</div>
        </div>
      </div>
    {/each}
  </div>
  
  <div class="privacy-footer">
    <div class="encryption-status">
      <div class="status-indicator active"></div>
      <span>EERC20 Encryption Active</span>
    </div>
    <div class="zero-knowledge-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z" fill="currentColor"/>
      </svg>
      <span>Zero Knowledge</span>
    </div>
  </div>
</div>

<style>
  .privacy-dashboard {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.05) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .dashboard-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .dashboard-header h2::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    background: #E84142;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(232, 65, 66, 0.8);
  }
  
  .privacy-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(39, 174, 96, 0.1);
    padding: 0.3rem 0.6rem;
    border-radius: 0.5rem;
    color: #27AE60;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .features-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
    opacity: 0.5;
  }
  
  .feature-item.active {
    opacity: 1;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .feature-status {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }
  
  .feature-icon {
    color: #E84142;
  }
  
  .feature-icon.active {
    color: #27AE60;
  }
  
  .feature-info {
    display: flex;
    flex-direction: column;
  }
  
  .feature-name {
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .feature-description {
    font-size: 0.7rem;
    opacity: 0.7;
  }
  
  .privacy-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.75rem;
  }
  
  .encryption-status, .zero-knowledge-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #E84142;
  }
  
  .status-indicator.active {
    background: #27AE60;
    box-shadow: 0 0 8px rgba(39, 174, 96, 0.6);
    animation: pulse 2s infinite;
  }
  
  .zero-knowledge-badge {
    padding: 0.25rem 0.5rem;
    background: rgba(232, 65, 66, 0.1);
    border-radius: 1rem;
    color: #E84142;
    font-weight: 500;
    font-size: 0.7rem;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.7);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(39, 174, 96, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(39, 174, 96, 0);
    }
  }
  
  /* Light theme overrides */
  :global(.light-theme) .privacy-dashboard {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.5) 100%);
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .feature-status,
  :global(.light-theme) .encryption-status,
  :global(.light-theme) .zero-knowledge-badge {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .feature-item.active {
    background: rgba(0, 0, 0, 0.05);
  }
  
  
  :global(.light-theme) .privacy-footer {
    border-top: 1px solid rgba(0, 0, 0, 0.05);
  }
</style>
