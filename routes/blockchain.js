const express = require('express');
const Web3 = require('web3');
const contract = require('@truffle/contract');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Initialize Web3 connection to Ganache
const web3 = new Web3(process.env.GANACHE_URL || 'http://127.0.0.1:9545');

// Contract variables
let identityManagerContract;
let accounts;
let networkId;

/**
 * Initialize blockchain connection and load contract
 */
const initializeBlockchain = async () => {
    try {
        // Get network ID
        networkId = await web3.eth.net.getId();
        console.log('Connected to network ID:', networkId);

        // Get accounts from Ganache
        accounts = await web3.eth.getAccounts();
        console.log('Available accounts:', accounts.length);

        // Load contract artifact
        const contractPath = path.join(__dirname, '../build/contracts/IdentityManager.json');
        
        if (!fs.existsSync(contractPath)) {
            throw new Error('Contract artifact not found. Run "truffle compile" first.');
        }

        const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        
        // Create contract instance
        const IdentityManager = contract(contractArtifact);
        IdentityManager.setProvider(web3.currentProvider);

        // Get deployed contract instance
        identityManagerContract = await IdentityManager.deployed();
        console.log('IdentityManager contract loaded at:', identityManagerContract.address);

        return true;
    } catch (error) {
        console.error('Blockchain initialization error:', error.message);
        return false;
    }
};

/**
 * Hash Aadhaar number for privacy
 * @param {string} aadhaar - Aadhaar number
 * @returns {string} - Hashed Aadhaar
 */
const hashAadhaar = (aadhaar) => {
    return crypto.createHash('sha256').update(aadhaar.toString()).digest('hex');
};

/**
 * Validate Aadhaar number format (12 digits)
 * @param {string} aadhaar - Aadhaar number
 * @returns {boolean} - Validation result
 */
const validateAadhaar = (aadhaar) => {
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(aadhaar);
};

/**
 * Validate Ethereum address format
 * @param {string} address - Ethereum address
 * @returns {boolean} - Validation result
 */
const validateEthereumAddress = (address) => {
    return web3.utils.isAddress(address);
};

/**
 * Register a new user on the blockchain
 * POST /api/blockchain/register
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, aadhaar, ethereumAddress } = req.body;

        // Validate required fields
        if (!name || !email || !aadhaar || !ethereumAddress) {
            return res.status(400).json({
                error: 'All fields are required: name, email, aadhaar, ethereumAddress'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Validate Aadhaar format
        if (!validateAadhaar(aadhaar)) {
            return res.status(400).json({
                error: 'Invalid Aadhaar format. Must be 12 digits.'
            });
        }

        // Validate Ethereum address
        if (!validateEthereumAddress(ethereumAddress)) {
            return res.status(400).json({
                error: 'Invalid Ethereum address format'
            });
        }

        // Check if contract is initialized
        if (!identityManagerContract) {
            return res.status(500).json({
                error: 'Blockchain connection not initialized'
            });
        }

        // Check if user already exists
        try {
            const existingUser = await identityManagerContract.getUser(ethereumAddress);
            if (existingUser[1] !== '') { // Check if email is not empty
                return res.status(400).json({
                    error: 'User already registered with this Ethereum address'
                });
            }
        } catch (error) {
            // User doesn't exist, which is expected for new registrations
            console.log('User not found (expected for new registration)');
        }

        // Hash the Aadhaar number for privacy
        const hashedAadhaar = hashAadhaar(aadhaar);

        // Register user on blockchain
        const gasEstimate = await identityManagerContract.registerUser.estimateGas(
            name,
            email,
            hashedAadhaar,
            ethereumAddress,
            { from: accounts[0] }
        );

        const transaction = await identityManagerContract.registerUser(
            name,
            email,
            hashedAadhaar,
            ethereumAddress,
            {
                from: accounts[0],
                gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
                gasPrice: web3.utils.toWei('20', 'gwei')
            }
        );

        // Get user count after registration
        const userCount = await identityManagerContract.getUserCount();

        res.json({
            success: true,
            message: 'User registered successfully on blockchain',
            data: {
                transactionHash: transaction.tx,
                blockNumber: transaction.receipt.blockNumber,
                gasUsed: transaction.receipt.gasUsed,
                userCount: userCount.toString(),
                user: {
                    name: name,
                    email: email,
                    ethereumAddress: ethereumAddress,
                    hashedAadhaar: hashedAadhaar
                }
            }
        });

    } catch (error) {
        console.error('Blockchain registration error:', error);
        
        // Handle specific blockchain errors
        if (error.message.includes('revert')) {
            return res.status(400).json({
                error: 'Transaction reverted: ' + error.message
            });
        }
        
        if (error.message.includes('insufficient funds')) {
            return res.status(400).json({
                error: 'Insufficient funds for transaction'
            });
        }

        res.status(500).json({
            error: 'Failed to register user on blockchain'
        });
    }
});

/**
 * Retrieve user information from blockchain
 * GET /api/blockchain/user/:address
 */
router.get('/user/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Validate Ethereum address
        if (!validateEthereumAddress(address)) {
            return res.status(400).json({
                error: 'Invalid Ethereum address format'
            });
        }

        // Check if contract is initialized
        if (!identityManagerContract) {
            return res.status(500).json({
                error: 'Blockchain connection not initialized'
            });
        }

        // Get user from blockchain
        const userData = await identityManagerContract.getUser(address);
        
        // Check if user exists
        if (userData[1] === '') { // Check if email is empty
            return res.status(404).json({
                error: 'User not found on blockchain'
            });
        }

        res.json({
            success: true,
            data: {
                name: userData[0],
                email: userData[1],
                hashedAadhaar: userData[2],
                ethereumAddress: userData[3],
                isActive: userData[4]
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Failed to retrieve user from blockchain'
        });
    }
});

