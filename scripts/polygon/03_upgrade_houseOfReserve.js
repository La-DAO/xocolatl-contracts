const {network, setDeploymentsPath, setPublishPath, publishUpdates} = require("../utils");

const {VERSION} = require("./utils_polygon");

const {upgradeHouseOfReserve} = require("../tasks/upgradeHouseOfReserve");

const upgradeReserveHouse = async () => {
    console.log("\n\n 📡 UpgradingHouseOfReserve...\n");
    const implementationAddr = await upgradeHouseOfReserve("HouseOfReserveWETH");
    console.log("New implementation address:", implementationAddr);
};

const main = async () => {
    if (network !== "polygon") {
        throw new Error("Set 'NETWORK=polygon' in .env file");
    }
    await setDeploymentsPath(VERSION);
    await setPublishPath(VERSION);
    await upgradeReserveHouse();
    await publishUpdates();
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`\n${error}\n`);
        process.exit(1);
    });
