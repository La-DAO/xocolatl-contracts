const { deploy, redeployIf } = require("../utils");

const deployHouseOfReserveImplementation = async (
) => {
  const detailName = 'HouseOfReserveImpl';
  const contractName = "HouseOfReserve";
  const deployed = await redeployIf(
    detailName,
    contractName,
    deploy,
    [] 
  );
  return deployed;
};

module.exports = {
  deployHouseOfReserveImplementation,
};