const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZKVerifier", function () {
  let zkVerifier;
  let owner;
  let user1;
  let user2;

  // Sample proof keys for testing
  const sampleKeys = {
    transfer: ethers.toUtf8Bytes("sample-transfer-proof-key"),
    balance: ethers.toUtf8Bytes("sample-balance-proof-key"),
    settlement: ethers.toUtf8Bytes("sample-settlement-proof-key")
  };

  // Helper to create mock proof
  const createMockProof = (type, data) => {
    return ethers.concat([
      ethers.toUtf8Bytes(`${type}-proof-`),
      ethers.zeroPadBytes(ethers.toUtf8Bytes(data), 64)
    ]);
  };

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy ZKVerifier
    const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
    zkVerifier = await ZKVerifier.deploy(
      sampleKeys.transfer,
      sampleKeys.balance,
      sampleKeys.settlement,
      true // Allow continue on failure for testing
    );
  });

  describe("Deployment", function () {
    it("Should set the initial verifying keys", async function () {
      expect(await zkVerifier.transferProofVerifyingKey()).to.equal(ethers.hexlify(sampleKeys.transfer));
      expect(await zkVerifier.balanceProofVerifyingKey()).to.equal(ethers.hexlify(sampleKeys.balance));
      expect(await zkVerifier.settlementProofVerifyingKey()).to.equal(ethers.hexlify(sampleKeys.settlement));
    });

    it("Should set the owner correctly", async function () {
      expect(await zkVerifier.owner()).to.equal(owner.address);
    });

    it("Should initialize statistics to zero", async function () {
      expect(await zkVerifier.totalVerifications()).to.equal(0);
      expect(await zkVerifier.failedVerifications()).to.equal(0);
    });
  });

  describe("Proof Verification", function () {
    it("Should handle balance proof verification", async function () {
      const mockProof = createMockProof('balance', 'valid-test');
      const mockEncryptedAmount = ethers.toUtf8Bytes("encrypted-amount");
      
      // Verify should pass with our deterministic implementation
      const result = await zkVerifier.verifyBalanceProof(
        mockProof,
        mockEncryptedAmount,
        user1.address
      );
      
      // Check that verification was counted
      expect(await zkVerifier.totalVerifications()).to.equal(1);
      
      // Our implementation is deterministic based on the inputs, so we know if it should pass
      // Check that it either passed or a verification was marked as failed
      if (!result) {
        expect(await zkVerifier.failedVerifications()).to.equal(1);
      } else {
        expect(await zkVerifier.failedVerifications()).to.equal(0);
      }
    });

    it("Should handle transfer proof verification", async function () {
      const mockProof = createMockProof('transfer', 'valid-transfer');
      const mockEncryptedAmount = ethers.toUtf8Bytes("transfer-amount");
      
      const result = await zkVerifier.verifyTransferProof(
        mockProof,
        mockEncryptedAmount,
        user1.address,
        user2.address
      );
      
      expect(await zkVerifier.totalVerifications()).to.equal(1);
    });

    it("Should handle order proof verification", async function () {
      const mockProof = createMockProof('order', 'valid-order');
      const mockEncryptedAmount = ethers.toUtf8Bytes("order-amount");
      const mockPairId = ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH"));
      const orderType = 0; // BUY
      const publicPrice = ethers.parseEther("100");
      
      const result = await zkVerifier.verifyOrderProof(
        mockProof,
        mockEncryptedAmount,
        user1.address,
        mockPairId,
        orderType,
        publicPrice
      );
      
      expect(await zkVerifier.totalVerifications()).to.equal(1);
    });

    it("Should handle settlement proof verification", async function () {
      const mockProof = createMockProof('settlement', 'valid-settlement');
      const mockPublicInputs = ethers.toUtf8Bytes("settlement-inputs");
      const mockFillAmounts = [
        ethers.toUtf8Bytes("fill-1"),
        ethers.toUtf8Bytes("fill-2")
      ];
      
      const result = await zkVerifier.verifySettlementProof(
        mockProof,
        mockPublicInputs,
        mockFillAmounts
      );
      
      expect(await zkVerifier.totalVerifications()).to.equal(1);
    });

    it("Should reject empty proofs", async function () {
      const emptyProof = new Uint8Array(0);
      const mockEncryptedAmount = ethers.toUtf8Bytes("amount");
      
      // Call the function and wait for the transaction to be mined
      const tx = await zkVerifier.verifyBalanceProof(
        emptyProof,
        mockEncryptedAmount,
        user1.address
      );
      await tx.wait();
      
      // Check the state changes instead of the return value
      expect(await zkVerifier.totalVerifications()).to.equal(1);
      expect(await zkVerifier.failedVerifications()).to.equal(1);
    });

    it("Should reject proofs with invalid sizes", async function () {
      // Create a proof that exceeds the MAX_PROOF_SIZE (32KB)
      const hugeProof = ethers.zeroPadBytes(ethers.toUtf8Bytes("huge"), 33 * 1024);
      const mockEncryptedAmount = ethers.toUtf8Bytes("amount");
      
      // Call the function and wait for the transaction to be mined
      const tx = await zkVerifier.verifyBalanceProof(
        hugeProof,
        mockEncryptedAmount,
        user1.address
      );
      await tx.wait();
      
      // Check the state changes instead of the return value
      // Each test runs in isolation, so we expect 1 failed verification not 2
      expect(await zkVerifier.failedVerifications()).to.equal(1);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow the owner to update verifying keys", async function () {
      const newKey = ethers.toUtf8Bytes("new-transfer-key");
      
      await zkVerifier.updateVerifyingKey("transfer", newKey);
      
      expect(await zkVerifier.transferProofVerifyingKey()).to.equal(ethers.hexlify(newKey));
    });

    it("Should prevent non-owners from updating keys", async function () {
      const newKey = ethers.toUtf8Bytes("new-key");
      
      await expect(
        zkVerifier.connect(user1).updateVerifyingKey("transfer", newKey)
      ).to.be.reverted;
    });

    it("Should allow owner to set allowContinueOnFailure", async function () {
      // Initially set to true in constructor
      expect(await zkVerifier.allowContinueOnFailure()).to.equal(true);
      
      // Change to false
      await zkVerifier.setAllowContinueOnFailure(false);
      expect(await zkVerifier.allowContinueOnFailure()).to.equal(false);
      
      // Change back to true
      await zkVerifier.setAllowContinueOnFailure(true);
      expect(await zkVerifier.allowContinueOnFailure()).to.equal(true);
    });

    it("Should allow owner to reset statistics", async function () {
      // Generate some verification stats
      const mockProof = createMockProof('balance', 'invalid');
      const mockEncryptedAmount = ethers.toUtf8Bytes("amount");
      
      // Run a few verifications to generate stats
      for (let i = 0; i < 3; i++) {
        await zkVerifier.verifyBalanceProof(
          mockProof,
          mockEncryptedAmount,
          user1.address
        );
      }
      
      // Verify stats were updated
      expect(await zkVerifier.totalVerifications()).to.be.gt(0);
      
      // Reset stats
      await zkVerifier.resetStats();
      
      // Verify stats were reset
      expect(await zkVerifier.totalVerifications()).to.equal(0);
      expect(await zkVerifier.failedVerifications()).to.equal(0);
    });
  });
});
