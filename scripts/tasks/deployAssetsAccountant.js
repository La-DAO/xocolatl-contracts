const {deployProxy, redeployIf} = require("../utils");

const deployAssetsAccountant = async () => {
    const detailName = "AssetsAccountant";
    const contractName = "AssetsAccountant";
    const args = [];
    const proxyOpts = {
        timeout: 600000,
        kind: "uups",
    };
    const deployed = await redeployIf(detailName, contractName, deployProxy, args, proxyOpts);
    return deployed;
};

module.exports = {
    deployAssetsAccountant,
};
