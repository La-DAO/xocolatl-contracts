const {
  network,
  getContract,
  setDeploymentsPath,
  setPublishPath,
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_CAPS, WNATIVE, ASSETS } = require("./utils_polygon");
const { UMA_CONTRACTS, CHAINLINK_CONTRACTS } = require("../const");

const { deployAssetsAccountant } = require("../tasks/deployAssetsAccountant");
const { deployHouseOfCoin } = require("../tasks/deployHouseOfCoin");
const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");
const { deployAccountLiquidator } = require("../tasks/deployAccountLiquidator");
const { deployUMAOracleHelper } = require("../tasks/deployUMAOracleHelper");

// const { systemPermissionGranting } = require("../tasks/setUpXocolatl");
const { setUpAssetsAccountant } = require("../tasks/setUpAssetsAccountant");
const { setUpHouseOfReserve, setUpOraclesHouseOfReserve } = require("../tasks/setUpHouseOfReserve");

const {
  rolesHandOverAssetsAccountant,
  handOverDefaultAdmin
} = require("../tasks/rolesHandOver");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl", "Xocolatl");
  console.log("xoc", (await xoc.getAddress()));
  const accountant = await deployAssetsAccountant();
  const coinhouse = await deployHouseOfCoin(
    (await xoc.getAddress()),
    (await accountant.getAddress())
  );
  const reservehouse = await deployHouseOfReserve(
    "HouseOfReserveWETH",
    ASSETS.polygon.weth.address,
    (await xoc.getAddress()),
    (await accountant.getAddress()),
    "MXN",
    "ETH",
    WNATIVE
  );
  const liquidator = await deployAccountLiquidator(
    (await coinhouse.getAddress()),
    (await accountant.getAddress())
  );
  const sixhours = 6 * 60 * 60;
  const umahelper = await deployUMAOracleHelper(
    ASSETS.polygon.weth.address,
    UMA_CONTRACTS.polygon.finder.address,
    UMA_CONTRACTS.priceIdentifiers.mxnusd,
    sixhours
  );

  await setUpHouseOfReserve(
    reservehouse,
    RESERVE_CAPS.weth.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    reservehouse,
    (await umahelper.getAddress()),
    CHAINLINK_CONTRACTS.polygon.ethusd
  );

  await setUpAssetsAccountant(
    accountant,
    (await coinhouse.getAddress()),
    (await reservehouse.getAddress()),
    (await liquidator.getAddress())  
  );

  // This permissions are granted via de multisig.
  // await systemPermissionGranting(
  //   xoc,
  //   (await coinhouse.getAddress()),
  //   (await liquidator.getAddress())
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