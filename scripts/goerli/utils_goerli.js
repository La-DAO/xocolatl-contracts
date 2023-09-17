const { ethers } = require("hardhat");
const { ASSETS } = require("../const");

const VERSION = "0.0.1";

const RESERVE_CAPS = {
  weth: {
    defaultInitialLimit: ethers.parseUnits("5", 18)
  },
  wbtc: {
    defaultInitialLimit: ethers.parseUnits("5", 18)
  },
}

const WNATIVE = ASSETS.goerli.await weth.getAddress();

module.exports = {
  VERSION,
  WNATIVE,
  RESERVE_CAPS,
  ASSETS
};