const { 
  network,
  setDeploymentsPath,
  setPublishPath, 
  publishUpdates
} = require("../utils");

const { VERSION, RESERVE_ASSETS } = require("./utils_rinkeby");

const { deployXocolatl } = require("../tasks/deployXocolatl");

const deployBackedAsset = async () => {
  console.log("\n\n 📡 Deploying...\n");
  const xoc = await deployXocolatl();
}

const main = async () => {
  if (network !== "rinkeby") {
    throw new Error("Set 'NETWORK=rinkeby' in .env file");
  }
  await setDeploymentsPath(VERSION);
  await setPublishPath(VERSION);
  await deployBackedAsset();
  await publishUpdates();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });