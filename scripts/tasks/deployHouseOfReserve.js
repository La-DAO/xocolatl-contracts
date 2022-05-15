const { deploy, redeployIf } = require("../utils");

const deployHouseOfReserve = async (name) => {
  const detailName = name;
  const contractName = "HouseOfReserve";
  const deployed = await redeployIf(detailName, contractName, deploy);
  return deployed;
};

module.exports = {
  deployHouseOfReserve,
};