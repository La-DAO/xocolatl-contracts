const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");
const { CHAINLINK_CONTRACTS } = require("../const");

const setUpHouseOfReserve = async (
  contract,
  reserveAddr,
  xocAddr,
  accountantAddr,
  ticker1,
  ticker2,
  WNativeAddr,
  initialDepositLimit
) => {

  const stx1 = await contract.initialize(
    reserveAddr,
    xocAddr,
    accountantAddr,
    ticker1,
    ticker2,
    WNativeAddr
  );
  await stx1.wait();

  const stx2 = await contract.setDepositLimit(initialDepositLimit);
  await stx2.wait();
  console.log("...house of reserve initialized");

  // Authorize Redstone Provider
  // You can check check evm addresses for providers at: https://api.redstone.finance/providers
  // 'redstone' main demo provider = 0x0C39486f770B26F5527BBBf942726537986Cd7eb; 
  // 'redstone-stocks' demo provider = 0x926E370fD53c23f8B71ad2B3217b227E41A92b12;
  // 'redstone-rapid' demo provider = 0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9;
  const w_reservehouse = WrapperBuilder.wrapLite(contract)
    .usingPriceFeed("redstone-stocks");

  const atx = await w_reservehouse.authorizeProvider();
  await atx.wait();
}

const setUpOraclesHouseOfReserve = async (
  contract,
  umaOracleHelperAddr
) => {
  let tx = await contract.setUMAOracleHelper(umaOracleHelperAddr);
  await tx.wait();
  
  tx = await contract.setActiveOracle(2);
  await tx.wait();
  
  tx = await contract.setChainlinkAddrs(
    CHAINLINK_CONTRACTS.polygon.mxnusd,
    CHAINLINK_CONTRACTS.polygon.ethusd
  );
  await tx.wait();
}

module.exports = {
  setUpHouseOfReserve,
  setUpOraclesHouseOfReserve
};