/**
 * Get all registered users (for admin purposes)
 * GET /api/blockchain/users
 */
router.get('/users', async (req, res) => {
    try {
        // Check if contract is initialized
        if (!identityManagerContract) {
            return res.status(500).json({
                error: 'Blockchain connection not initialized'
            });
        }

        // Get total user count
        const userCount = await identityManagerContract.getUserCount();
        const count = parseInt(userCount.toString());

        const users = [];

        // Get all users (Note: This is for demo purposes. In production, implement pagination)
        for (let i = 0; i < count && i < 100; i++) { // Limit to 100 users for demo
            try {
                const userAddress = await identityManagerContract.userAddresses(i);
                const userData = await identityManagerContract.getUser(userAddress);
                
                users.push({
                    name: userData[0],
                    email: userData[1],
                    hashedAadhaar: userData[2],
                    ethereumAddress: userData[3],
                    isActive: userData[4]
                });
            } catch (error) {
                console.error(`Error fetching user at index ${i}:`, error);
            }
        }

        res.json({
            success: true,
            data: {
                totalUsers: count,
                users: users,
                showing: users.length
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            error: 'Failed to retrieve users from blockchain'
        });
    }
});

/**
 * Verify user by Aadhaar hash
 * POST /api/blockchain/verify-aadhaar
 */
router.post('/verify-aadhaar', async (req, res) => {
    try {
        const { aadhaar, ethereumAddress } = req.body;

        // Validate required fields
        if (!aadhaar || !ethereumAddress) {
            return res.status(400).json({
                error: 'Aadhaar and Ethereum address are required'
            });
        }

        // Validate Aadhaar format
        if (!validateAadhaar(aadhaar)) {
            return res.status(400).json({
                error: 'Invalid Aadhaar format. Must be 12 digits.'
            });
        }

        // Validate Ethereum address
        if (!validateEthereumAddress(ethereumAddress)) {
            return res.status(400).json({
                error: 'Invalid Ethereum address format'
            });
        }

        // Check if contract is initialized
        if (!identityManagerContract) {
            return res.status(500).json({
                error: 'Blockchain connection not initialized'
            });
        }

        // Get user from blockchain
        const userData = await identityManagerContract.getUser(ethereumAddress);
        
        // Check if user exists
        if (userData[1] === '') {
            return res.status(404).json({
                error: 'User not found on blockchain'
            });
        }

        // Hash the provided Aadhaar and compare
        const hashedAadhaar = hashAadhaar(aadhaar);
        const storedHashedAadhaar = userData[2];

        const isValid = hashedAadhaar === storedHashedAadhaar;

        res.json({
            success: true,
            data: {
                isValid: isValid,
                message: isValid ? 'Aadhaar verification successful' : 'Aadhaar verification failed'
            }
        });

    } catch (error) {
        console.error('Aadhaar verification error:', error);
        res.status(500).json({
            error: 'Failed to verify Aadhaar'
        });
    }
});

/**
 * Get blockchain network information
 * GET /api/blockchain/network-info
 */
router.get('/network-info', async (req, res) => {
    try {
        const networkId = await web3.eth.net.getId();
        const blockNumber = await web3.eth.getBlockNumber();
        const accounts = await web3.eth.getAccounts();
        
        let contractInfo = null;
        if (identityManagerContract) {
            const userCount = await identityManagerContract.getUserCount();
            contractInfo = {
                address: identityManagerContract.address,
                userCount: userCount.toString()
            };
        }

        res.json({
            success: true,
            data: {
                networkId: networkId,
                blockNumber: blockNumber,
                availableAccounts: accounts.length,
                ganacheUrl: process.env.GANACHE_URL || 'http://127.0.0.1:9545',
                contract: contractInfo
            }
        });

    } catch (error) {
        console.error('Network info error:', error);
        res.status(500).json({
            error: 'Failed to get network information'
        });
    }
});

/**
 * Health check for blockchain connection
 * GET /api/blockchain/health
 */
router.get('/health', async (req, res) => {
    try {
        const isConnected = await web3.eth.net.isListening();
        const contractLoaded = !!identityManagerContract;

        res.json({
            success: true,
            data: {
                web3Connected: isConnected,
                contractLoaded: contractLoaded,
                ganacheUrl: process.env.GANACHE_URL || 'http://127.0.0.1:9545',
                status: isConnected && contractLoaded ? 'healthy' : 'unhealthy'
            }
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            error: 'Blockchain connection unhealthy'
        });
    }
});

// Initialize blockchain connection when module loads
initializeBlockchain().then((success) => {
    if (success) {
        console.log('✅ Blockchain connection initialized successfully');
    } else {
        console.log('❌ Failed to initialize blockchain connection');
    }
});

// Middleware to check if blockchain is initialized
const checkBlockchainConnection = (req, res, next) => {
    if (!identityManagerContract) {
        return res.status(500).json({
            error: 'Blockchain connection not initialized. Please check Ganache and contract deployment.'
        });
    }
    next();
};

// Apply middleware to routes that need blockchain connection (except health check)
router.use('/register', checkBlockchainConnection);
router.use('/user*', checkBlockchainConnection);
router.use('/users', checkBlockchainConnection);
router.use('/verify-aadhaar', checkBlockchainConnection);
router.use('/network-info', checkBlockchainConnection);

module.exports = router;