/**
 * @fileoverview Tests for the zkUtils integration with eerc20 cryptography
 */

const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const { ethers } = require("ethers");
const zkUtils = require("../../src/solver/zkUtils");

describe("zkUtils", function () {
  // Test values
  const testValues = {
    privateKey: 123456789n,
    amount: 10000n,
    trader: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  };

  describe("Key Derivation", function () {
    it("Should derive a public key from a private key", function () {
      const publicKey = zkUtils.derivePublicKey(testValues.privateKey);
      
      // Public key should be an array with two BigInt values (point on BabyJubJub curve)
      expect(Array.isArray(publicKey)).to.equal(true);
      expect(publicKey.length).to.equal(2);
      expect(typeof publicKey[0]).to.equal("bigint");
      expect(typeof publicKey[1]).to.equal("bigint");
    });

    it("Should derive consistent public keys for the same private key", function () {
      const publicKey1 = zkUtils.derivePublicKey(testValues.privateKey);
      const publicKey2 = zkUtils.derivePublicKey(testValues.privateKey);
      
      expect(publicKey1[0]).to.equal(publicKey2[0]);
      expect(publicKey1[1]).to.equal(publicKey2[1]);
    });
  });

  describe("Encryption and Decryption", function () {
    it("Should encrypt and decrypt values correctly", function () {
      const privateKey = testValues.privateKey;
      const publicKey = zkUtils.derivePublicKey(privateKey);
      const amount = testValues.amount;
      
      // Encrypt the amount
      const encrypted = zkUtils.encryptAmount(publicKey, amount);
      
      // Ensure the result contains cipher and randomness
      expect(encrypted).to.have.property("cipher");
      expect(encrypted).to.have.property("randomness");
      
      // Decrypt the amount
      const decrypted = zkUtils.decryptAmount(privateKey, encrypted.cipher);
      
      // The decrypted value should match the original
      expect(decrypted).to.equal(amount);
    });

    it("Should serialize encrypted amounts for blockchain storage", function () {
      const privateKey = testValues.privateKey;
      const publicKey = zkUtils.derivePublicKey(privateKey);
      const amount = testValues.amount;
      
      // Encrypt the amount
      const encrypted = zkUtils.encryptAmount(publicKey, amount);
      
      // Serialize for blockchain
      const serialized = zkUtils.serializeEncryptedAmount(encrypted.cipher);
      
      // Expect a byte array of appropriate size
      expect(serialized).to.be.an.instanceof(Uint8Array);
      expect(serialized.length).to.be.at.least(32); // Should have reasonable length
    });
  });

  describe("Proof Generation", function () {
    it("Should generate transfer proofs", function () {
      const senderPrivateKey = testValues.privateKey;
      const senderPublicKey = zkUtils.derivePublicKey(senderPrivateKey);
      
      // Create a recipient
      const recipientPrivateKey = 987654321n;
      const recipientPublicKey = zkUtils.derivePublicKey(recipientPrivateKey);
      
      // Generate a transfer proof
      const proof = zkUtils.generateTransferProof({
        amount: testValues.amount,
        senderPublicKey,
        senderPrivateKey,
        recipientPublicKey,
        senderBalance: {
          cipher: zkUtils.encryptAmount(senderPublicKey, 50000n).cipher
        }
      });
      
      // Expect a valid proof structure
      expect(proof).to.have.property("proof");
      expect(proof.proof).to.be.an.instanceof(Uint8Array);
      expect(proof.proof.length).to.be.at.least(32);
    });

    it("Should generate balance proofs", function () {
      const privateKey = testValues.privateKey;
      const publicKey = zkUtils.derivePublicKey(privateKey);
      
      // Encrypt a balance
      const encryptedBalance = zkUtils.encryptAmount(publicKey, 50000n);
      
      // Generate a balance proof
      const proof = zkUtils.generateBalanceProof({
        amount: testValues.amount,
        publicKey,
        privateKey,
        encryptedBalance: encryptedBalance.cipher
      });
      
      // Expect a valid proof
      expect(proof).to.be.an.instanceof(Uint8Array);
      expect(proof.length).to.be.at.least(32);
    });

    it("Should generate settlement proofs", function () {
      // Create mock orders and fill amounts
      const orders = [
        {
          id: "order1",
          trader: testValues.trader,
          pairId: ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH")),
          orderType: 0, // BUY
          encryptedAmount: zkUtils.encryptAmount(
            zkUtils.derivePublicKey(testValues.privateKey), 
            40000n
          ).cipher
        },
        {
          id: "order2",
          trader: testValues.trader,
          pairId: ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH")),
          orderType: 1, // SELL
          encryptedAmount: zkUtils.encryptAmount(
            zkUtils.derivePublicKey(testValues.privateKey), 
            20000n
          ).cipher
        }
      ];
      
      const fillAmounts = [
        { orderId: "order1", amount: 10000n, orderType: 0 },
        { orderId: "order2", amount: 5000n, orderType: 1 }
      ];
      
      // Generate settlement proof
      const { proof, encryptedFillAmounts } = zkUtils.generateSettlementProof(
        ethers.keccak256(ethers.toUtf8Bytes("BTC-ETH")),
        ethers.parseEther("2"), // clearingPrice
        ["order1", "order2"],
        orders,
        fillAmounts
      );
      
      // Expect valid proof and encrypted fill amounts
      expect(proof).to.be.an.instanceof(Uint8Array);
      expect(encryptedFillAmounts).to.be.an("array");
      expect(encryptedFillAmounts.length).to.equal(2);
    });
  });

  describe("Circuit Integration", function () {
    it("Should call ZK circuits with proper parameters", function () {
      const circuitType = "transfer";
      const input = {
        amount: testValues.amount.toString(),
        sender: testValues.trader,
        recipient: "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
      };
      
      // Call the circuit
      const proof = zkUtils.callZKCircuit(circuitType, input);
      
      // Expect a valid proof
      expect(proof).to.be.an.instanceof(Uint8Array);
      expect(proof.length).to.be.at.least(32);
    });

    it("Should handle circuit failures gracefully", function () {
      // Call with invalid parameters
      const proof = zkUtils.callZKCircuit("invalid-circuit", {});
      
      // Should return empty array, not throw
      expect(proof).to.be.an.instanceof(Uint8Array);
      expect(proof.length).to.equal(0);
    });

    it("Should generate local proofs when circuit is unavailable", function () {
      const circuitType = "settlement";
      const input = { test: "data" };
      
      // Force local proof generation
      const proof = zkUtils.generateLocalProof(circuitType, input);
      
      // Expect a valid proof structure
      expect(proof).to.be.an.instanceof(Uint8Array);
      expect(proof.length).to.be.at.least(32);
    });
  });

  describe("Public Key Management", function () {
    it("Should extract public key from order metadata", function () {
      // Create an order with embedded public key
      const privateKey = testValues.privateKey;
      const expectedPublicKey = zkUtils.derivePublicKey(privateKey);
      
      const order = {
        id: "orderWithKey",
        trader: testValues.trader,
        publicKey: JSON.stringify(expectedPublicKey)
      };
      
      // Extract the public key
      const extractedKey = zkUtils.getPublicKeyFromOrder(order);
      
      // Expect matching public key
      expect(extractedKey[0]).to.equal(expectedPublicKey[0]);
      expect(extractedKey[1]).to.equal(expectedPublicKey[1]);
    });

    it("Should derive public key when not present in order", function () {
      // Create an order without public key
      const order = {
        id: "orderWithoutKey",
        trader: testValues.trader
      };
      
      // Extract the public key (will be derived)
      const derivedKey = zkUtils.getPublicKeyFromOrder(order);
      
      // Expect a valid public key
      expect(Array.isArray(derivedKey)).to.equal(true);
      expect(derivedKey.length).to.equal(2);
      expect(typeof derivedKey[0]).to.equal("bigint");
      expect(typeof derivedKey[1]).to.equal("bigint");
    });
  });

  describe("Error Handling", function () {
    it("Should handle encryption errors gracefully", function () {
      // Try to encrypt with invalid public key
      const result = zkUtils.encryptAmount([0n, 0n], 1000n);
      
      // Should not throw and return a default value
      expect(result).to.have.property("cipher");
    });

    it("Should handle decryption errors gracefully", function () {
      // Try to decrypt with invalid inputs
      const result = zkUtils.decryptAmount(0n, [0n, 0n]);
      
      // Should not throw and return a default value
      expect(result).to.equal(0n);
    });
  });
});
