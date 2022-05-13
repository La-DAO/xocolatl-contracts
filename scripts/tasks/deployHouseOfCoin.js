const { deploy, redeployIf } = require("../utils");

const deployAssetsAccountant = async () => {
  const detailName = "HouseOfCoin";
  const contractName = "HouseOfCoin";
  const deployed = await redeployIf(detailName, contractName, deploy);
  return deployed;
};

module.exports = {
  deployAssetsAccountant,
};