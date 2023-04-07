const { 
  network,
  setDeploymentsPath,
  setPublishPath, 
  publishUpdates
} = require("../utils");

const { VERSION } = require("./utils_polygon");

const { upgradeHouseOfCoin } = require("../tasks/upgradeHouseOfCoin");

const upgradeCoinhouse = async () => {
  console.log("\n\n 📡 UpgradingHouseOfCoin...\n");
  const implementationAddr = await upgradeHouseOfCoin();
  console.log("New implementation address:", implementationAddr);
}

const main = async () => {
  if (network !== "polygon") {
    throw new Error("Set 'NETWORK=polygon' in .env file");
  }
  await setDeploymentsPath(VERSION);
  await setPublishPath(VERSION);
  await upgradeCoinhouse();
  await publishUpdates();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });