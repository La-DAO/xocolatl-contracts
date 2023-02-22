const { 
  network,
  setDeploymentsPath,
  setPublishPath, 
  publishUpdates
} = require("../utils");

const { VERSION } = require("./utils_goerli");

const { upgradeHouseOfReserve } = require("../tasks/upgradeHouseOfReserve");

const upgradeReserveHouseWBTC = async () => {
  console.log("\n\n 📡 UpgradingHouseOfReserve...\n");
  const implementationAddr = await upgradeHouseOfReserve(
    'HouseOfReserveWBTC'
  );
  console.log("New implementation address:", implementationAddr);
}

const main = async () => {
  if (network !== "goerli") {
    throw new Error("Set 'NETWORK=goerli' in .env file");
  }
  await setDeploymentsPath(VERSION);
  await setPublishPath(VERSION);
  await upgradeReserveHouseWBTC();
  await publishUpdates();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });