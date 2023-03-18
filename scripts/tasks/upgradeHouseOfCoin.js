const {
  getContract,
  updateDeployments
} = require("../utils");

const { ethers, upgrades } = hre;

const upgradeHouseOfCoin = async () => {
  const contractName = "HouseOfCoin";
  const coinhouse = await getContract(contractName, contractName);
  console.log(contractName, coinhouse.address);
  const contractArtifact = await ethers.getContractFactory(contractName);
  const proxyOpts = {
    timeout: 600000,
    kind: 'uups'
  };
  await upgrades.validateUpgrade(
    coinhouse.address,
    contractArtifact,
    proxyOpts
  );
  const implementation = await upgrades.prepareUpgrade(
    coinhouse.address,
    contractArtifact,
    proxyOpts,
  );
  await updateDeployments(contractName, contractName, coinhouse.address);
  return implementation;
};

module.exports = {
  upgradeHouseOfCoin,
};