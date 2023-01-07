const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

const setUpAccountLiquidator = async (contract) => {
  // Authorize Redstone Provider
  // You can check check evm addresses for providers at: https://api.redstone.finance/providers
  // 'redstone' main demo provider = 0x0C39486f770B26F5527BBBf942726537986Cd7eb; 
  // 'redstone-stocks' demo provider = 0x926E370fD53c23f8B71ad2B3217b227E41A92b12;
  // 'redstone-rapid' demo provider = 0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9;
  const w_liquidator = WrapperBuilder.wrapLite(contract)
    .usingPriceFeed("redstone-stocks");

  const atx = await w_liquidator.authorizeProvider();
  await atx.wait();

}

module.exports = {
  setUpAccountLiquidator
};