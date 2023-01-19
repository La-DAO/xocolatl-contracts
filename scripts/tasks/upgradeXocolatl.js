const {
  getContract,
} = require("../utils");

const { ethers, upgrades } = hre;

const upgradeXocolatl = async () => {
  const contractName = "Xocolatl";
  const xoc = await getContract(contractName);
  console.log("xoc", xoc.address);
  const contractArtifact = await ethers.getContractFactory(contractName);
  const proxyOpts = {
    timeout: 600000,
    unsafeAllow: (["delegatecall"]),
    kind: 'uups'
  };
  const validation = await upgrades.validateUpgrade(
    xoc.address,
    contractArtifact,
    proxyOpts
  );
  // const implementation = (await response.wait()).contractAddress;
  return validation;
};

module.exports = {
  upgradeXocolatl,
};