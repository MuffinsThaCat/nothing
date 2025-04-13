/**
 * ABIs for EERC20 Batch DEX contracts
 * Focused on implementing safe parameter handling principles
 */

export const BatchAuctionDEX_ABI = [
  // Batch management
  "function getActiveBatch() external view returns (uint256 batchId, uint256 deadline)",
  "function getBatchSettlement(uint256 batchId, bytes32 pairId) external view returns (uint256 clearingPrice, uint256 settledVolume, uint256 timestamp)",
  
  // Order management with parameter validation
  "function placeOrder(bytes32 pairId, uint8 orderType, uint256 amount, uint256 price, bytes memory proof) external returns (bytes32 orderId)",
  "function cancelOrder(bytes32 orderId) external",
  "function getOrder(bytes32 orderId) external view returns (address trader, bytes32 pairId, uint8 orderType, uint256 amount, uint256 price, uint256 timestamp, uint8 status)",
  
  // Token pair management
  "function addTokenPair(address tokenA, address tokenB) external returns (bytes32 pairId)",
  "function getTokenPair(bytes32 pairId) external view returns (address tokenA, address tokenB, bool isActive)",
  "function getTokenPairs() external view returns (bytes32[] memory)",
  
  // Events
  "event BatchStarted(uint256 indexed batchId, uint256 deadline)",
  "event BatchSettled(uint256 indexed batchId, bytes32 indexed pairId, uint256 clearingPrice)",
  "event OrderPlaced(bytes32 indexed orderId, address indexed trader, bytes32 indexed pairId, uint8 orderType, uint256 publicPrice)",
  "event OrderCancelled(bytes32 indexed orderId, address indexed trader)",
  "event OrderFilled(bytes32 indexed orderId, address indexed trader, uint256 clearingPrice)",
  "event OrderProcessed(bytes32 indexed orderId, bool success)",
  "event TokenPairAdded(bytes32 indexed pairId, address tokenA, address tokenB)"
];

export const EERC20_ABI = [
  // Safe parameter handling for EERC20 token functions
  "function transferEncrypted(address to, bytes calldata encryptedAmount, bytes calldata zkProof) external returns (bool)",
  "function balanceOf(address account) external view returns (bytes memory)",
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function decimals() external view returns (uint8)",
  
  // Approval functions
  "function approve(address spender, bytes calldata encryptedAmount, bytes calldata proof) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (bytes memory)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, bytes encryptedAmount)",
  "event Approval(address indexed owner, address indexed spender, bytes encryptedAmount)"
];

export const DEXFactory_ABI = [
  // DEX factory functions with safe parameter validation
  "function deployDEX(uint256 batchDuration, string memory name) external returns (address)",
  "function getDeployedDEXs() external view returns (bytes32[] memory)",
  "function getDeployedDEXAddress(bytes32 dexId) external view returns (address)",
  
  // ZK verifier management
  "function setZKVerifier(address newVerifier) external",
  "function getZKVerifier() external view returns (address)",
  
  // Events
  "event DEXDeployed(bytes32 indexed dexId, address indexed dexAddress, address indexed deployer)",
  "event ZKVerifierUpdated(address indexed newVerifier)"
];

export default {
  BatchAuctionDEX_ABI,
  EERC20_ABI,
  DEXFactory_ABI
};
