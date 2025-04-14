<script>
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  
  // State variables
  let connected = false;
  let connecting = false;
  let address = '';
  let error = null;
  
  async function connectWallet() {
    if (connecting) return;
    
    connecting = true;
    error = null;
    
    try {
      console.log('Attempting direct wallet connection...');
      
      // Check if ethereum provider exists
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Web3 wallet detected. Please install MetaMask or another provider.');
      }
      
      // Request accounts - this triggers the wallet popup
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }
      
      // Format the address
      address = accounts[0];
      connected = true;
      
      console.log('Wallet connected:', address);
    } catch (err) {
      error = err.message || 'Failed to connect wallet';
      console.error('Error connecting wallet:', error);
    } finally {
      connecting = false;
    }
  }
  
  function disconnectWallet() {
    address = '';
    connected = false;
  }
  
  // Listen for account changes
  onMount(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // User disconnected
          disconnectWallet();
        } else {
          // Account changed
          address = accounts[0];
          connected = true;
        }
      });
    }
  });
</script>

<div class="direct-wallet-connect">
  {#if !connected}
    <button on:click={connectWallet} disabled={connecting}>
      {connecting ? 'Connecting...' : 'Connect Wallet Directly'}
    </button>
    {#if error}
      <div class="error">{error}</div>
    {/if}
  {:else}
    <div class="connected-display">
      <div class="address-display">
        Connected: <span class="address">{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
      </div>
      <button class="disconnect" on:click={disconnectWallet}>Disconnect</button>
    </div>
  {/if}
</div>

<style>
  .direct-wallet-connect {
    padding: 1rem;
    border-radius: 12px;
    background-color: rgba(0, 0, 0, 0.1);
    margin-bottom: 1rem;
  }
  
  button {
    background-color: #E84142;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:hover {
    background-color: #d13838;
  }
  
  button:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
  
  .error {
    color: #E84142;
    margin-top: 0.5rem;
    font-size: 14px;
  }
  
  .connected-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .address-display {
    font-weight: 500;
  }
  
  .address {
    background-color: rgba(232, 65, 66, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
    font-family: monospace;
  }
  
  .disconnect {
    background-color: transparent;
    color: #E84142;
    border: 1px solid #E84142;
    font-size: 14px;
    padding: 6px 12px;
  }
</style>
