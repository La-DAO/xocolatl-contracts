const { ethers } = require("hardhat");
const { ASSETS } = require("../const");

const VERSION = "0.0.1";

const RESERVE_CAPS = {
  weth: {
    defaultInitialLimit: ethers.utils.parseUnits("5", 18)
  },
}

const WNATIVE = ASSETS.goerli.weth.address;

module.exports = {
  VERSION,
  WNATIVE,
  RESERVE_CAPS,
  ASSETS
};