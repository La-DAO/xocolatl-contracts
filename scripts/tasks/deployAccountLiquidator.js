const {deployProxy, redeployIf} = require("../utils");

const deployAccountLiquidator = async (houseOfCoin_, assetsAccountant_) => {
    const detailName = "AccountLiquidator";
    const contractName = "AccountLiquidator";
    const args = [houseOfCoin_, assetsAccountant_];
    const proxyOpts = {
        timeout: 600000,
        kind: "uups",
    };
    const deployed = await redeployIf(detailName, contractName, deployProxy, args, proxyOpts);
    return deployed;
};

module.exports = {
    deployAccountLiquidator,
};
