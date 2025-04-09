// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestToken
 * @dev A simple ERC20 token for testing purposes
 */
contract TestToken is ERC20, Ownable {
    // Constructor initializes the token with a name, symbol, and initial supply
    constructor(string memory name, string memory symbol, uint256 initialSupply) 
        ERC20(name, symbol) 
    {
        // Mint the initial supply to the contract deployer
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Mint additional tokens (only owner can call)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
