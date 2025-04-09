<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let isDarkMode = true;
  
  function toggleTheme() {
    isDarkMode = !isDarkMode;
    dispatch('toggle');
  }
</script>

<button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
  {#if isDarkMode}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3V4M12 20V21M21 12H20M4 12H3M18.364 5.636L17.657 6.343M6.343 17.657L5.636 18.364M18.364 18.364L17.657 17.657M6.343 6.343L5.636 5.636M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  {:else}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79C21 17.7 17.73 21.82 12.87 21.97C12.58 22 12.29 22 12 22C11.71 22 11.42 22 11.13 21.97C6.27 21.82 3 17.7 3 12.79C3 7.87001 6.27 3.76001 11.13 3.61001C11.42 3.58001 11.71 3.58001 12 3.58001C12.29 3.58001 12.58 3.58001 12.87 3.61001C17.73 3.76001 21 7.87001 21 12.79Z" stroke="currentColor" stroke-width="2"/>
      <path d="M7.5 3C8.87 4.6 9.63 6.93 9.63 9.54C9.63 12.15 8.87 14.47 7.5 16.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16.5 3C15.13 4.6 14.37 6.93 14.37 9.54C14.37 12.15 15.13 14.47 16.5 16.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 9.5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 14.5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    background: rgba(0, 0, 0, 0.2);
    border: none;
    border-radius: 50%;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .theme-toggle:hover {
    background: rgba(0, 0, 0, 0.3);
    color: rgba(255, 255, 255, 1);
    transform: rotate(15deg);
  }
  
  /* Light theme overrides */
  :global(.light-theme) .theme-toggle {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.7);
  }
  
  :global(.light-theme) .theme-toggle:hover {
    background: rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.9);
  }
</style>
