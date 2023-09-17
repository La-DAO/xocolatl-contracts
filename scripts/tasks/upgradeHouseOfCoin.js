const {
  getContract,
  updateDeployments
} = require("../utils");

const { ethers, upgrades } = hre;

const upgradeHouseOfCoin = async () => {
  const contractName = "HouseOfCoin";
  const coinhouse = await getContract(contractName, contractName);
  console.log(contractName, await coinhouse.getAddress());
  const contractArtifact = await ethers.getContractFactory(contractName);
  const proxyOpts = {
    timeout: 600000,
    kind: 'uups'
  };
  await upgrades.validateUpgrade(
    await coinhouse.getAddress(),
    contractArtifact,
    proxyOpts
  );
  const implementation = await upgrades.prepareUpgrade(
    await coinhouse.getAddress(),
    contractArtifact,
    proxyOpts,
  );
  await updateDeployments(contractName, contractName, await coinhouse.getAddress());
  return implementation;
};

module.exports = {
  upgradeHouseOfCoin,
};