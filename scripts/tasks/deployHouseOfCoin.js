const { deploy, redeployIf } = require("../utils");

const deployHouseOfCoin = async () => {
  const detailName = "HouseOfCoin";
  const contractName = "HouseOfCoin";
  const deployed = await redeployIf(detailName, contractName, deploy);
  return deployed;
};

module.exports = {
  deployHouseOfCoin,
};