const {ethers} = require("hardhat");
const {ASSETS} = require("../const");

const VERSION = "1.0.0";

const RESERVE_CAPS = {
    weth: {
        defaultInitialLimit: ethers.parseUnits("5", 18),
    },
};

const WNATIVE = ASSETS.arbitrum.weth.address;

module.exports = {
    VERSION,
    WNATIVE,
    RESERVE_CAPS,
    ASSETS,
};
