var Migrations = artifacts.require("./Migrations.sol");
var RegulatedTokenERC1404 = artifacts.require("./RegulatedTokenERC1404.sol");
var RegulatorService = artifacts.require("./RegulatorService.sol");
var ServiceRegistry = artifacts.require("./ServiceRegistry.sol");

module.exports = function(deployer) {
  let name = "Security Token Test"
  let symbol = "STT"

  deployer.then(() => {
      return deployer.deploy(RegulatorService, {gas: 3000000});
  }).then((result) => {
      return RegulatorService.deployed();
  }).then((service) => {
      return deployer.deploy(ServiceRegistry, service.address, {gas: 3000000});
  }).then((result) => {
      return ServiceRegistry.deployed();
  }).then((registry) => {
      return deployer.deploy(
        RegulatedTokenERC1404,
        registry.address,
        name,
        symbol,
        {gas: 3000000});
  });
};
