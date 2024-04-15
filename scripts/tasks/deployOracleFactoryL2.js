const { deploy, redeployIf } = require("../utils");

const deployOracleFactoryL2 = async () => {
  const contractName = "OracleFactoryL2";
  const detailName = contractName;
  const deployed = await redeployIf(detailName, contractName, deploy, []);
  return deployed;
};

module.exports = {
  deployOracleFactoryL2,
};