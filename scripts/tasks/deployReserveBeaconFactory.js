const {deploy, redeployIf} = require("../utils");

const deployReserveBeaconFactory = async (implementationAddr, xocAddr, accountantAddr, weth9Addr) => {
    const contractName = "ReserveBeaconFactory";
    const detailName = contractName;
    const deployed = await redeployIf(detailName, contractName, deploy, [
        implementationAddr,
        xocAddr,
        accountantAddr,
        weth9Addr,
    ]);
    return deployed;
};

module.exports = {
    deployReserveBeaconFactory,
};
