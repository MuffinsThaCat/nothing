// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Types
 * @dev Defines essential data types for the EncryptedERC system
 * Implements Wasmlanche safe parameter handling principles with:
 * - Well-defined size limits for memory safety
 * - Type validation through struct encapsulation
 * - Safe initialization patterns
 */

// Elliptic curve point (for BabyJubJub curve)
struct Point {
    uint256 x;
    uint256 y;
}

// Parameters for creating a new EncryptedERC instance
struct CreateEncryptedERCParams {
    // Contract addresses
    address registrar;
    address mintVerifier;
    address withdrawVerifier;
    address transferVerifier;
    
    // Token metadata
    string name;
    string symbol;
    uint8 decimals;
    
    // Whether this is a converter contract
    bool isConverter;
}

// Encrypted Group Ciphertext - represents encrypted values
struct EGCT {
    uint256 r;
    uint256 c1x;
    uint256 c1y;
    uint256 c2x;
    uint256 c2y;
}

// Represents an encrypted balance
struct EncryptedBalance {
    // The encrypted value
    EGCT egct;
    
    // Nullifier to prevent replay
    uint256 nullifier;
}

// Amount with Proof of Correct Transaction (PCT)
struct AmountPCT {
    // Public components
    uint256 r;
    uint256 c1x;
    uint256 c1y;
    uint256 c2x;
    uint256 c2y;
    
    // Proof component
    uint256 proof;
}
