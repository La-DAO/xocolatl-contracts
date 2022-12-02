const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

const initialSetUpHouseOfCoin = async (contract, xocAddr, accountantAddr) => {

  const stx = await contract.initialize(
    xocAddr,
    accountantAddr
  );
  await stx.wait();
  console.log("...house of coin initialized");

  // Authorize Redstone Provider
  // You can check check evm addresses for providers at: https://api.redstone.finance/providers
  // 'redstone' main demo provider = 0x0C39486f770B26F5527BBBf942726537986Cd7eb; 
  // 'redstone-stocks' demo provider = 0x926E370fD53c23f8B71ad2B3217b227E41A92b12;
  // 'redstone-rapid' demo provider = 0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9;
  const w_coinhouse = WrapperBuilder.wrapLite(contract)
    .usingPriceFeed("redstone-stocks");
  
  const atx = await w_coinhouse.authorizeProvider();
  await atx.wait();

}

const initialPermissionGranting = async (contract, xocContract, accountantContract) => {
  const minter = await xocContract.MINTER_ROLE();
  const burner = await xocContract.BURNER_ROLE();
  const liquidator = await accountantContract.LIQUIDATOR_ROLE();
  const stx1 = await xocContract.grantRole(minter, contract.address);
  await stx1.wait();
  console.log("...minter XOC role assigned House of Coin");
  const stx2 = await xocContract.grantRole(burner, contract.address);
  await stx2.wait();
  console.log("...burner XOC role assigned House of Coin");
  const stx3 = await accountantContract.grantRole(liquidator, contract.address);
  await stx3.wait();
  console.log("...liquidator AssetsAccountant role assgined to House Of Coin");
}

module.exports = {
  initialSetUpHouseOfCoin,
  initialPermissionGranting
};