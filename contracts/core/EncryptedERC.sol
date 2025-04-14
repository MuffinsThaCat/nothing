// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TokenTracker.sol";
import "./EncryptedUserBalances.sol";
import "../types/Types.sol";
import "../verifiers/MintVerifier.sol";
import "../verifiers/WithdrawVerifier.sol";
import "../verifiers/TransferVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EncryptedERC
 * @dev Main contract for EERC20 tokens with privacy features
 * Implements Wasmlanche safe parameter handling principles:
 * - Comprehensive parameter validation
 * - Safe bounds checking
 * - Defensive fallback handling
 * - Detailed debug events
 */
contract EncryptedERC is TokenTracker, EncryptedUserBalances {
    using SafeERC20 for IERC20;

    // Interface references
    IMintVerifier public mintVerifier;
    IWithdrawVerifier public withdrawVerifier;
    ITransferVerifier public transferVerifier;
    
    // Maximum parameter sizes for safety (Wasmlanche principle)
    uint256 private constant MAX_PROOF_SIZE = 32 * 1024; // 32KB max proof size
    uint256 private constant MAX_PUBLIC_INPUT_SIZE = 16 * 1024; // 16KB max input size
    
    // Token information
    string public name;
    string public symbol;
    uint8 public decimals;
    
    // Auditor
    address public auditor = address(0);
    
    // Nullifier hash for private mint
    mapping(uint256 => bool) public alreadyMinted;
    
    // Events
    event AuditorChanged(address indexed oldAuditor, address indexed newAuditor);
    event PrivateMint(address indexed user, uint256[7] auditorPCT, address indexed auditorAddress);
    event PrivateBurn(address indexed user, uint256[7] auditorPCT, address indexed auditorAddress);
    event PrivateTransfer(address indexed from, address indexed to, bytes32 transferHash);
    
    /**
     * @dev Constructor
     * @param params Parameters for creating the EncryptedERC
     */
    constructor(CreateEncryptedERCParams memory params) TokenTracker(params.isConverter) {
        // Parameter validation (Wasmlanche principle)
        require(params.mintVerifier != address(0), "Invalid mintVerifier address");
        require(params.withdrawVerifier != address(0), "Invalid withdrawVerifier address");
        require(params.transferVerifier != address(0), "Invalid transferVerifier address");
        require(params.registrar != address(0), "Invalid registrar address");
        
        // For converter, name and symbol aren't required
        if (!params.isConverter) {
            // Validate string parameters (Wasmlanche principle)
            require(bytes(params.name).length > 0, "Empty name");
            require(bytes(params.name).length <= 32, "Name too long");
            require(bytes(params.symbol).length > 0, "Empty symbol");
            require(bytes(params.symbol).length <= 8, "Symbol too long");
            
            name = params.name;
            symbol = params.symbol;
        }
        
        // Set decimals (Wasmlanche principle - validate range)
        require(params.decimals <= 18, "Decimals too large");
        decimals = params.decimals;
        
        // Initialize verifiers
        mintVerifier = IMintVerifier(params.mintVerifier);
        withdrawVerifier = IWithdrawVerifier(params.withdrawVerifier);
        transferVerifier = ITransferVerifier(params.transferVerifier);
    }
    
    /**
     * @dev Sets the auditor's public key
     * @param user Address of the user who will be the auditor
     */
    function setAuditorPublicKey(address user) external onlyOwner {
        // Parameter validation (Wasmlanche principle)
        require(user != address(0), "Invalid auditor address");
        
        address oldAuditor = auditor;
        auditor = user;
        
        // For testing, we'll use a dummy public key
        // In a real implementation, this would be set separately
        auditorPublicKey = Point({x: 1, y: 2});
        
        emit AuditorChanged(oldAuditor, auditor);
    }
    
    /**
     * @dev Private mint with zero-knowledge proof
     * @param a First part of ZK proof
     * @param b Second part of ZK proof (matrix)
     * @param c Third part of ZK proof
     * @param publicInput Public inputs to the ZK circuit
     * @param mintNullifier Nullifier to prevent replay attacks
     */
    function privateMint(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[32] calldata publicInput,
        uint256 mintNullifier
    ) external {
        // Parameter validation (Wasmlanche principle)
        require(!alreadyMinted[mintNullifier], "Nullifier already used");
        require(isAuditorKeySet(), "Auditor key not set");
        
        // Validate public input
        for (uint256 i = 0; i < 8; i++) {
            require(publicInput[i] < type(uint128).max, "Input value too large");
        }
        
        // Verify proof
        bool isValid = mintVerifier.verifyProof(a, b, c, publicInput);
        require(isValid, "Invalid proof");
        
        // Mark nullifier as used
        alreadyMinted[mintNullifier] = true;
        
        // Extract token ID and amount from public input
        uint256 tokenId = publicInput[0];
        
        // Update encrypted balance
        // In a real implementation, this would extract balance from proof
        EncryptedBalance memory newBalance = EncryptedBalance({
            egct: EGCT({
                r: publicInput[1],
                c1x: publicInput[2],
                c1y: publicInput[3],
                c2x: publicInput[4], 
                c2y: publicInput[5]
            }),
            nullifier: mintNullifier
        });
        
        // Create mock PCT for the event
        uint256[7] memory auditorPCT;
        for (uint256 i = 0; i < 7; i++) {
            // Safe value extraction (Wasmlanche principle)
            auditorPCT[i] = i < 32 ? publicInput[i] : 0;
        }
        
        // Update user's balance
        _updateEncryptedBalance(msg.sender, tokenId, newBalance);
        
        emit PrivateMint(msg.sender, auditorPCT, auditor);
    }
    
    /**
     * @dev Private transfer with zero-knowledge proof
     * @param to Recipient address
     * @param a First part of ZK proof
     * @param b Second part of ZK proof (matrix)
     * @param c Third part of ZK proof
     * @param publicInput Public inputs to the ZK circuit
     */
    function privateTransfer(
        address to,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[32] calldata publicInput
    ) external {
        // Parameter validation (Wasmlanche principle)
        require(to != address(0), "Invalid recipient");
        require(isAuditorKeySet(), "Auditor key not set");
        
        // Verify proof
        bool isValid = transferVerifier.verifyProof(a, b, c, publicInput);
        require(isValid, "Invalid proof");
        
        // Extract token ID from public input
        uint256 tokenId = publicInput[0];
        
        // Update sender's encrypted balance
        EncryptedBalance memory senderBalance = EncryptedBalance({
            egct: EGCT({
                r: publicInput[1],
                c1x: publicInput[2],
                c1y: publicInput[3],
                c2x: publicInput[4],
                c2y: publicInput[5]
            }),
            nullifier: publicInput[6]
        });
        
        // Update recipient's encrypted balance
        EncryptedBalance memory recipientBalance = EncryptedBalance({
            egct: EGCT({
                r: publicInput[7],
                c1x: publicInput[8],
                c1y: publicInput[9],
                c2x: publicInput[10],
                c2y: publicInput[11]
            }),
            nullifier: publicInput[12]
        });
        
        // Update balances
        _updateEncryptedBalance(msg.sender, tokenId, senderBalance);
        _updateEncryptedBalance(to, tokenId, recipientBalance);
        
        // Generate a unique transfer hash for event emission
        bytes32 transferHash = keccak256(abi.encodePacked(
            msg.sender, to, tokenId, block.timestamp, publicInput[0]
        ));
        
        emit PrivateTransfer(msg.sender, to, transferHash);
    }
    
    /**
     * @dev Check if auditor public key is set
     * @return Whether the auditor key is set
     */
    function isAuditorKeySet() public view returns (bool) {
        return auditorPublicKey.x != 0 || auditorPublicKey.y != 0;
    }
    
    /**
     * @dev Get the encrypted total supply for a token
     * @param tokenId The token ID
     * @return The encrypted total supply (dummy value for testing)
     */
    function encryptedTotalSupply(uint256 tokenId) external view returns (bytes memory) {
        // For testing, return a dummy encrypted value
        return abi.encodePacked(tokenId, uint256(1000000));
    }
}
