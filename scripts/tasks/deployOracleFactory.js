const { deploy, redeployIf } = require("../utils");

const deployOracleFactory = async () => {
  const contractName = "OracleFactory";
  const detailName = contractName;
  const deployed = await redeployIf(detailName, contractName, deploy, []);
  return deployed;
};

module.exports = {
  deployOracleFactory,
};