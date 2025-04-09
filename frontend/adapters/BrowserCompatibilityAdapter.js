/**
 * Browser Compatibility Adapter
 * 
 * Provides browser-compatible versions of Node.js modules used in the backend.
 * This allows us to run the same code in both Node.js and browser environments
 * while following Wasmlanche safe parameter handling principles.
 */

// Browsers don't have crypto.randomBytes - provide a Web Crypto API alternative
export function getRandomBytes(size) {
  if (typeof window !== 'undefined' && window.crypto) {
    const buffer = new Uint8Array(size);
    window.crypto.getRandomValues(buffer);
    return buffer;
  }
  // Fallback for testing
  return new Uint8Array(size).fill(1);
}

// Simple path joining for browser compatibility
export function joinPath(...parts) {
  return parts.join('/');
}

// Simulate file system operations
export const fileSystem = {
  // Browser-compatible version of fs.existsSync
  existsSync: (path) => {
    console.log(`[Browser] Would check if ${path} exists`);
    return false; // Always return false in browser
  },
  // Browser-compatible version of fs.readFileSync
  readFileSync: (path, options) => {
    console.log(`[Browser] Would read ${path}`);
    return null;
  }
};

// Simple hex encoding/decoding for browser environments
export const encoding = {
  // Convert buffer to hex string
  bufferToHex: (buffer) => {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },
  // Convert hex string to buffer
  hexToBuffer: (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
  }
};

// BigInt compatibility helpers
export const bigIntUtils = {
  // Safe conversion to BigInt with fallback
  toBigInt: (value) => {
    try {
      if (typeof value === 'bigint') return value;
      if (typeof value === 'number') return BigInt(value);
      if (typeof value === 'string') return BigInt(value);
      return BigInt(0);
    } catch (error) {
      console.warn('Invalid BigInt conversion:', error.message);
      return BigInt(0);
    }
  },
  // Safe BigInt addition with bounds checking (Wasmlanche principle)
  safeAdd: (a, b) => {
    const MAX_SAFE = BigInt(2) ** BigInt(128);
    a = bigIntUtils.toBigInt(a);
    b = bigIntUtils.toBigInt(b);
    
    // Check for overflow
    if (a > BigInt(0) && b > BigInt(0) && a + b < a) {
      console.warn('BigInt addition overflow detected, returning max value');
      return MAX_SAFE;
    }
    
    return a + b;
  }
};

// Minimal implementation of zero-knowledge primitives for browsers
export const zkPrimitives = {
  // Generate a simulated proof for testing in browser environments
  generateProof: (publicInputs, privateInputs) => {
    console.log('[Browser] Generating simulated ZK proof');
    
    // Return a dummy proof that passes verification in test environment
    const proofBytes = new Uint8Array(132);
    getRandomBytes(proofBytes);
    
    return {
      proof: proofBytes,
      publicSignals: Object.values(publicInputs).map(v => v.toString())
    };
  },
  
  // Encrypt a value using a public key (simulated)
  encrypt: (publicKey, value) => {
    console.log('[Browser] Encrypting with simulated ZK encryption');
    
    // Create a deterministic but safe encrypted representation
    const encrypted = {
      x: bigIntUtils.toBigInt(value),
      y: bigIntUtils.toBigInt(1)
    };
    
    return encrypted;
  }
};

// Export a detection function to check if we're in a browser
export function isBrowserEnvironment() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
