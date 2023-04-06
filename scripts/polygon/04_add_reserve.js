const { ethers } = require("hardhat");

const {
  network,
  getContract,
  setDeploymentsPath,
  setPublishPath,
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_CAPS, WNATIVE, ASSETS } = require("./utils_polygon");

const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");

const { setUpHouseOfReserve, setUpOraclesHouseOfReserve } = require("../tasks/setUpHouseOfReserve");
const { CHAINLINK_CONTRACTS } = require("../const");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl", "Xocolatl");
  console.log("xoc", xoc.address);
  const accountant = await getContract("AssetsAccountant", "AssetsAccountant");
  console.log("accountant", accountant.address);

  // WBTC
  const reservehouseWBTC = await deployHouseOfReserve(
    "HouseOfReserveWBTC",
    ASSETS.polygon.wbtc.address,
    xoc.address,
    accountant.address,
    "MXN",
    "WBTC",
    WNATIVE
  );

  await setUpHouseOfReserve(
    reservehouseWBTC,
    RESERVE_CAPS.wbtc.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    reservehouseWBTC,
    ethers.constants.AddressZero,
    CHAINLINK_CONTRACTS.polygon.btcusd
  );

  ///@dev this following tx needs to be submitted via the multisig.

  // const stx = await accountant.registerHouse(
  //   reservehouseWBTC.address
  // );
  // await stx.wait();
  // console.log("...House of Reserve registered in AssetsAccountant");

  // WMATIC
  const reservehouseWMATIC = await deployHouseOfReserve(
    "HouseOfReserveWMATIC",
    ASSETS.polygon.wmatic.address,
    xoc.address,
    accountant.address,
    "MXN",
    "WMATIC",
    WNATIVE
  );

  await setUpHouseOfReserve(
    reservehouseWMATIC,
    RESERVE_CAPS.wmatic.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    reservehouseWMATIC,
    ethers.constants.AddressZero,
    CHAINLINK_CONTRACTS.polygon.maticusd
  );

  ///@dev this following tx needs to be submitted via the multisig.

  // const stx = await accountant.registerHouse(
  //   reservehouseWMATIC.address
  // );
  // await stx.wait();
  // console.log("...House of Reserve registered in AssetsAccountant");
}


const main = async () => {
  if (network !== "polygon") {
    throw new Error("Set 'NETWORK=polygon' in .env file");
  }
  await setDeploymentsPath(VERSION);
  await setPublishPath(VERSION);
  await deploySystemContracts();
  await publishUpdates();
};


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });