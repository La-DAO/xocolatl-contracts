const { 
  network,
  setDeploymentsPath,
  setPublishPath, 
  publishUpdates
} = require("../utils");

const { VERSION } = require("./utils_polygon");

const { upgradeXocolatl } = require("../tasks/upgradeXocolatl");

const upgradeXoc = async () => {
  console.log("\n\n 📡 UpgradingXocolatl...\n");
  const implementationAddr = await upgradeXocolatl();
  console.log("New implementation address:", implementationAddr);
}

const main = async () => {
  if (network !== "polygon") {
    throw new Error("Set 'NETWORK=polygon' in .env file");
  }
  await setDeploymentsPath(VERSION);
  await setPublishPath(VERSION);
  await upgradeXoc();
  await publishUpdates();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });