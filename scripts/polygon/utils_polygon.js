const {ethers} = require("hardhat");
const {ASSETS, LADAO_MULTISIGS} = require("../const");

const VERSION = "2.0.0";

const RESERVE_CAPS = {
    weth: {
        defaultInitialLimit: ethers.parseUnits("5", 18),
    },
    wbtc: {
        defaultInitialLimit: ethers.parseUnits("5", 8),
    },
    wmatic: {
        defaultInitialLimit: ethers.parseUnits("100", 18),
    },
    maticx: {
        defaultInitialLimit: ethers.parseUnits("100", 18),
    },
    wsteth: {
        defaultInitialLimit: ethers.parseUnits("5", 18),
    },
};

const WNATIVE = ASSETS.polygon.wmatic.address;
const TREASURY = LADAO_MULTISIGS.polygon;

module.exports = {
    VERSION,
    WNATIVE,
    RESERVE_CAPS,
    ASSETS,
    TREASURY,
};
