// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BatchAuctionDEX.sol";
import "../utils/ZKVerifier.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DEXFactory
 * @dev Factory contract for deploying BatchAuctionDEX instances
 */
contract DEXFactory is Ownable {
    // Mapping of deployed DEXs
    mapping(bytes32 => address) public deployedDEXs;
    bytes32[] public dexIds;
    
    // ZKVerifier instance used by all DEXs
    ZKVerifier public zkVerifier;
    
    // Events
    event DEXDeployed(bytes32 indexed dexId, address indexed dexAddress, address indexed deployer);
    event ZKVerifierUpdated(address indexed newVerifier);
    
    /**
     * @dev Constructor
     * @param _transferProofKey Initial verifying key for transfer proofs
     * @param _balanceProofKey Initial verifying key for balance proofs
     * @param _settlementProofKey Initial verifying key for settlement proofs
     * @param _allowContinueOnFailure Whether to allow continuation when proof verification fails
     */
    constructor(
        bytes memory _transferProofKey,
        bytes memory _balanceProofKey,
        bytes memory _settlementProofKey,
        bool _allowContinueOnFailure
    ) {
        // Deploy the ZKVerifier with proper parameters
        zkVerifier = new ZKVerifier(
            _transferProofKey,
            _balanceProofKey,
            _settlementProofKey,
            _allowContinueOnFailure
        );
    }
    
    /**
     * @dev Deploy a new BatchAuctionDEX
     * @param _batchDuration Duration of each batch in seconds
     * @param _name Name identifier for the DEX
     * @return The address of the newly deployed DEX
     */
    function deployDEX(uint256 _batchDuration, string memory _name) external returns (address) {
        require(_batchDuration > 0, "Batch duration must be positive");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        bytes32 dexId = keccak256(abi.encodePacked(_name, msg.sender, block.timestamp));
        require(deployedDEXs[dexId] == address(0), "DEX with this ID already exists");
        
        // Deploy a new BatchAuctionDEX with the ZKVerifier address
        BatchAuctionDEX newDEX = new BatchAuctionDEX(_batchDuration, address(zkVerifier));
        newDEX.transferOwnership(msg.sender);
        
        // Store the DEX address
        deployedDEXs[dexId] = address(newDEX);
        dexIds.push(dexId);
        
        emit DEXDeployed(dexId, address(newDEX), msg.sender);
        
        return address(newDEX);
    }
    
    /**
     * @dev Update the ZKVerifier implementation
     * @param _newVerifier Address of the new ZKVerifier implementation
     */
    function updateZKVerifier(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid verifier address");
        zkVerifier = ZKVerifier(_newVerifier);
        
        emit ZKVerifierUpdated(_newVerifier);
    }
    
    /**
     * @dev Get all deployed DEXs
     * @return Array of DEX IDs
     */
    function getAllDEXs() external view returns (bytes32[] memory) {
        return dexIds;
    }
    
    /**
     * @dev Get DEX information
     * @param _dexId DEX ID
     * @return DEX address
     */
    function getDEX(bytes32 _dexId) external view returns (address) {
        require(deployedDEXs[_dexId] != address(0), "DEX does not exist");
        return deployedDEXs[_dexId];
    }
}
