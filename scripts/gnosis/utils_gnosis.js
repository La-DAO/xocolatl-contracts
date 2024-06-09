const {ethers} = require("hardhat");
const {ASSETS, LADAO_MULTISIGS} = require("../const");

const VERSION = "2.0.0";

const RESERVE_CAPS = {
    weth: {
        defaultInitialLimit: ethers.parseUnits("5", 18),
    },
};

const WNATIVE = ASSETS.gnosis.weth.address;
const TREASURY = LADAO_MULTISIGS.gnosis;

module.exports = {
    VERSION,
    WNATIVE,
    RESERVE_CAPS,
    ASSETS,
    TREASURY,
};
