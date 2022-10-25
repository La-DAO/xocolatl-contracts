const {
  network,
  getContract,
  setDeploymentsPath,
  setPublishPath,
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_CAPS, WNATIVE, ASSETS } = require("./utils_gnosis");
const { UMA_CONTRACTS } = require("../const");

const { deployAssetsAccountant } = require("../tasks/deployAssetsAccountant");
const { deployHouseOfCoin } = require("../tasks/deployHouseOfCoin");
const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");
const { deployUMAOracleHelper } = require("../tasks/deployUMAOracleHelper");

const { setUpAssetsAccountant } = require("../tasks/setUpAssetsAccountant");
const { initialSetUpHouseOfCoin, initialPermissionGranting } = require("../tasks/setUpHouseOfCoin");
const { setUpHouseOfReserve, setUpOraclesHouseOfReserve } = require("../tasks/setUpHouseOfReserve");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl");
  const accountant = await deployAssetsAccountant();
  const coinhouse = await deployHouseOfCoin();
  const reservehouse = await deployHouseOfReserve("HouseOfReserveWETH");

  // UMAHelper not deployed on gnosis

  // const sixhours = 6 * 60 * 60;
  // const umahelper = await deployUMAOracleHelper(
  //   ASSETS.gnosis.weth.address,
  //   UMA_CONTRACTS.gnosis.finder.address,
  //   UMA_CONTRACTS.priceIdentifiers.mxnusd,
  //   sixhours
  // );

  await initialSetUpHouseOfCoin(
    coinhouse,
    xoc.address,
    accountant.address
  );

  await setUpHouseOfReserve(
    reservehouse,
    ASSETS.gnosis.wxdai.address,
    xoc.address,
    accountant.address,
    "MXN",
    "WXDAI",
    WNATIVE,
    RESERVE_CAPS.weth.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    'gnosis',
    reservehouse,
    'daiusd',
    '0x0000000000000000000000000000000000000000' // UMAHelper not deployed on gnosis
  );

  await setUpAssetsAccountant(
    accountant,
    coinhouse.address,
    xoc.address,
    reservehouse.address,
    ASSETS.gnosis.weth.address
  );

  // Permission granting must be done via the MultiSig.

  // await initialPermissionGranting(
  //   coinhouse,
  //   xoc,
  //   accountant
  // );


}

const main = async () => {
  if (network !== "gnosis") {
    throw new Error("Set 'NETWORK=gnosis' in .env file");
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