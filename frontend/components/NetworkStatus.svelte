<script>
  export let metrics = {
    blockTime: '2.0s',
    gasPrice: '25 nAVAX',
    congestion: 'Low',
    blockHeight: 12345678
  };
  
  // Computed congestion color
  $: congestionColor = metrics.congestion === 'Low' ? '#27AE60' : 
                      metrics.congestion === 'Medium' ? '#F2C94C' : '#E84142';
  
  // Animation for updated values
  let animatedBlockHeight = false;
  
  $: {
    if (metrics.blockHeight) {
      animatedBlockHeight = true;
      setTimeout(() => animatedBlockHeight = false, 1000);
    }
  }
</script>

<div class="network-status">
  <div class="status-header">
    <h3>
      <span class="network-dot"></span>
      Avalanche Network
    </h3>
    <div class="network-badge">C-Chain</div>
  </div>
  
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8v4l3 3m6-3A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="metric-data">
        <div class="metric-value">{metrics.blockTime}</div>
        <div class="metric-label">Block Time</div>
      </div>
    </div>
    
    <div class="metric-card">
      <div class="metric-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="currentColor"/>
          <path d="M2.05 13h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zm19.9 0h-2c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1s-.45 1-1 1zM11 2.05v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zm0 19.9v-2c0-.55-.45-1-1-1s-1 .45-1 1v2c0 .55.45 1 1 1s1-.45 1-1z" fill="currentColor"/>
        </svg>
      </div>
      <div class="metric-data">
        <div class="metric-value">{metrics.gasPrice}</div>
        <div class="metric-label">Gas Price</div>
      </div>
    </div>
    
    <div class="metric-card">
      <div class="metric-icon" style="color: {congestionColor}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 17h-2v-6h2v6zm0-10h-2v2h2V7z" fill="currentColor"/>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
        </svg>
      </div>
      <div class="metric-data">
        <div class="metric-value" style="color: {congestionColor}">{metrics.congestion}</div>
        <div class="metric-label">Congestion</div>
      </div>
    </div>
    
    <div class="metric-card">
      <div class="metric-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 5H5v14h14V5zm0-2c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14z" fill="currentColor"/>
          <path d="M7 7h10v2H7zm0 4h5v2H7zm0 4h8v2H7z" fill="currentColor"/>
        </svg>
      </div>
      <div class="metric-data">
        <div class="metric-value" class:animated={animatedBlockHeight}>{metrics.blockHeight}</div>
        <div class="metric-label">Block Height</div>
      </div>
    </div>
  </div>
  
  <div class="real-time-indicator">
    <span class="pulse-dot"></span>
    Real-time Monitoring Active
  </div>
</div>

<style>
  .network-status {
    background: linear-gradient(135deg, rgba(232, 65, 66, 0.1) 0%, rgba(232, 65, 66, 0.05) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(232, 65, 66, 0.1);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .status-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .network-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #E84142;
    box-shadow: 0 0 8px rgba(232, 65, 66, 0.8);
    animation: pulse 2s infinite;
  }
  
  .network-badge {
    padding: 0.25rem 0.5rem;
    background: rgba(232, 65, 66, 0.1);
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #E84142;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .metric-card {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .metric-icon {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .metric-data {
    display: flex;
    flex-direction: column;
  }
  
  .metric-value {
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.3s ease;
  }
  
  .metric-value.animated {
    color: #E84142;
    animation: fadeInOut 1s ease;
  }
  
  .metric-label {
    font-size: 0.7rem;
    opacity: 0.7;
  }
  
  .real-time-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.7;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #27AE60;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.7);
    }
    70% {
      box-shadow: 0 0 0 4px rgba(39, 174, 96, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(39, 174, 96, 0);
    }
  }
  
  @keyframes fadeInOut {
    0% { opacity: 0.5; transform: scale(0.95); }
    50% { opacity: 1; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  /* Light theme overrides */
  :global(.light-theme) .network-status {
    background: linear-gradient(135deg, rgba(232, 65, 66, 0.1) 0%, rgba(232, 65, 66, 0.02) 100%);
    border: 1px solid rgba(232, 65, 66, 0.1);
  }
  
  :global(.light-theme) .metric-card {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(.light-theme) .metric-icon {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.7);
  }
  
  :global(.light-theme) .real-time-indicator {
    border-top: 1px solid rgba(0, 0, 0, 0.05);
  }
</style>
