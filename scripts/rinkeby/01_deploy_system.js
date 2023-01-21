const { 
  network,
  getContract,
  setDeploymentsPath,
  setPublishPath, 
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_CAPS, WNATIVE, ASSETS } = require("./utils_rinkeby");

const { deployAssetsAccountant } = require("../tasks/deployAssetsAccountant");
const { deployHouseOfCoin } = require("../tasks/deployHouseOfCoin");
const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");

const { setUpAssetsAccountant } = require("../tasks/setUpAssetsAccountant");
const { initialSetUpHouseOfCoin, initialPermissionGranting } = require("../tasks/setUpHouseOfCoin");
const { setUpHouseOfReserve } = require("../tasks/setUpHouseOfReserve");
const { ethers } = require("hardhat");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl", "Xocolatl");
  const accountant = await deployAssetsAccountant();
  const coinhouse = await deployHouseOfCoin();
  const reservehouse = await deployHouseOfReserve("HouseOfReserveWETH");

  await initialSetUpHouseOfCoin(
    coinhouse,
    xoc.address,
    accountant.address
  );

  await setUpHouseOfReserve(
    reservehouse,
    ASSETS.rinkeby.weth.address,
    xoc.address,
    accountant.address,
    "MXN",
    "ETH",
    WNATIVE,
    RESERVE_CAPS.weth.defaultInitialLimit
  );

  await setUpAssetsAccountant(
    accountant,
    coinhouse.address, 
    xoc.address,
    reservehouse.address,
    ASSETS.rinkeby.weth.address
  );

  await initialPermissionGranting(
    coinhouse,
    xoc,
    accountant
  );


}

const main = async () => {
  if (network !== "rinkeby") {
    throw new Error("Set 'NETWORK=rinkeby' in .env file");
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