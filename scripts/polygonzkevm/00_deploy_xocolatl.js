const {network, setDeploymentsPath, setPublishPath, publishUpdates} = require("../utils");

const {VERSION} = require("./utils_polygonzkevm");

const {deployXocolatl} = require("../tasks/deployXocolatl");

const deployBackedAsset = async () => {
    console.log("\n\n 📡 Deploying...\n");
    const xoc = await deployXocolatl();
};

const main = async () => {
    if (network !== "polygonzkevm") {
        throw new Error("Set 'NETWORK=polygonzkevm' in .env file");
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
