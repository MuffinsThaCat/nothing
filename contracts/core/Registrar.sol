// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Registrar
 * @dev Manages user registration and key storage for the EncryptedERC system
 * Implements Wasmlanche safe parameter handling principles:
 * - Parameter validation with bounds checking
 * - Safe default handling
 * - Comprehensive debugging
 */
contract Registrar is Ownable {
    // Maximum reasonable parameters (Wasmlanche principle)
    uint256 private constant MAX_KEY_SIZE = 256;
    
    // Public key information
    struct PublicKey {
        bytes key;
        bool isRegistered;
    }
    
    // User registration status
    mapping(address => PublicKey) public userRegistration;
    
    // Auditor role
    address public auditor;
    
    // Events
    event UserRegistered(address indexed user);
    event AuditorSet(address indexed auditor);
    
    /**
     * @dev Register a user with their public key
     * @param publicKey The user's public key
     */
    function registerUser(bytes calldata publicKey) external {
        // Parameter validation (Wasmlanche principle)
        require(publicKey.length > 0, "Empty public key");
        require(publicKey.length <= MAX_KEY_SIZE, "Public key too large");
        
        // Store user registration
        userRegistration[msg.sender] = PublicKey({
            key: publicKey,
            isRegistered: true
        });
        
        emit UserRegistered(msg.sender);
    }
    
    /**
     * @dev Check if a user is registered
     * @param user The address to check
     * @return Whether the user is registered
     */
    function isRegistered(address user) external view returns (bool) {
        return userRegistration[user].isRegistered;
    }
    
    /**
     * @dev Get a user's public key
     * @param user The user address
     * @return The user's public key or empty if not registered
     */
    function getPublicKey(address user) external view returns (bytes memory) {
        // Safe return - empty bytes if not registered (Wasmlanche principle)
        if (!userRegistration[user].isRegistered) {
            return "";
        }
        
        return userRegistration[user].key;
    }
    
    /**
     * @dev Set the auditor address
     * @param _auditor The new auditor address
     */
    function setAuditor(address _auditor) external onlyOwner {
        require(_auditor != address(0), "Invalid auditor address");
        
        auditor = _auditor;
        emit AuditorSet(_auditor);
    }
}
