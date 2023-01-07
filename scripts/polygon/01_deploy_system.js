const {
  network,
  getContract,
  setDeploymentsPath,
  setPublishPath,
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_CAPS, WNATIVE, ASSETS } = require("./utils_polygon");
const { UMA_CONTRACTS } = require("../const");

const { deployAssetsAccountant } = require("../tasks/deployAssetsAccountant");
const { deployHouseOfCoin } = require("../tasks/deployHouseOfCoin");
const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");
const { deployAccountLiquidator } = require("../tasks/deployAccountLiquidator");
const { deployUMAOracleHelper } = require("../tasks/deployUMAOracleHelper");

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

  const xoc = await getContract("Xocolatl");
  console.log("xoc", xoc.address);
  const accountant = await deployAssetsAccountant();
  const coinhouse = await deployHouseOfCoin(
    xoc.address,
    accountant.address
  );
  const reservehouse = await deployHouseOfReserve(
    "HouseOfReserveWETH",
    ASSETS.polygon.weth.address,
    xoc.address,
    accountant.address,
    "MXN",
    "ETH",
    WNATIVE
  );
  const liquidator = await deployAccountLiquidator(
    coinhouse.address,
    accountant.address
  );
  const sixhours = 6 * 60 * 60;
  const umahelper = await deployUMAOracleHelper(
    ASSETS.polygon.weth.address,
    UMA_CONTRACTS.polygon.finder.address,
    UMA_CONTRACTS.priceIdentifiers.mxnusd,
    sixhours
  );

  await setUpHouseOfCoin(
    coinhouse
  );

  await setUpHouseOfReserve(
    reservehouse,
    RESERVE_CAPS.weth.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    reservehouse,
    umahelper.address
  );

  await setUpAssetsAccountant(
    accountant,
    coinhouse.address,
    reservehouse.address,
    liquidator.address  
  );

  await setUpAccountLiquidator(liquidator);

  // This permissions are granted via de multisig.
  // await systemPermissionGranting(
  //   xoc,
  //   coinhouse.address,
  //   liquidator.address
  // );

  await rolesHandOverAssetsAccountant(accountant);
  await handOverDefaultAdmin(coinhouse);
  await handOverDefaultAdmin(reservehouse);
  await handOverDefaultAdmin(liquidator);
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