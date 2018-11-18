require('babel-register');
require('babel-polyfill');

const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');

const mnemonic = process.env.MNEMONIC;

module.exports = {
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 5000000
    },
    rinkeby: {
      provider: new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io'),
      network_id: '*',
      gas: 500000,
      gasPrice: 5000000000
    },
    mainnet: {
      provider: new HDWalletProvider(mnemonic, 'https://mainnet.infura.io'),
      network_id: 1,
      gas: 5212388,
      gasPrice: 4000000000
    }
  }
};
