const {ethers} = require("hardhat");
const {ASSETS} = require("../const");

const VERSION = "2.0.0";

const RESERVE_CAPS = {
    weth: {
        defaultInitialLimit: ethers.parseUnits("50", 18),
    },
    wbtc: {
        defaultInitialLimit: ethers.parseUnits("10", 8),
    },
    wmatic: {
        defaultInitialLimit: ethers.parseUnits("50000", 18),
    },
    maticx: {
        defaultInitialLimit: ethers.parseUnits("50000", 18),
    },
    wsteth: {
        defaultInitialLimit: ethers.parseUnits("1000", 18),
    },
};

const WNATIVE = ASSETS.polygon.wmatic.address;

module.exports = {
    VERSION,
    WNATIVE,
    RESERVE_CAPS,
    ASSETS,
};
