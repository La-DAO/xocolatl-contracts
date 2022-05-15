const { deployProxy, redeployIf } = require("../utils");

const deployXocolatl = async () => {
  const detailName = "Xocolatl";
  const contractName = "Xocolatl";
  const args = [];
  const proxyOpts = {
    unsafeAllow: (["delegatecall"]),
    kind: 'uups'
  };
  const deployed = await redeployIf(detailName, contractName, deployProxy, args, proxyOpts);
  return deployed;
};

module.exports = {
  deployXocolatl,
};