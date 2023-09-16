const {
  getContract,
  updateDeployments
} = require("../utils");

const { ethers, upgrades } = hre;

const upgradeXocolatl = async () => {
  const detailName = "Xocolatl";
  const contractName = "Xocolatl";
  const xoc = await getContract(detailName, contractName);
  console.log("xoc", await xoc.getAddress());
  const contractArtifact = await ethers.getContractFactory(contractName);
  const proxyOpts = {
    timeout: 600000,
    unsafeAllow: (["delegatecall"]),
    kind: 'uups'
  };
  await upgrades.validateUpgrade(
    await xoc.getAddress(),
    contractArtifact,
    proxyOpts
  );
  const implementation = await upgrades.prepareUpgrade(
    await xoc.getAddress(),
    contractArtifact,
    proxyOpts,
  );
  await updateDeployments(detailName, contractName, await xoc.getAddress());
  return implementation;
};

module.exports = {
  upgradeXocolatl,
};