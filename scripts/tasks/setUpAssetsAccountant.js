
const { ethers } = require("hardhat");

const setUpAssetsAccountant = async (contract, houseOfCoinAddr, xocAddr, houseOfReserveAddr, reserveAddr) => {

  const stx1 = await contract.registerHouse(
    houseOfCoinAddr,
    xocAddr
  );
  await stx1.wait();

  const stx2 = await contract.registerHouse(
    houseOfReserveAddr,
    reserveAddr
  );
  await stx2.wait();

}

module.exports = {
  setUpAssetsAccountant
};