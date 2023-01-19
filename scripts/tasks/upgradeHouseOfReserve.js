const {
  getContract,
  updateDeployments
} = require("../utils");

const { ethers, upgrades } = hre;

const upgradeHouseOfReserve = async (
  detailName
) => {
  const contractName = "HouseOfReserve";
  const reservehouse = await getContract(detailName, contractName);
  console.log(detailName, reservehouse.address);
  const contractArtifact = await ethers.getContractFactory(contractName);
  const proxyOpts = {
    timeout: 600000,
    kind: 'uups'
  };
  await upgrades.validateUpgrade(
    reservehouse.address,
    contractArtifact,
    proxyOpts
  );
  const implementation = await upgrades.prepareUpgrade(
    reservehouse.address,
    contractArtifact,
    proxyOpts,
  );
  await updateDeployments(detailName, contractName, reservehouse.address);
  return implementation;
};

module.exports = {
  upgradeHouseOfReserve,
};