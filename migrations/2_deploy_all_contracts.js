var RegulatedTokenERC1404 = artifacts.require("./RegulatedTokenERC1404.sol");
var RegulatorService = artifacts.require("./RegulatorService.sol");
var ServiceRegistry = artifacts.require("./ServiceRegistry.sol");

module.exports = async function(deployer, network, accounts) {
  let name = "Royal Swiss Token Issue 100"
  let symbol = "RST100"
  let regulatorService, serviceRegistry;

  await deployer.deploy(RegulatorService, {gas: 6000000});
  regulatorService = await RegulatorService.deployed();
  await deployer.deploy(ServiceRegistry, regulatorService.address, {gas: 6000000});
  serviceRegistry = await ServiceRegistry.deployed();
  await deployer.deploy(
    RegulatedTokenERC1404,
    serviceRegistry.address,
    name,
    symbol,
    {gas: 6000000});
};
