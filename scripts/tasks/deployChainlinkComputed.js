const { deploy, redeployIf } = require("../utils");

const deployChainlinkComputed = async (
  detailName,
  description,
  decimals,
  feedAsset,
  feedInterAsset,
  allowedTimeout
) => {
  const contractName = "ChainlinkComputedOracle";
  const args = [description, decimals, feedAsset, feedInterAsset, allowedTimeout];
  const deployed = await redeployIf(detailName, contractName, deploy, args);
  return deployed;
};

module.exports = {
  deployChainlinkComputed,
};