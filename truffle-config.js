module.exports = {
  compilers: {
    solc: {
      version: "0.4.26",  
      settings: {          
       optimizer: {
         enabled: true,
         runs: 1
       },
      }
    }
  },
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 8000000
    }
  }//,
  //plugins: [
    //"truffle-contract-size"
  //]  
}