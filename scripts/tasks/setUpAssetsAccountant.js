
const { ethers } = require("hardhat");

const setUpAssetsAccountant = async (contract, houseOfCoinAddr, houseOfReserveAddr) => {

  const stx1 = await contract.registerHouse(
    houseOfCoinAddr
  );
  await stx1.wait();

  const stx2 = await contract.registerHouse(
    houseOfReserveAddr
  );
  await stx2.wait();

}

module.exports = {
  setUpAssetsAccountant
};