// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Custom errors for the EncryptedERC system
 * Implements Wasmlanche safe parameter handling principles with:
 * - Specific error types for better debugging
 * - Clear error messages
 * - Structured error codes
 */

// User is not registered with the system
error UserNotRegistered();

// Auditor key is not set
error AuditorKeyNotSet();

// Invalid zero-knowledge proof
error InvalidProof();

// Invalid operation requested
error InvalidOperation();

// Token transfer failed
error TransferFailed();

// Unknown token ID
error UnknownToken();

// Invalid chain ID
error InvalidChainId();

// Nullifier has been used before
error InvalidNullifier();

// Public input not in the field
error PublicInputNotInField();

// Parameter validation failed
error InvalidParameter(string param, string reason);
