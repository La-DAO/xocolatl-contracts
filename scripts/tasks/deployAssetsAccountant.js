const { deploy, redeployIf } = require("../utils");

const deployAssetsAccountant = async () => {
  const detailName = "AssetsAccountant";
  const contractName = "AssetsAccountant";
  const deployed = await redeployIf(detailName, contractName, deploy);
  return deployed;
};

module.exports = {
  deployAssetsAccountant,
};