const crypto = require('crypto');

/**
 * WebAuthn utility functions for credential registration and verification
 * Simplified implementation for demonstration purposes
 */

class WebAuthnUtils {
    constructor() {
        this.rpName = process.env.RP_NAME || 'Decentralized Identity System';
        this.rpId = process.env.RP_ID || 'localhost';
        this.origin = process.env.ORIGIN || 'http://localhost:3000';
    }

    /**
     * Generate registration options for WebAuthn
     * @param {string} userEmail - User's email address
     * @param {string} userName - User's display name
     * @returns {object} Registration options for WebAuthn
     */
    generateRegistrationOptions(userEmail, userName) {
        const userId = crypto.randomBytes(32);
        const challenge = crypto.randomBytes(32);

        return {
            challenge: challenge.toString('base64url'),
            rp: {
                name: this.rpName,
                id: this.rpId,
            },
            user: {
                id: userId.toString('base64url'),
                name: userEmail,
                displayName: userName,
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' }, // ES256
                { alg: -257, type: 'public-key' }, // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                requireResidentKey: false,
            },
            timeout: 60000,
            attestation: 'direct',
        };
    }

    /**
     * Generate authentication options for WebAuthn
     * @param {Array} allowCredentials - Array of allowed credential IDs
     * @returns {object} Authentication options for WebAuthn
     */
    generateAuthenticationOptions(allowCredentials = []) {
        const challenge = crypto.randomBytes(32);

        return {
            challenge: challenge.toString('base64url'),
            timeout: 60000,
            rpId: this.rpId,
            allowCredentials: allowCredentials.map(credId => ({
                id: credId,
                type: 'public-key',
                transports: ['internal', 'hybrid'],
            })),
            userVerification: 'required',
        };
    }

    /**
     * Verify registration credential (simplified)
     * @param {object} credential - The credential from navigator.credentials.create()
     * @param {string} expectedChallenge - The challenge that was sent to client
     * @returns {object} Verification result with credential data
     */
    verifyRegistrationCredential(credential, expectedChallenge) {
        try {
            // In a real implementation, you would:
            // 1. Verify the challenge matches
            // 2. Verify the origin
            // 3. Parse and validate the attestation
            // 4. Extract and store the public key
            
            // For this demo, we'll do basic validation
            if (!credential || !credential.id || !credential.response) {
                throw new Error('Invalid credential format');
            }

            // Decode the credential response
            const clientDataJSON = this.base64URLToBuffer(credential.response.clientDataJSON);
            const clientData = JSON.parse(clientDataJSON.toString());

            // Verify challenge (basic check)
            if (clientData.challenge !== expectedChallenge) {
                throw new Error('Challenge mismatch');
            }

            // Verify origin
            if (clientData.origin !== this.origin) {
                throw new Error('Origin mismatch');
            }

            // For demo purposes, return success with credential info
            return {
                verified: true,
                credentialId: credential.id,
                publicKey: credential.response.attestationObject, // In real impl, extract actual public key
                counter: 0,
            };

        } catch (error) {
            console.error('Registration verification failed:', error);
            return {
                verified: false,
                error: error.message,
            };
        }
    }

    /**
     * Verify authentication credential (simplified)
     * @param {object} credential - The credential from navigator.credentials.get()
     * @param {string} expectedChallenge - The challenge that was sent to client
     * @param {object} storedCredential - Previously stored credential data
     * @returns {object} Verification result
     */
    verifyAuthenticationCredential(credential, expectedChallenge, storedCredential) {
        try {
            // Basic validation
            if (!credential || !credential.id || !credential.response) {
                throw new Error('Invalid credential format');
            }

            // Verify credential ID matches
            if (credential.id !== storedCredential.credentialId) {
                throw new Error('Credential ID mismatch');
            }

            // Decode client data
            const clientDataJSON = this.base64URLToBuffer(credential.response.clientDataJSON);
            const clientData = JSON.parse(clientDataJSON.toString());

            // Verify challenge
            if (clientData.challenge !== expectedChallenge) {
                throw new Error('Challenge mismatch');
            }

            // Verify origin
            if (clientData.origin !== this.origin) {
                throw new Error('Origin mismatch');
            }

            // In a real implementation, you would verify the signature
            // For demo purposes, return success
            return {
                verified: true,
                counter: storedCredential.counter + 1,
            };

        } catch (error) {
            console.error('Authentication verification failed:', error);
            return {
                verified: false,
                error: error.message,
            };
        }
    }

    /**
     * Convert base64url to buffer
     * @param {string} base64url 
     * @returns {Buffer}
     */
    base64URLToBuffer(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        return Buffer.from(padded, 'base64');
    }

    /**
     * Convert buffer to base64url
     * @param {Buffer} buffer 
     * @returns {string}
     */
    bufferToBase64URL(buffer) {
        return buffer.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}

module.exports = WebAuthnUtils;