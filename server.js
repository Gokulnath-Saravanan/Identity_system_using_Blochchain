const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/blockchain');

const blockchainRoutes = require('./routes/blockchain');
app.use('/api/transaction',transactionRoutes);

const PORT = process.env.PORT || 3000;
const nodemailer = require('nodemailer');

app.use('/api/auth', authRoutes);
// Middleware
app.use(cors({
    origin: process.env.ORIGIN || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Contract ABI endpoint for frontend
app.get('/api/contract-abi', (req, res) => {
    try {
        const contractPath = path.join(__dirname, 'build/contracts/IdentityManager.json');
        
        if (fs.existsSync(contractPath)) {
            const contractArtifact = JSON.parse(fs.readFileSync(contractPath));
            res.json({
                success: true,
                abi: contractArtifact.abi,
                networks: contractArtifact.networks
            });
        } else {
            res.status(404).json({
                error: 'Contract artifact not found. Please run: truffle compile && truffle migrate'
            });
        }
    } catch (error) {
        console.error('Error reading contract ABI:', error);
        res.status(500).json({
            error: 'Failed to read contract ABI'
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found'
    });
});

// Serve the main app for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                🌐 Decentralized Identity System                 ║
╠════════════════════════════════════════════════════════════════╣
║ Server running on: http://localhost:${PORT}                        ║
║ Environment: ${process.env.NODE_ENV || 'development'.padEnd(7)}                              ║
║ Ganache URL: ${(process.env.GANACHE_URL || 'http://127.0.0.1:9545').padEnd(27)} ║
║                                                                ║
║ Available endpoints:                                           ║
║ • Frontend: http://localhost:${PORT}                             ║
║ • API Health: http://localhost:${PORT}/api/health                ║
║ • Contract ABI: http://localhost:${PORT}/api/contract-abi        ║
║                                                                ║
║ Make sure Ganache is running on port 9545                     ║
║ Run 'truffle migrate --reset' if contracts are not deployed   ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    // Check if build directory exists
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
        console.log('\n⚠️  WARNING: Contract build directory not found!');
        console.log('Please run: npm run buildandrun');
        console.log('Or manually: truffle compile && truffle migrate --reset\n');
    }
});

module.exports = app;