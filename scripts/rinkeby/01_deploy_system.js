const { network, setDeploymentsPath, getContract } = require("../utils");
const { VERSION, RESERVE_ASSETS, WETH } = require("./utils_rinkeby");

const { deployAssetsAccountant } = require("../tasks/deployAssetsAccountant");
const { deployHouseOfCoin } = require("../tasks/deployHouseOfCoin");
const { deployHouseOfReserve } = require("../tasks/deployHouseOfReserve");

const { setUpAssetsAccountant } = require("../tasks/setUpAssetsAccountant");
const { initialSetUpHouseOfCoin, initialPermissionGranting } = require("../tasks/setUpHouseOfCoin");
const { setUpHouseOfReserve } = require("../tasks/setUpHouseOfReserve");
const { ethers } = require("hardhat");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl");
  const accountant = await deployAssetsAccountant();
  const coinhouse = await deployHouseOfCoin();
  const reservehouse = await deployHouseOfReserve("HouseOfReserveWETH");

  await initialSetUpHouseOfCoin(
    coinhouse,
    xoc.address,
    accountant.address,
    "MXN",
    "ETH"
  );

  await setUpHouseOfReserve(
    reservehouse,
    RESERVE_ASSETS.weth.address,
    xoc.address,
    accountant.address,
    "MXN",
    "ETH",
    WETH,
    RESERVE_ASSETS.weth.defaultInitialLimit
  );

  await setUpAssetsAccountant(
    accountant,
    coinhouse.address, 
    xoc.address,
    reservehouse.address,
    RESERVE_ASSETS.weth.address
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
  await deploySystemContracts();
};


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });