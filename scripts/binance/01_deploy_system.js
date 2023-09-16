const {
  network,
  getContract,
  setDeploymentsPath,
  setPublishPath,
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_CAPS, WNATIVE, ASSETS } = require("./utils_binance");
const { CHAINLINK_CONTRACTS } = require("../const");

const { deployAssetsAccountant } = require("../tasks/deployAssetsAccountant");
const { deployHouseOfCoin } = require("../tasks/deployHouseOfCoin");
const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");
const { deployAccountLiquidator } = require("../tasks/deployAccountLiquidator");

const { systemPermissionGranting } = require("../tasks/setUpXocolatl");
const { setUpAssetsAccountant } = require("../tasks/setUpAssetsAccountant");
const { setUpHouseOfCoin } = require("../tasks/setUpHouseOfCoin");
const { setUpHouseOfReserve, setUpOraclesHouseOfReserve } = require("../tasks/setUpHouseOfReserve");
const { setUpAccountLiquidator } = require("../tasks/setUpAccountLiquidator");

const {
  rolesHandOverAssetsAccountant,
  handOverDefaultAdmin
} = require("../tasks/rolesHandOver");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl", "Xocolatl");
  console.log("xoc", await xoc.getAddress());
  const accountant = await deployAssetsAccountant();
  const coinhouse = await deployHouseOfCoin(
    await xoc.getAddress(),
    await accountant.getAddress()
  );

  const reservehouseWeth = await deployHouseOfReserve(
    "HouseOfReserveBinanceWETH",
    ASSETS.binance.await weth.getAddress(),
    await xoc.getAddress(),
    await accountant.getAddress(),
    "MXN",
    "ETH",
    WNATIVE
  );

  const liquidator = await deployAccountLiquidator(
    await coinhouse.getAddress(),
    await accountant.getAddress()
  );

  await setUpHouseOfCoin(
    coinhouse
  );

  const reservehouseWBNB = await deployHouseOfReserve(
    "HouseOfReserveWBNB",
    ASSETS.binance.wbnb.address,
    await xoc.getAddress(),
    await accountant.getAddress(),
    "MXN",
    "BNB",
    WNATIVE
  );

  await setUpHouseOfReserve(
    reservehouseWeth,
    RESERVE_CAPS.weth.defaultInitialLimit
  );

  await setUpHouseOfReserve(
    reservehouseWBNB,
    RESERVE_CAPS.wbnb.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    reservehouseWeth,
    ethers.constants.AddressZero,
    CHAINLINK_CONTRACTS.binance.ethusd
  );

  await setUpOraclesHouseOfReserve(
    reservehouseWBNB,
    ethers.constants.AddressZero,
    CHAINLINK_CONTRACTS.binance.bnbusd
  );

  await setUpAssetsAccountant(
    accountant,
    await coinhouse.getAddress(),
    reservehouseawait weth.getAddress(),
    await liquidator.getAddress()  
  );

  const stx1 = await accountant.registerHouse(
    reservehouseWBNB.address
  );
  await stx1.wait();
  console.log("...House of Reserve registered in AssetsAccountant");

  await setUpAccountLiquidator(liquidator);

  // await systemPermissionGranting(
  //   xoc,
  //   await coinhouse.getAddress(),
  //   await liquidator.getAddress()
  // );

  // await rolesHandOverAssetsAccountant(accountant);
  // await handOverDefaultAdmin(coinhouse);
  // await handOverDefaultAdmin(reservehouseWeth);
  // await handOverDefaultAdmin(reservehouseWBNB);
  // await handOverDefaultAdmin(liquidator);
}


const main = async () => {
  if (network !== "binance") {
    throw new Error("Set 'NETWORK=binance' in .env file");
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