const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BatchAuctionDEX", function () {
  let dexFactory;
  let batchAuctionDEX;
  let zkVerifier;
  let owner;
  let trader1;
  let trader2;
  let mockEERC20A;
  let mockEERC20B;

  const BATCH_DURATION = 300; // 5 minutes
  const DEX_NAME = "Test-DEX";

  // Helper to create mock encrypted data that mimics eerc20 encryption
  const createMockEncryptedData = (value) => {
    // Create a structured format that simulates eerc20 encryption
    // This follows the pattern expected by our production implementation
    const encodedValue = ethers.toUtf8Bytes(`${value}`);
    
    // Ensure the encrypted data has a reasonable size to pass parameter validation
    // (Based on our memory about parameter handling)
    return ethers.zeroPadBytes(encodedValue, 64);
  };

  // Helper to create mock ZK proof that follows the proper structure
  const createMockZKProof = (type, data, address) => {
    // Create a structured proof that mimics the real zkSNARK proof format
    // This ensures compatibility with our production ZKVerifier implementation
    const addressBytes = address ? ethers.getBytes(address) : ethers.randomBytes(20);
    const dataBytes = ethers.toUtf8Bytes(data);
    
    // Create a proof structure that follows the expected format with a, b, c components
    const input = ethers.concat([addressBytes, dataBytes]);
    const hash = ethers.keccak256(input);
    
    // Structure mimicking a zkSNARK proof
    const a = [hash.slice(0, 32), hash.slice(32, 64)];
    const b = [[hash.slice(0, 32), hash.slice(32, 64)], [hash.slice(32, 64), hash.slice(0, 32)]];
    const c = [hash.slice(0, 32), hash.slice(32, 64)];
    
    // Serialize the proof structure
    const proofObj = { a, b, c, type, timestamp: Date.now() };
    const proofBytes = ethers.toUtf8Bytes(JSON.stringify(proofObj));
    
    // Prefix with type for deterministic verification in our production implementation
    return ethers.concat([ethers.toUtf8Bytes(type), proofBytes]);
  };

  beforeEach(async function () {
    // Get signers
    [owner, trader1, trader2] = await ethers.getSigners();

    // Deploy mock EERC20 tokens
    const MockEERC20 = await ethers.getContractFactory("MockEERC20");
    mockEERC20A = await MockEERC20.deploy("Mock EERC20 A", "MEERCA");
    mockEERC20B = await MockEERC20.deploy("Mock EERC20 B", "MEERCB");

    // Sample proof keys for testing
    const sampleKeys = {
      transfer: ethers.toUtf8Bytes("sample-transfer-proof-key"),
      balance: ethers.toUtf8Bytes("sample-balance-proof-key"),
      settlement: ethers.toUtf8Bytes("sample-settlement-proof-key")
    };

    // Deploy ZKVerifier first
    const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
    zkVerifier = await ZKVerifier.deploy(
      sampleKeys.transfer,
      sampleKeys.balance,
      sampleKeys.settlement,
      true // Allow continue on failure for testing
    );

    // Deploy DEX factory with ZKVerifier keys
    const DEXFactory = await ethers.getContractFactory("DEXFactory");
    dexFactory = await DEXFactory.deploy(
      sampleKeys.transfer,
      sampleKeys.balance,
      sampleKeys.settlement,
      true // Allow continue on failure for testing
    );

    // Deploy a BatchAuctionDEX through the factory
    const deployTx = await dexFactory.deployDEX(BATCH_DURATION, DEX_NAME);
    const deployReceipt = await deployTx.wait();
    
    // Extract DEX address from events
    let dexAddress;
    for (const log of deployReceipt.logs) {
      try {
        const parsedLog = dexFactory.interface.parseLog({
          topics: [...log.topics],
          data: log.data
        });
        
        if (parsedLog && parsedLog.name === "DEXDeployed") {
          dexAddress = parsedLog.args[1]; // dexAddress is the second arg
          break;
        }
      } catch (e) {
        // Not the event we're looking for
        continue;
      }
    }
    
    // Get BatchAuctionDEX instance
    batchAuctionDEX = await ethers.getContractAt("BatchAuctionDEX", dexAddress);
    
    // Get ZKVerifier from DEXFactory
    const zkVerifierAddress = await dexFactory.zkVerifier();
    zkVerifier = await ethers.getContractAt("ZKVerifier", zkVerifierAddress);
  });

  describe("Basic DEX functionality", function () {
    it("Should have the correct batch duration", async function () {
      const [batchId, batchDeadline, duration] = await batchAuctionDEX.getBatchInfo();
      expect(duration).to.equal(BATCH_DURATION);
      expect(batchId).to.equal(1);
    });

    it("Should allow adding a token pair", async function () {
      await batchAuctionDEX.addTokenPair(
        await mockEERC20A.getAddress(),
        await mockEERC20B.getAddress(),
        true,
        true
      );

      // Calculate expected pair ID
      const pairId = ethers.keccak256(
        ethers.concat([
          await mockEERC20A.getAddress(),
          await mockEERC20B.getAddress()
        ])
      );

      // Get all token pairs
      const tokenPairs = await batchAuctionDEX.getAllTokenPairs();
      expect(tokenPairs.length).to.equal(1);
      expect(tokenPairs[0]).to.equal(pairId);

      // Verify pair information
      const pair = await batchAuctionDEX.getTokenPair(pairId);
      expect(pair.tokenA).to.equal(await mockEERC20A.getAddress());
      expect(pair.tokenB).to.equal(await mockEERC20B.getAddress());
      expect(pair.isEERC20A).to.be.true;
      expect(pair.isEERC20B).to.be.true;
      expect(pair.exists).to.be.true;
    });
  });

  describe("Order placement and management", function () {
    let pairId;

    beforeEach(async function () {
      // Add token pair first
      await batchAuctionDEX.addTokenPair(
        await mockEERC20A.getAddress(),
        await mockEERC20B.getAddress(),
        true,
        true
      );

      // Calculate pair ID
      pairId = ethers.keccak256(
        ethers.concat([
          await mockEERC20A.getAddress(),
          await mockEERC20B.getAddress()
        ])
      );
    });

    it("Should allow placing orders", async function () {
      // Create sample order data
      const orderType = 0; // BUY
      const publicPrice = ethers.parseEther("1.5"); // 1.5 token B per token A
      const encryptedAmount = createMockEncryptedData("100");
      const zkProof = createMockZKProof("100", trader1.address);

      // Place order
      await batchAuctionDEX.connect(trader1).placeOrder(
        pairId,
        orderType,
        publicPrice,
        encryptedAmount,
        zkProof
      );

      // Get active orders for the pair
      const activeOrders = await batchAuctionDEX.getActiveOrders(pairId);
      expect(activeOrders.length).to.equal(1);

      // Verify order details
      const orderId = activeOrders[0];
      const order = await batchAuctionDEX.orders(orderId);
      expect(order.trader).to.equal(trader1.address);
      expect(order.pairId).to.equal(pairId);
      expect(order.orderType).to.equal(orderType);
      expect(order.publicPrice).to.equal(publicPrice);
      expect(order.status).to.equal(0); // PENDING
    });

    it("Should allow cancelling orders", async function () {
      // Place an order first
      const orderType = 1; // SELL
      const publicPrice = ethers.parseEther("2"); 
      const encryptedAmount = createMockEncryptedData("50");
      const zkProof = createMockZKProof("50", trader2.address);

      // Place order
      await batchAuctionDEX.connect(trader2).placeOrder(
        pairId,
        orderType,
        publicPrice,
        encryptedAmount,
        zkProof
      );

      // Get order ID
      const activeOrders = await batchAuctionDEX.getActiveOrders(pairId);
      const orderId = activeOrders[0];

      // Cancel the order
      await batchAuctionDEX.connect(trader2).cancelOrder(orderId);

      // Verify order status
      const order = await batchAuctionDEX.orders(orderId);
      expect(order.status).to.equal(3); // CANCELLED
    });
  });
});
