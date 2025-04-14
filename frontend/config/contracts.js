// Contract addresses configuration with safe parameter handling
export const contracts = {
  // Deployed contract addresses from our local deployment (updated with actual deployment)
  EncryptedERC: "0x7A9Ec1d04904907De0ED7b6839CcdD59c3716AC9",
  BitcoinAdapter: "0x5c74c94173F05dA1720953407cbb920F3DF9f887",
  EthereumAdapter: "0x720472c8ce72c2A2D711333e064ABD3E6BbEAdd3", 
  BatchAuctionDEX: "0x5067457698Fd6Fa1C6964e416b3f42713513B3dD",
  Registrar: "0x367761085BF3C12e5DA2Df99AC6E1a824612b8fb",
  ZKVerifier: "0xe8D2A1E88c91DCd5433208d4152Cc4F399a7e91d",
  
  // Network configuration
  network: {
    chainId: 31337,
    name: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545"
  },
  
  // DEX configuration
  dexConfig: {
    // Generated from the Bitcoin and Ethereum adapter pair
    pairId: "0x3bd281298fe2ba5987a67ff13c47a86119dcac49ffa7775280aa45305673fea3",
    batchDuration: 300, // 5 minutes in seconds
    // Apply safe parameter handling by setting reasonable max limits
    maxOrderSize: 1000000, // Maximum reasonable order size
    maxProofSize: 32768,   // Maximum reasonable proof size in bytes
    maxInputLength: 4096,  // Maximum reasonable input length for any text field
    // Wasmlanche safe parameter principles
    minOrderSize: 0.000001, // Minimum reasonable order size
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
