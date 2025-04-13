// Contract addresses configuration with safe parameter handling
export const contracts = {
  // Deployed contract addresses from our local deployment
  DEXFactory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  BatchAuctionDEX: "0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968",
  
  // Network configuration
  network: {
    chainId: 31337,
    name: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545"
  },
  
  // DEX configuration
  dexConfig: {
    dexId: "0xf09647df9179cc23e1d14920e502004e6ec00f0cd15ad3918bb65ef076dd58aa",
    batchDuration: 300, // 5 minutes in seconds
    // Apply safe parameter handling by setting reasonable max limits
    maxOrderSize: 1000000, // Maximum reasonable order size
    maxProofSize: 32768,   // Maximum reasonable proof size in bytes
    maxInputLength: 4096,  // Maximum reasonable input length for any text field
  }
};

// Safe parameter handling utilities
export const safeParamValidation = {
  // Validate parameter length to prevent unreasonable inputs
  validateLength: (param, maxLength = 4096) => {
    if (param === undefined || param === null) return false;
    if (typeof param === 'string' && param.length > maxLength) return false;
    if (Array.isArray(param) && param.length > maxLength) return false;
    return true;
  },
  
  // Validate numeric parameters to prevent overflow
  validateNumber: (num, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    if (isNaN(Number(num))) return false;
    const value = Number(num);
    return value >= min && value <= max;
  },
  
  // Sanitize inputs to prevent injection attacks
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    // Basic sanitization
    return input.replace(/[<>]/g, '');
  }
};
