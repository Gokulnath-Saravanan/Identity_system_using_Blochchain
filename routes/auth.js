const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const WebAuthnUtils = require('../webauthn/webauthn-utils');
const { LocalStorage } = require('node-localstorage');

const router = express.Router();
const webauthn = new WebAuthnUtils();

// In-memory storage for WebAuthn credentials and challenges
// In production, use MongoDB or another persistent storage
const localStorage = new LocalStorage('./webauthn-storage'); 
const challenges = new Map(); // Store challenges temporarily

// Middleware to parse JSON
router.use(express.json());

/**
 * Verify JWT token middleware
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Cleanup expired challenges (called periodically)
 */
const cleanupExpiredChallenges = () => {
    const now = Date.now();
    for (const [key, data] of challenges.entries()) {
        if (now > data.expires) {
            challenges.delete(key);
        }
    }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredChallenges, 5 * 60 * 1000);

/**
 * Generate registration options for WebAuthn
 * POST /api/auth/register/begin
 */
router.post('/register/begin', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email || !name) {
            return res.status(400).json({ 
                error: 'Email and name are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        // Check if user already has WebAuthn credentials
        const existingCreds = localStorage.getItem(`webauthn_${email}`);
        if (existingCreds) {
            return res.status(400).json({ 
                error: 'User already has biometric credentials registered' 
            });
        }

        // Generate registration options
        const options = webauthn.generateRegistrationOptions(email, name);
        
        // Store challenge temporarily (expires in 5 minutes)
        const challengeKey = `challenge_${email}_${Date.now()}`;
        challenges.set(challengeKey, {
            challenge: options.challenge,
            email: email,
            name: name,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        // Send options to client
        res.json({
            success: true,
            options: options,
            challengeKey: challengeKey
        });

    } catch (error) {
        console.error('Registration begin error:', error);
        res.status(500).json({ 
            error: 'Failed to generate registration options' 
        });
    }
});

/**
 * Complete WebAuthn registration
 * POST /api/auth/register/complete
 */
router.post('/register/complete', async (req, res) => {
    try {
        const { credential, challengeKey } = req.body;
        
        if (!credential || !challengeKey) {
            return res.status(400).json({ 
                error: 'Credential and challenge key are required' 
            });
        }

        // Retrieve and validate challenge
        const challengeData = challenges.get(challengeKey);
        if (!challengeData) {
            return res.status(400).json({ 
                error: 'Invalid or expired challenge' 
            });
        }

        // Check if challenge expired
        if (Date.now() > challengeData.expires) {
            challenges.delete(challengeKey);
            return res.status(400).json({ 
                error: 'Challenge expired' 
            });
        }

        // Verify the registration credential
        const verification = webauthn.verifyRegistrationCredential(
            credential, 
            challengeData.challenge
        );

        if (!verification.verified) {
            challenges.delete(challengeKey);
            return res.status(400).json({ 
                error: verification.error || 'Registration verification failed' 
            });
        }

        // Store the credential
        const credentialData = {
            credentialId: verification.credentialId,
            publicKey: verification.publicKey,
            counter: verification.counter,
            email: challengeData.email,
            name: challengeData.name,
            registeredAt: new Date().toISOString()
        };

        localStorage.setItem(
            `webauthn_${challengeData.email}`, 
            JSON.stringify(credentialData)
        );

        // Clean up challenge
        challenges.delete(challengeKey);

        res.json({
            success: true,
            message: 'Biometric registration completed successfully'
        });

    } catch (error) {
        console.error('Registration complete error:', error);
        res.status(500).json({ 
            error: 'Failed to complete registration' 
        });
    }
});

/**
 * Generate authentication options for WebAuthn
 * POST /api/auth/login/begin
 */
router.post('/login/begin', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                error: 'Email is required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        // Check if user has registered credentials
        const credentialData = localStorage.getItem(`webauthn_${email}`);
        if (!credentialData) {
            return res.status(404).json({ 
                error: 'No biometric credentials found for this user' 
            });
        }

        const credential = JSON.parse(credentialData);
        
        // Generate authentication options
        const options = webauthn.generateAuthenticationOptions([
            credential.credentialId
        ]);
        
        // Store challenge temporarily
        const challengeKey = `auth_challenge_${email}_${Date.now()}`;
        challenges.set(challengeKey, {
            challenge: options.challenge,
            email: email,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        res.json({
            success: true,
            options: options,
            challengeKey: challengeKey
        });

    } catch (error) {
        console.error('Authentication begin error:', error);
        res.status(500).json({ 
            error: 'Failed to generate authentication options' 
        });
    }
});

/**
 * Complete WebAuthn authentication and issue JWT
 * POST /api/auth/login/complete
 */
router.post('/login/complete', async (req, res) => {
    try {
        const { credential, challengeKey } = req.body;
        
        if (!credential || !challengeKey) {
            return res.status(400).json({ 
                error: 'Credential and challenge key are required' 
            });
        }

        // Retrieve and validate challenge
        const challengeData = challenges.get(challengeKey);
        if (!challengeData) {
            return res.status(400).json({ 
                error: 'Invalid or expired challenge' 
            });
        }

        // Check if challenge expired
        if (Date.now() > challengeData.expires) {
            challenges.delete(challengeKey);
            return res.status(400).json({ 
                error: 'Challenge expired' 
            });
        }

        // Get stored credential
        const storedCredentialData = localStorage.getItem(`webauthn_${challengeData.email}`);
        if (!storedCredentialData) {
            challenges.delete(challengeKey);
            return res.status(404).json({ 
                error: 'Stored credential not found' 
            });
        }

        const storedCredential = JSON.parse(storedCredentialData);

        // Verify the authentication credential
        const verification = webauthn.verifyAuthenticationCredential(
            credential,
            challengeData.challenge,
            storedCredential
        );

        if (!verification.verified) {
            challenges.delete(challengeKey);
            return res.status(401).json({ 
                error: verification.error || 'Authentication verification failed' 
            });
        }

        // Update counter
        storedCredential.counter = verification.counter;
        localStorage.setItem(
            `webauthn_${challengeData.email}`, 
            JSON.stringify(storedCredential)
        );

        // Generate JWT token
        const tokenPayload = {
            email: challengeData.email,
            name: storedCredential.name,
            authenticatedAt: Date.now(),
            authMethod: 'webauthn'
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { 
                expiresIn: '24h',
                issuer: 'decentralized-identity-system',
                audience: 'user'
            }
        );

        // Clean up challenge
        challenges.delete(challengeKey);

        res.json({
            success: true,
            message: 'Authentication successful',
            token: token,
            user: {
                email: challengeData.email,
                name: storedCredential.name
            }
        });

    } catch (error) {
        console.error('Authentication complete error:', error);
        res.status(500).json({ 
            error: 'Failed to complete authentication' 
        });
    }
});

/**
 * Get current user info (protected route)
 * GET /api/auth/me
 */
router.get('/me', verifyToken, (req, res) => {
    res.json({
        success: true,
        user: {
            email: req.user.email,
            name: req.user.name,
            authenticatedAt: req.user.authenticatedAt,
            authMethod: req.user.authMethod
        }
    });
});

/**
 * Check if user has WebAuthn credentials registered
 * POST /api/auth/check-credentials
 */
router.post('/check-credentials', (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                error: 'Email is required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        const credentialData = localStorage.getItem(`webauthn_${email}`);
        
        res.json({
            success: true,
            hasCredentials: !!credentialData
        });

    } catch (error) {
        console.error('Check credentials error:', error);
        res.status(500).json({ 
            error: 'Failed to check credentials' 
        });
    }
});

/**
 * Logout route (optional - for completeness)
 * POST /api/auth/logout  
 */
router.post('/logout', verifyToken, (req, res) => {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token. This endpoint exists for consistency.
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Export the verifyToken middleware for use in other routes
router.verifyToken = verifyToken;

module.exports = router;