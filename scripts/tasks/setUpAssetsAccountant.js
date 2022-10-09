
const { ethers } = require("hardhat");

const setUpAssetsAccountant = async (contract, houseOfCoinAddr, xocAddr, houseOfReserveAddr, reserveAddr) => {

  const stx1 = await contract.registerHouse(
    houseOfCoinAddr,
    xocAddr
  );
  await stx1.wait();
  console.log("...house of coin registered at AssetsAccountant");

  const stx2 = await contract.registerHouse(
    houseOfReserveAddr,
    reserveAddr
  );
  await stx2.wait();
  console.log("...house of reserve registered at AssetsAccountant");

}

module.exports = {
  setUpAssetsAccountant
};