module.exports = {
  // Configure networks
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 9545,            // Standard Ganache port
      network_id: "*",       // Any network (default: none)
      gas: 6721975,          // Gas limit
      gasPrice: 20000000000, // 20 gwei (default)
    },
    
    // Configure for Ganache CLI
    ganache: {
      host: "127.0.0.1",
      port: 9545,
      network_id: 5777,
      gas: 6721975,
    }
  },

  // Set default mocha options here
  mocha: {
    timeout: 100000
  },

  // Configure compiler
  compilers: {
    solc: {
      version: "0.8.19",    // Fetch exact version from solc-bin
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "byzantium"
      }
    }
  },

  // Truffle DB is currently disabled by default
  db: {
    enabled: false
  }
};