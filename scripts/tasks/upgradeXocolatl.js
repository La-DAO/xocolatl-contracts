const {
  getContract,
  updateDeployments
} = require("../utils");

const { ethers, upgrades } = hre;

const upgradeXocolatl = async () => {
  const detailName = "Xocolatl";
  const contractName = "Xocolatl";
  const xoc = await getContract(contractName);
  console.log("xoc", xoc.address);
  const contractArtifact = await ethers.getContractFactory(contractName);
  const proxyOpts = {
    timeout: 600000,
    unsafeAllow: (["delegatecall"]),
    kind: 'uups'
  };
  await upgrades.validateUpgrade(
    xoc.address,
    contractArtifact,
    proxyOpts
  );
  const implementation = await upgrades.prepareUpgrade(
    xoc.address,
    contractArtifact,
    proxyOpts,
  );
  await updateDeployments(detailName, contractName, xoc.address);
  return implementation;
};

module.exports = {
  upgradeXocolatl,
};