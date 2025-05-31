# Decentralized Identity Management System

A full-stack decentralized identity management system with biometric authentication using WebAuthn and blockchain technology.

## 🛠️ Technologies

- **Smart Contracts**: Solidity with Truffle
- **Backend**: Node.js + Express.js
- **Database**: In-memory store for WebAuthn credentials
- **Authentication**: JWT + WebAuthn biometric authentication
- **Frontend**: HTML + JavaScript + CSS
- **Blockchain Integration**: Web3.js
- **Development**: Ganache for local blockchain

## 📁 Project Structure

```
decentralized-identity-system/
├── contracts/                 # Solidity smart contracts
│   └── IdentityManager.sol
├── migrations/               # Truffle deployment scripts
│   └── 2_deploy_contracts.js
├── routes/                   # Express API routes
│   └── auth.js
├── middleware/               # Authentication middleware
│   └── auth.js
├── webauthn/                # WebAuthn utilities
│   └── webauthn-utils.js
├── public/                  # Frontend files
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js               # Backend entry point
├── setup.js               # Project setup script
├── truffle-config.js      # Truffle configuration
├── package.json           # Dependencies
└── .env                   # Environment variables
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Ganache CLI** or **Ganache GUI**
3. **Truffle** framework

Install global dependencies:
```bash
npm install -g truffle ganache-cli
```

### Setup Steps

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo>
   cd decentralized-identity-system
   npm install
   ```

2. **Start Ganache (Local Blockchain)**
   ```bash
   # Option 1: Using Ganache CLI
   ganache-cli -p 9545 -m "your twelve word mnemonic here"
   
   # Option 2: Using Ganache GUI
   # Start Ganache GUI and configure:
   # - Port: 9545
   # - Network ID: 5777
   ```

3. **Build and Run**
   ```bash
   npm run buildandrun
   ```

   This will:
   - Set up project directories
   - Compile smart contracts
   - Deploy contracts to Ganache
   - Start the Express server

4. **Access the Application**
   - Open your browser and go to: `http://localhost:3000`
   - Make sure your browser supports WebAuthn (Chrome, Firefox, Safari)

## 🔐 Features

### Smart Contract Features
- Store user profiles (name, email, hashed Aadhaar, Ethereum address)
- Register and retrieve user information
- Emit events for user registration

### Backend API Endpoints
- `POST /api/auth/register` - Register new user on blockchain
- `POST /api/auth/webauthn/register` - Register biometric credentials
- `POST /api/auth/webauthn/login` - Authenticate with biometrics
- `GET /api/auth/profile` - Get user profile (protected)

### Frontend Features
- User registration form
- Biometric authentication setup
- Login with fingerprint/Face ID
- Protected dashboard
- Web3 integration for blockchain interaction

### Security Features
- Biometric authentication using WebAuthn
- JWT tokens for session management
- Blockchain-based identity verification
- Secure credential storage

## 🧪 Testing

### Manual Testing Flow

1. **Registration**
   - Fill out the registration form
   - Set up biometric authentication
   - User profile is stored on blockchain

2. **Login**
   - Use biometric authentication
   - Receive JWT token
   - Access protected dashboard

3. **Profile Verification**
   - View profile information
   - Verify blockchain storage


## 🔧 Configuration

### Environment Variables (.env)

```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_here
GANACHE_URL=http://localhost:9545
NETWORK_ID=5777
```

### Truffle Configuration

The system is configured to work with:
- **Network**: Local development (Ganache)
- **Port**: 9545
- **Network ID**: 5777




## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
