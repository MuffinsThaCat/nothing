// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleZKVerifier
 * @dev A simplified ZK verifier for testing purposes
 */
contract SimpleZKVerifier {
    // Simple flag to mock verification status
    bool public verificationEnabled = true;
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    /**
     * @dev Verify a zero-knowledge proof (mock implementation)
     * @param _proof The proof data
     * @param _publicInputs The public inputs to verify against
     * @return True if proof is valid
     */
    function verifyProof(bytes calldata _proof, bytes32[] calldata _publicInputs) 
        external view returns (bool) 
    {
        // For testing, just check if verification is enabled and inputs are non-empty
        return verificationEnabled && _proof.length > 0 && _publicInputs.length > 0;
    }
    
    /**
     * @dev Enable or disable verification (for testing)
     */
    function setVerificationEnabled(bool _enabled) external onlyOwner {
        verificationEnabled = _enabled;
    }
}
