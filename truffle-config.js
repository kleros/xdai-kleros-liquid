require('dotenv/config')
const HDWalletProvider = require('truffle-hdwallet-provider-privkey')

const PRIVATE_KEYS = JSON.parse(process.env.PRIVATE_KEYS)

module.exports = {
  compilers: {
    solc: {
      version: '0.4.26',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 8000000,
    },
    xdai: {
      provider: function () {
        return new HDWalletProvider(
          [PRIVATE_KEYS['xdai']],
          'https://rpc.xdaichain.com/'
        )
      },
      network_id: 100,
      gas: 10000000,
      gasPrice: 10000000000,
    },
    sokol: {
      provider: function () {
        return new HDWalletProvider(
          [PRIVATE_KEYS['sokol-fork']],
          'https://sokol.poa.network'
        )
      },
      network_id: '77',
      gas: 10000000,
      gasPrice: 1000000000,
      skipDryRun: true,
    },
  },
  plugins: [
    // "truffle-contract-size",
    'truffle-plugin-verify',
  ],
}
