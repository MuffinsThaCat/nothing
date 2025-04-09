// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IEERC20
 * @dev Interface for eerc20 tokens with encrypted balances and transfers
 */
interface IEERC20 {
    /**
     * @dev Returns the name of the token
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals of the token
     */
    function decimals() external view returns (uint8);

    /**
     * @dev Returns the total supply of the token (may be encrypted)
     */
    function totalSupply() external view returns (bytes memory);

    /**
     * @dev Returns the encrypted balance of the specified account
     */
    function balanceOf(address account) external view returns (bytes memory);

    /**
     * @dev Transfers encrypted tokens between accounts using zk proofs
     * @param to The recipient address
     * @param amount The encrypted amount
     * @param proof The zero-knowledge proof validating the transfer
     */
    function transferWithProof(
        address to, 
        bytes calldata amount, 
        bytes calldata proof
    ) external returns (bool);
    
    /**
     * @dev Transfers encrypted tokens between accounts
     * @param to The recipient address
     * @param encryptedAmount The encrypted amount to transfer
     * @param zkProof The zero-knowledge proof validating the transfer
     */
    function transferEncrypted(
        address to,
        bytes calldata encryptedAmount,
        bytes calldata zkProof
    ) external returns (bool);

    /**
     * @dev Approves a spender to transfer encrypted tokens on behalf of the caller
     * @param spender The address allowed to spend tokens
     * @param amount The encrypted amount
     * @param proof The zero-knowledge proof validating the approval
     */
    function approveWithProof(
        address spender, 
        bytes calldata amount, 
        bytes calldata proof
    ) external returns (bool);

    /**
     * @dev Returns the encrypted allowance amount for a spender
     */
    function allowance(address owner, address spender) external view returns (bytes memory);

    /**
     * @dev Transfers tokens from one account to another using zk proofs
     * @param from The sender address
     * @param to The recipient address
     * @param amount The encrypted amount
     * @param proof The zero-knowledge proof validating the transfer
     */
    function transferFromWithProof(
        address from,
        address to,
        bytes calldata amount,
        bytes calldata proof
    ) external returns (bool);

    /**
     * @dev Event emitted when tokens are transferred
     */
    event Transfer(address indexed from, address indexed to, bytes encryptedAmount);

    /**
     * @dev Event emitted when approval is granted
     */
    event Approval(address indexed owner, address indexed spender, bytes encryptedAmount);
}
