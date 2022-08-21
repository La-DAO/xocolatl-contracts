const { deploy, redeployIf } = require("../utils");

const deployUMAOracleHelper = async (
  stakeCollateralAssetAddr,
  UMAFinderAddr,
  bytes32umaPriceIdentifier,
  priceRequestTimeObsolence
) => {
  const detailName = "UMAOracleHelper";
  const contractName = "UMAOracleHelper";
  const deployed = await redeployIf(detailName, contractName, deploy, [
    stakeCollateralAssetAddr,
    UMAFinderAddr,
    bytes32umaPriceIdentifier,
    priceRequestTimeObsolence
  ]);
  return deployed;
};

module.exports = {
  deployUMAOracleHelper,
};