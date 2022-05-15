const { ethers } = require("hardhat");

const VERSION = "0.0";

const RESERVE_ASSETS = {
  weth: {
    address: "0xDf032Bc4B9dC2782Bb09352007D4C57B75160B15",
    defaultInitialLimit: ethers.utils.parseUnits("10", 18)
  },
  wbtc: {
    address: "0x88138CA1e9E485A1E688b030F85Bb79d63f156BA",
    defaultInitialLimit: ethers.utils.parseUnits("1", 8)
  },
  usdc: {
    address: "0xb18d016cDD2d9439A19f15633005A6b2cd6Aa774",
    defaultInitialLimit: ethers.utils.parseUnits("50000", 6)
  }
}

const WETH = RESERVE_ASSETS.weth.address;

module.exports = {
  VERSION,
  WETH,
  RESERVE_ASSETS
};