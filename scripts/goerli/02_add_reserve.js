const { ethers } = require("hardhat");

const {
  network,
  getContract,
  setDeploymentsPath,
  setPublishPath,
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_CAPS, WNATIVE, ASSETS } = require("./utils_goerli");

const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");

const { systemPermissionGranting } = require("../tasks/setUpXocolatl");
const { setUpAssetsAccountant } = require("../tasks/setUpAssetsAccountant");
const { setUpHouseOfReserve, setUpOraclesHouseOfReserve } = require("../tasks/setUpHouseOfReserve");
const { CHAINLINK_CONTRACTS } = require("../const");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl", "Xocolatl");
  console.log("xoc", xoc.address);
  const accountant = await getContract("AssetsAccountant", "AssetsAccountant");

  const reservehouse = await deployHouseOfReserve(
    "HouseOfReserveWBTC",
    ASSETS.goerli.wbtc.address,
    xoc.address,
    accountant.address,
    "MXN",
    "WBTC",
    WNATIVE
  );
  const liquidator = await deployAccountLiquidator(
    coinhouse.address,
    accountant.address
  );

  await setUpHouseOfReserve(
    reservehouse,
    RESERVE_CAPS.weth.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    reservehouse,
    ethers.constants.AddressZero,
    CHAINLINK_CONTRACTS.goerli.btcusd
  );

  await setUpAssetsAccountant(
    accountant,
    coinhouse.address,
    reservehouse.address,
    liquidator.address  
  );

  await systemPermissionGranting(
    xoc,
    coinhouse.address,
    liquidator.address
  );

  // await rolesHandOverAssetsAccountant(accountant);
  // await handOverDefaultAdmin(coinhouse);
  // await handOverDefaultAdmin(reservehouse);
  // await handOverDefaultAdmin(liquidator);
}


const main = async () => {
  if (network !== "goerli") {
    throw new Error("Set 'NETWORK=goerli' in .env file");
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