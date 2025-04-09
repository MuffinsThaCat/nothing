// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockEERC20
 * @dev Mock implementation of an EERC20 token for testing purposes
 * Simulates the behavior of an encrypted ERC20 token for testing without actual encryption
 */
contract MockEERC20 is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable() {}

    /**
     * @dev Generates tokens for testing purposes
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to generate
     */
    function generateTokens(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // ======== Encrypted Balance and Transfer Functions ========

    /**
     * @dev Returns the encrypted balance representation for testing
     * @param account Address to get balance for
     */
    function getEncryptedBalance(address account) public view returns (bytes memory) {
        // Mock an encrypted balance by encoding the regular balance
        return abi.encodePacked(balanceOf(account));
    }

    /**
     * @dev Returns an encrypted representation of the total supply
     */
    function getEncryptedTotalSupply() public view returns (bytes memory) {
        // Mock encrypted total supply
        return abi.encodePacked(totalSupply());
    }

    /**
     * @dev Returns an encrypted representation of the allowance
     */
    function getEncryptedAllowance(address owner, address spender) public view returns (bytes memory) {
        // Mock encrypted allowance
        return abi.encodePacked(allowance(owner, spender));
    }
    
    /**
     * @dev Transfers tokens with an encrypted amount and proof
     * For testing, it simply transfers a fixed amount
     */
    function transferWithProof(
        address to,
        bytes calldata encryptedAmount,
        bytes calldata proof
    ) external returns (bool) {
        // For mock purposes, use a fixed amount
        uint256 amount = 1 ether;
        return transfer(to, amount);
    }
    
    /**
     * @dev Alternative method for encrypted transfers (alias for transferWithProof)
     */
    function transferEncrypted(
        address to,
        bytes calldata encryptedAmount,
        bytes calldata zkProof
    ) external returns (bool) {
        // Use a fixed amount
        uint256 amount = 1 ether;
        return transfer(to, amount);
    }

    /**
     * @dev Approves spending with an encrypted amount and proof
     */
    function approveWithProof(
        address spender,
        bytes calldata encryptedAmount,
        bytes calldata proof
    ) external returns (bool) {
        // For mock purposes, approve a fixed amount
        uint256 amount = 100 ether;
        return approve(spender, amount);
    }

    /**
     * @dev Transfers from an account using encrypted amounts and proofs
     */
    function transferFromWithProof(
        address from,
        address to,
        bytes calldata amount,
        bytes calldata proof
    ) external returns (bool) {
        // For mock purposes, use a fixed amount
        uint256 transferAmount = 1 ether;
        return transferFrom(from, to, transferAmount);
    }

    /**
     * @dev Verify if an account has at least the given encrypted balance
     */
    function hasBalanceWithProof(
        address owner,
        bytes calldata encryptedMinimum,
        bytes calldata proof
    ) external view returns (bool) {
        // For mock purposes, check if they have at least 1 token
        return balanceOf(owner) >= 1;
    }

    /**
     * @dev Returns a mock public key for a user
     */
    function getPublicKey(address user) external pure returns (bytes memory) {
        // Return a deterministic mock public key
        return abi.encodePacked(user, "mock-public-key");
    }
}
