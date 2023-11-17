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

const { setUpHouseOfReserve, setUpOraclesHouseOfReserve } = require("../tasks/setUpHouseOfReserve");
const { CHAINLINK_CONTRACTS } = require("../const");

const deploySystemContracts = async () => {
  console.log("\n\n 📡 Deploying...\n");

  const xoc = await getContract("Xocolatl", "Xocolatl");
  console.log("xoc", (await xoc.getAddress()));
  const accountant = await getContract("AssetsAccountant", "AssetsAccountant");
  console.log("accountant", (await accountant.getAddress()));

  const reservehouse = await deployHouseOfReserve(
    "HouseOfReserveWBTC",
    ASSETS.goerli.wbtc.address,
    (await xoc.getAddress()),
    (await accountant.getAddress()),
    "MXN",
    "WBTC",
    WNATIVE
  );

  await setUpHouseOfReserve(
    reservehouse,
    RESERVE_CAPS.wbtc.defaultInitialLimit
  );

  await setUpOraclesHouseOfReserve(
    reservehouse,
    ethers.ZeroAddress,
    CHAINLINK_CONTRACTS.goerli.btcusd
  );

  const stx2 = await accountant.registerHouse(
    (await reservehouse.getAddress())
  );
  await stx2.wait();
  console.log("...House of Reserve registered in AssetsAccountant");
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