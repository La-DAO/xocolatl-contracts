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
  console.log(detailName, (await reservehouse.getAddress()));
  const contractArtifact = await ethers.getContractFactory(contractName);
  const proxyOpts = {
    timeout: 600000,
    kind: 'uups'
  };
  await upgrades.validateUpgrade(
    (await reservehouse.getAddress()),
    contractArtifact,
    proxyOpts
  );
  const implementation = await upgrades.prepareUpgrade(
    (await reservehouse.getAddress()),
    contractArtifact,
    proxyOpts,
  );
  await updateDeployments(detailName, contractName, (await reservehouse.getAddress()));
  return implementation;
};

module.exports = {
  upgradeHouseOfReserve,
};