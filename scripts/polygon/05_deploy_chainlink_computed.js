const { 
  network,
  setDeploymentsPath,
  setPublishPath, 
  publishUpdates
} = require("../utils");

const { VERSION } = require("./utils_polygon");
const {CHAINLINK_CONTRACTS} = require("./../const");
const { deployChainlinkComputed } = require("../tasks/deployChainlinkComputed");

const deployChainLinkComputedwstETHUSD = async () => {
  console.log("\n\n 📡 Deploying...\n");
  const wstethusd = await deployChainlinkComputed(
    "ChainlinkComputedOracle_WSTETH_USD",
    "wsteth/usd computed",
    8,
    CHAINLINK_CONTRACTS.polygon.wstetheth,
    CHAINLINK_CONTRACTS.polygon.ethusd,
    86400
  );
}

const main = async () => {
  if (network !== "polygon") {
    throw new Error("Set 'NETWORK=polygon' in .env file");
  }
  await setDeploymentsPath(VERSION);
  await setPublishPath(VERSION);
  await deployChainLinkComputedwstETHUSD();
  await publishUpdates();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\n${error}\n`);
    process.exit(1);
  });