const { ethers } = require("hardhat");
const { CHAINLINK_CONTRACTS } = require("../const");
const {
  network
} = require("../utils");

const setUpHouseOfReserve = async (
  contract,
  initialDepositLimit
) => {

  const stx1 = await contract.setDepositLimit(initialDepositLimit);
  await stx1.wait();
  console.log("...deposit limit set in House of Reserve");
}

const setUpOraclesHouseOfReserve = async (
  contract,
  umaOracleHelperAddr,
  chainlink_address
) => {

  if (network == 'polygon' && umaOracleHelperAddr != ethers.ZeroAddress) {
    const umatx = await contract.setUMAOracleHelper(umaOracleHelperAddr);
    await umatx.wait();
  }

  const tx1 = await contract.setActiveOracle(2);
  await tx1.wait();

  const tx2 = await contract.setChainlinkAddrs(
    CHAINLINK_CONTRACTS[network].mxnusd,
    chainlink_address
  );
  await tx2.wait();
}

module.exports = {
  setUpHouseOfReserve,
  setUpOraclesHouseOfReserve
};