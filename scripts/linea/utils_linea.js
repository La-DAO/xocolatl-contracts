const {ethers} = require("hardhat");
const {ASSETS} = require("../const");

const VERSION = "1.0.0";

const RESERVE_CAPS = {
    weth: {
        defaultInitialLimit: ethers.parseUnits("50", 18),
    },
};

const WNATIVE = ASSETS.linea.weth.address;

module.exports = {
    VERSION,
    WNATIVE,
    RESERVE_CAPS,
    ASSETS,
};
