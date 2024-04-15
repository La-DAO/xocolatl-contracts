const {deployProxy, redeployIf} = require("../utils");

const deployHouseOfCoin = async (backedAsset_, assetsAccountant_) => {
    const detailName = "HouseOfCoin";
    const contractName = "HouseOfCoin";
    const args = [backedAsset_, assetsAccountant_];
    const proxyOpts = {
        timeout: 600000,
        kind: "uups",
    };
    const deployed = await redeployIf(detailName, contractName, deployProxy, args, proxyOpts);
    return deployed;
};

module.exports = {
    deployHouseOfCoin,
};
