const { ethers } = require("hardhat");
const { ASSETS } = require("../const");

const VERSION = "1.0.0";

const RESERVE_CAPS = {
  weth: {
    defaultInitialLimit: ethers.utils.parseUnits("50", 18)
  },
  wbtc: {
    defaultInitialLimit: ethers.utils.parseUnits("10", 8)
  },
  wmatic: {
    defaultInitialLimit: ethers.utils.parseUnits("50000", 18)
  },
}

const WNATIVE = ASSETS.polygon.wmatic.address;

module.exports = {
  VERSION,
  WNATIVE,
  RESERVE_CAPS,
  ASSETS
};