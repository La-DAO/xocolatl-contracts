const {ethers} = require("hardhat");
const {ASSETS, LADAO_MULTISIGS} = require("../const");

const VERSION = "2.0.0";

const RESERVE_CAPS = {
    weth: {
        defaultInitialLimit: ethers.parseUnits("1000", 18),
    },
    wbtc: {
        defaultInitialLimit: ethers.parseUnits("1000", 18),
    },
};

const WNATIVE = ASSETS.sepolia.weth.address;
const TREASURY = LADAO_MULTISIGS.sepolia;

module.exports = {
    VERSION,
    WNATIVE,
    RESERVE_CAPS,
    ASSETS,
    TREASURY,
};
