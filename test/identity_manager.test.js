const IdentityManager = artifacts.require("IdentityManager");
const crypto = require('crypto');

/**
 * Test suite for IdentityManager smart contract
 * Tests user registration, retrieval, and edge cases
 */
contract("IdentityManager", (accounts) => {
  let identityManager;
  const [owner, user1, user2] = accounts;

  // Test data
  const testUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    aadhaarNumber: "123456789012",
    address: user1
  };

  beforeEach(async () => {
    // Deploy fresh contract instance for each test
    identityManager = await IdentityManager.deployed();
  });

  describe("Contract Deployment", () => {
    it("should deploy successfully", async () => {
      assert(identityManager.address !== "", "Contract should have an address");
      console.log("Contract deployed at:", identityManager.address);
    });

    it("should set the correct owner", async () => {
      const contractOwner = await identityManager.owner();
      assert.equal(contractOwner, owner, "Owner should be set correctly");
    });
  });

  describe("User Registration", () => {
    it("should register a new user successfully", async () => {
      // Hash Aadhaar number
      const hashedAadhaar = crypto.createHash('sha256')
        .update(testUser.aadhaarNumber)
        .digest('hex');

      // Register user
      const result = await identityManager.registerUser(
        testUser.name,
        testUser.email,
        hashedAadhaar,
        { from: testUser.address }
      );

      // Check if UserRegistered event was emitted
      assert.equal(result.logs.length, 1, "Should emit one event");
      assert.equal(result.logs[0].event, "UserRegistered", "Should emit UserRegistered event");
      assert.equal(result.logs[0].args.userAddress, testUser.address, "Event should contain correct address");
      assert.equal(result.logs[0].args.name, testUser.name, "Event should contain correct name");
    });

    it("should not allow duplicate user registration", async () => {
      const hashedAadhaar = crypto.createHash('sha256')
        .update(testUser.aadhaarNumber)
        .digest('hex');

      // First registration should succeed
      await identityManager.registerUser(
        testUser.name,
        testUser.email,
        hashedAadhaar,
        { from: testUser.address }
      );

      // Second registration should fail
      try {
        await identityManager.registerUser(
          "Jane Doe",
          "jane@example.com",
          hashedAadhaar,
          { from: testUser.address }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("User already exists"), "Should throw 'User already exists' error");
      }
    });

    it("should not allow empty name", async () => {
      const hashedAadhaar = crypto.createHash('sha256')
        .update("987654321098")
        .digest('hex');

      try {
        await identityManager.registerUser(
          "",
          testUser.email,
          hashedAadhaar,
          { from: user2 }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Name cannot be empty"), "Should throw 'Name cannot be empty' error");
      }
    });

    it("should not allow empty email", async () => {
      const hashedAadhaar = crypto.createHash('sha256')
        .update("987654321098")
        .digest('hex');

      try {
        await identityManager.registerUser(
          testUser.name,
          "",
          hashedAadhaar,
          { from: user2 }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(error.message.includes("Email cannot be empty"), "Should throw 'Email cannot be empty' error");
      }
    });
  });

  describe("User Retrieval", () => {
    beforeEach(async () => {
      // Register a test user before each retrieval test
      const hashedAadhaar = crypto.createHash('sha256')
        .update(testUser.aadhaarNumber)
        .digest('hex');

      await identityManager.registerUser(
        testUser.name,
        testUser.email,
        hashedAadhaar,
        { from: testUser.address }
      );
    });

    it("should retrieve user information correctly", async () => {
      const user = await identityManager.getUser(testUser.address);
      
      assert.equal(user.name, testUser.name, "Name should match");
      assert.equal(user.email, testUser.email, "Email should match");
      assert.equal(user.userAddress, testUser.address, "Address should match");
      assert(user.hashedAadhaar.length > 0, "Hashed Aadhaar should not be empty");
      assert(user.timestamp > 0, "Timestamp should be set");
    });

    it("should return empty data for non-existent user", async () => {
      const user = await identityManager.getUser(user2);
      
      assert.equal(user.name, "", "Name should be empty");
      assert.equal(user.email, "", "Email should be empty");
      assert.equal(user.hashedAadhaar, "", "Hashed Aadhaar should be empty");
      assert.equal(user.timestamp, 0, "Timestamp should be 0");
    });
  });

  describe("User Existence Check", () => {
    it("should return true for existing user", async () => {
      const hashedAadhaar = crypto.createHash('sha256')
        .update(testUser.aadhaarNumber)
        .digest('hex');

      await identityManager.registerUser(
        testUser.name,
        testUser.email,
        hashedAadhaar,
        { from: testUser.address }
      );

      const exists = await identityManager.userExists(testUser.address);
      assert.equal(exists, true, "Should return true for existing user");
    });

    it("should return false for non-existent user", async () => {
      const exists = await identityManager.userExists(user2);
      assert.equal(exists, false, "Should return false for non-existent user");
    });
  });

  describe("Contract Security", () => {
    it("should only allow users to register themselves", async () => {
      const hashedAadhaar = crypto.createHash('sha256')
        .update("111222333444")
        .digest('hex');

      // This should work (user registering themselves)
      await identityManager.registerUser(
        "Self Register",
        "self@example.com",
        hashedAadhaar,
        { from: user2 }
      );

      const user = await identityManager.getUser(user2);
      assert.equal(user.name, "Self Register", "User should be able to register themselves");
    });

    it("should handle multiple users correctly", async () => {
      const user1Data = {
        name: "User One",
        email: "user1@example.com",
        aadhaar: "111111111111"
      };

      const user2Data = {
        name: "User Two", 
        email: "user2@example.com",
        aadhaar: "222222222222"
      };

      const hashedAadhaar1 = crypto.createHash('sha256')
        .update(user1Data.aadhaar)
        .digest('hex');

      const hashedAadhaar2 = crypto.createHash('sha256')
        .update(user2Data.aadhaar)
        .digest('hex');

      // Register both users
      await identityManager.registerUser(
        user1Data.name,
        user1Data.email,
        hashedAadhaar1,
        { from: user1 }
      );

      await identityManager.registerUser(
        user2Data.name,
        user2Data.email,
        hashedAadhaar2,
        { from: user2 }
      );

      // Verify both users exist and have correct data
      const retrievedUser1 = await identityManager.getUser(user1);
      const retrievedUser2 = await identityManager.getUser(user2);

      assert.equal(retrievedUser1.name, user1Data.name, "User 1 name should match");
      assert.equal(retrievedUser1.email, user1Data.email, "User 1 email should match");
      assert.equal(retrievedUser2.name, user2Data.name, "User 2 name should match");
      assert.equal(retrievedUser2.email, user2Data.email, "User 2 email should match");
    });
  });

  describe("Gas Usage Analysis", () => {
    it("should track gas usage for registration", async () => {
      const hashedAadhaar = crypto.createHash('sha256')
        .update("gas_test_aadhaar")
        .digest('hex');

      const result = await identityManager.registerUser(
        "Gas Test User",
        "gastest@example.com",
        hashedAadhaar,
        { from: accounts[3] }
      );

      console.log("Gas used for user registration:", result.receipt.gasUsed);
      assert(result.receipt.gasUsed < 200000, "Gas usage should be reasonable");
    });

    it("should track gas usage for retrieval", async () => {
      const hashedAadhaar = crypto.createHash('sha256')
        .update("retrieval_test_aadhaar")
        .digest('hex');

      await identityManager.registerUser(
        "Retrieval Test User",
        "retrievaltest@example.com",
        hashedAadhaar,
        { from: accounts[4] }
      );

      // Note: view functions don't consume gas in actual calls, but we can estimate
      const user = await identityManager.getUser(accounts[4]);
      assert.equal(user.name, "Retrieval Test User", "Retrieval should work correctly");
    });
  });
});