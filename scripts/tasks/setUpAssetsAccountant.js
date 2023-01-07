const { ethers } = require("hardhat");

const setUpAssetsAccountant = async (contract, houseOfCoinAddr, houseOfReserveAddr, liquidatorAddr) => {

  const stx1 = await contract.registerHouse(
    houseOfCoinAddr
  );
  await stx1.wait();
  console.log("...House of Coin registered in AssetsAccountant");

  const stx2 = await contract.registerHouse(
    houseOfReserveAddr
  );
  await stx2.wait();
  console.log("...House of Reserve registered in AssetsAccountant");

  const stx3 = await contract.allowLiquidator(
    liquidatorAddr,
    true
  );
  await stx3.wait();
  console.log("...liquidator set in AssetsAccountant");

}

module.exports = {
  setUpAssetsAccountant
};