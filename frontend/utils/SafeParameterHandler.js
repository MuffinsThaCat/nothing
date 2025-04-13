/**
 * SafeParameterHandler.js
 * 
 * Implements Wasmlanche's safe parameter handling principles:
 * 1. Parameter reading requires careful bounds checking
 * 2. Unreasonable lengths must be rejected
 * 3. All memory access must be bounds-checked to prevent issues
 * 4. Return empty results instead of throwing exceptions
 * 5. Add comprehensive debug logging
 */

// Constants for parameter validation
const MAX_STANDARD_LENGTH = 4096;  // 4KB for standard parameters
const MAX_PROOF_LENGTH = 65536;    // 64KB for zero-knowledge proofs
const MAX_TRANSACTION_LENGTH = 32768; // 32KB for transaction data
const MAX_ARRAY_LENGTH = 1024;     // Maximum reasonable array length

/**
 * Validates parameter length to prevent unreasonable inputs
 * @param {any} param - Parameter to validate
 * @param {number} maxLength - Maximum reasonable length
 * @returns {boolean} True if parameter is valid
 */
export function validateParameterLength(param, maxLength = MAX_STANDARD_LENGTH) {
  if (param === undefined || param === null) return false;
  
  // String validation
  if (typeof param === 'string') {
    return param.length <= maxLength;
  }
  
  // Array validation
  if (Array.isArray(param)) {
    return param.length <= maxLength;
  }
  
  // Object validation
  if (typeof param === 'object') {
    try {
      const jsonString = JSON.stringify(param);
      return jsonString.length <= maxLength;
    } catch {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates numeric parameter to prevent overflow
 * @param {number|string} value - Value to validate
 * @param {number} min - Minimum valid value
 * @param {number} max - Maximum valid value
 * @returns {boolean} True if parameter is valid
 */
export function validateNumericParameter(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === null) return false;
  
  // Convert to number if string
  const numValue = typeof value === 'string' ? Number(value) : value;
  
  // Check for NaN and validate bounds
  if (isNaN(numValue)) return false;
  
  return numValue >= min && numValue <= max;
}

/**
 * Safely access array elements with bounds checking
 * @param {Array} array - The array to access
 * @param {number} index - The index to access
 * @param {any} defaultValue - Default value to return if bounds check fails
 * @returns {any} The array element or default value
 */
export function safeArrayAccess(array, index, defaultValue = null) {
  if (!Array.isArray(array)) return defaultValue;
  if (index < 0 || index >= array.length) return defaultValue;
  return array[index];
}

/**
 * Safely copy arrays with bounds checking
 * @param {Array} source - Source array
 * @param {Array} destination - Destination array
 * @param {number} maxLength - Maximum elements to copy
 * @returns {number} Number of elements copied
 */
export function safeCopyArray(source, destination, maxLength = MAX_ARRAY_LENGTH) {
  if (!Array.isArray(source) || !Array.isArray(destination)) return 0;
  
  const copyLength = Math.min(source.length, destination.length, maxLength);
  for (let i = 0; i < copyLength; i++) {
    destination[i] = source[i];
  }
  
  return copyLength;
}

/**
 * Safe logger that avoids exposing sensitive information
 */
export const safeLogger = {
  debug: (message, ...args) => {
    // Only log in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[EERC20-DEX-DEBUG] ${message}`, ...args);
    }
  },
  info: (message, ...args) => {
    console.info(`[EERC20-DEX-INFO] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[EERC20-DEX-WARN] ${message}`, ...args);
  },
  error: (message, ...args) => {
    // Log errors but without exposing sensitive data
    const sanitizedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        // Create a sanitized copy without sensitive fields
        const sanitized = { ...arg };
        ['privateKey', 'secret', 'seed', 'password', 'mnemonic'].forEach(field => {
          if (field in sanitized) sanitized[field] = '[REDACTED]';
        });
        return sanitized;
      }
      return arg;
    });
    
    console.error(`[EERC20-DEX-ERROR] ${message}`, ...sanitizedArgs);
  }
};

/**
 * Safe parameter wrapper - wraps a function with parameter validation
 * @param {Function} fn - Function to wrap
 * @param {Function} validator - Validation function
 * @param {any} defaultReturn - Default return value if validation fails
 * @returns {Function} Wrapped function with parameter validation
 */
export function withSafeParameters(fn, validator, defaultReturn = null) {
  return function(...args) {
    if (!validator(...args)) {
      safeLogger.warn('Parameter validation failed', { function: fn.name });
      return defaultReturn;
    }
    
    try {
      return fn(...args);
    } catch (error) {
      safeLogger.error('Error in function execution', error);
      return defaultReturn;
    }
  };
}

/**
 * Creates bounded buffer with safe read/write operations
 * @param {number} size - Buffer size
 * @returns {Object} Safe buffer operations
 */
export function createSafeBuffer(size = 1024) {
  const buffer = new Uint8Array(size);
  let writePos = 0;
  
  return {
    write: (data, offset = 0, length) => {
      if (!data) return 0;
      
      // Handle typed arrays
      const dataArray = data instanceof Uint8Array ? data : 
                       (typeof data === 'string' ? new TextEncoder().encode(data) : null);
      
      if (!dataArray) return 0;
      
      const dataLength = length || dataArray.length;
      const safeLength = Math.min(dataLength, size - writePos);
      
      if (safeLength <= 0) return 0;
      
      for (let i = 0; i < safeLength; i++) {
        buffer[writePos + i] = dataArray[offset + i];
      }
      
      writePos += safeLength;
      return safeLength;
    },
    
    read: (length, offset = 0) => {
      if (offset < 0 || offset >= writePos) return new Uint8Array(0);
      
      const safeLength = Math.min(length, writePos - offset);
      if (safeLength <= 0) return new Uint8Array(0);
      
      return buffer.slice(offset, offset + safeLength);
    },
    
    reset: () => {
      writePos = 0;
    },
    
    getSize: () => size,
    getUsed: () => writePos
  };
}

export default {
  validateParameterLength,
  validateNumericParameter,
  safeArrayAccess,
  safeCopyArray,
  safeLogger,
  withSafeParameters,
  createSafeBuffer,
  
  // Constants
  MAX_STANDARD_LENGTH,
  MAX_PROOF_LENGTH,
  MAX_TRANSACTION_LENGTH,
  MAX_ARRAY_LENGTH
};
