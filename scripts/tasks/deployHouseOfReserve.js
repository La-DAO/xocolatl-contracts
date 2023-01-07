const { deployProxy, redeployIf } = require("../utils");

const deployHouseOfReserve = async (
  name,
  reserveAsset_,
  backedAsset_,
  assetsAccountant_,
  tickerUsdFiat_,
  tickerReserveAsset_,
  wrappedNative
) => {
  const detailName = name;
  const contractName = "HouseOfReserve";
  const args = [
    reserveAsset_,
    backedAsset_,
    assetsAccountant_,
    tickerUsdFiat_,
    tickerReserveAsset_,
    wrappedNative
  ];
  const proxyOpts = {
    timeout: 600000,
    kind: 'uups'
  };
  const deployed = await redeployIf(
    detailName,
    contractName,
    deployProxy,
    args,
    proxyOpts
  );
  return deployed;
};

module.exports = {
  deployHouseOfReserve,
};