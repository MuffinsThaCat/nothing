// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenTracker
 * @dev Tracks tokens within the EncryptedERC system
 * Implements Wasmlanche safe parameter handling principles:
 * - Parameter validation with proper bounds checking
 * - Safe fallback handling
 * - Defensive programming approaches
 */
contract TokenTracker is Ownable {
    // Starting from 1 because 0 is for standalone version of the EncryptedERC
    uint256 public nextTokenId = 1;
    
    // Indicates if the contract is a converter
    bool public isConverter;
    
    // Token address to token ID
    mapping(address => uint256) public tokenIds;
    
    // Token ID to token address
    mapping(uint256 => address) public tokenAddresses;
    
    // Maximum safe token ID (Wasmlanche principle)
    uint256 private constant MAX_TOKEN_ID = 1000000; 
    
    // Events
    event TokenAdded(address indexed tokenAddress, uint256 indexed tokenId);
    
    /**
     * @dev Constructor
     * @param _isConverter Whether this is a converter contract
     */
    constructor(bool _isConverter) {
        isConverter = _isConverter;
    }
    
    /**
     * @dev Add a token to the tracker
     * @param tokenAddress The address of the token
     * @return The assigned token ID
     */
    function addToken(address tokenAddress) external onlyOwner returns (uint256) {
        // Parameter validation (Wasmlanche principle)
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenIds[tokenAddress] == 0, "Token already added");
        require(nextTokenId < MAX_TOKEN_ID, "Too many tokens added");
        
        // Assign a token ID
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        
        // Store the mapping
        tokenIds[tokenAddress] = tokenId;
        tokenAddresses[tokenId] = tokenAddress;
        
        emit TokenAdded(tokenAddress, tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev Get a token's ID
     * @param tokenAddress The token address
     * @return The token ID (or 0 if not found)
     */
    function getTokenId(address tokenAddress) external view returns (uint256) {
        return tokenIds[tokenAddress];
    }
    
    /**
     * @dev Get a token's address
     * @param tokenId The token ID
     * @return The token address (or zero address if not found)
     */
    function getTokenAddress(uint256 tokenId) external view returns (address) {
        return tokenAddresses[tokenId];
    }
    
    /**
     * @dev Check if a token exists
     * @param tokenId The token ID
     * @return Whether the token exists
     */
    function tokenExists(uint256 tokenId) public view returns (bool) {
        return tokenAddresses[tokenId] != address(0);
    }
}
