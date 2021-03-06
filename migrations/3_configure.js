var RegulatedTokenERC1404 = artifacts.require("./RegulatedTokenERC1404.sol");
var RegulatorService = artifacts.require("./RegulatorService.sol");
var ServiceRegistry = artifacts.require("./ServiceRegistry.sol");
const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');
const mnemonic = fs.readFileSync("../.secret").toString().trim();
const provider = new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io');

module.exports = async function(deployer, network, accounts) {
  // Evaki owner
  // let newOwner = "0x798539f1aA6fF2add17E68865F9b530186fd3360"
  let newOwner = "0xd24c586cEC1eA87ec41D017e63934df5E876a41d"
  // let newOwner = "0xa8836881DCACE8bF1DaAC141A3dAbD9A4884dBFB"

  let from;
  if(network == 'local' || network == 'development')
    from = accounts[0]
  else
    from = provider.addresses[0]

  // Truffle cannot handle properly setup TX so I will just send it without waiting for receipt and manually check if they are all valid
  
  let rtoken = await RegulatedTokenERC1404.deployed();
  console.log("RegulatedTokenERC1404 transferOwnership to...")
  // tx = await 
  // rtoken.contract.methods.transferOwnership(newOwner).send(
    // {from: from, gas: 150000})
  rtoken.contract.methods.mint(newOwner, web3.utils.toWei('6830000', 'ether')).send(
    {from: from, gas: 150000})
  // owner = await rtoken.contract.methods.owner().call()
  // console.log(owner)
  
  
  let regulatorService = await RegulatorService.deployed();
  console.log("RegulatorService transferOwnership to...")
  // let tx = await 
  // regulatorService.contract.methods.transferOwnership(newOwner).send(
    // {from: from, gas: 150000})
  regulatorService.contract.methods.setPermission(rtoken.address, newOwner, 3).send({from: from, gas: 150000})
  // owner = await regulatorService.contract.methods.owner().call()
  // console.log(owner)

  // let serviceRegistry = await ServiceRegistry.deployed();
  // console.log("ServiceRegistry transferOwnership to...")
  // tx = await 
  // serviceRegistry.contract.methods.transferOwnership(newOwner).send(
    // {from: from, gas: 150000})
  // owner = await serviceRegistry.contract.methods.owner().call()
  // console.log(owner)
  
  
};
