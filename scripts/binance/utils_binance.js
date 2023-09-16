const { ethers } = require("hardhat");
const { ASSETS } = require("../const");

const VERSION = "1.0.0";

const RESERVE_CAPS = {
  weth: {
    defaultInitialLimit: ethers.parseUnits("10", 18)
  },
  wbnb: {
    defaultInitialLimit: ethers.parseUnits("100", 18)
  },
}

const WNATIVE = ASSETS.binance.wbnb.address;

module.exports = {
  VERSION,
  WNATIVE,
  RESERVE_CAPS,
  ASSETS
};