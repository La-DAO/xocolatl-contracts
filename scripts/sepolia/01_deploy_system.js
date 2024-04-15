const {ethers} = require("hardhat");

const {network, getContract, setDeploymentsPath, setPublishPath, publishUpdates} = require("../utils");

const {VERSION, RESERVE_CAPS, WNATIVE, ASSETS} = require("./utils_sepolia");
// const { UMA_CONTRACTS } = require("../const");

const {deployAssetsAccountant} = require("../tasks/deployAssetsAccountant");
const {deployHouseOfCoin} = require("../tasks/deployHouseOfCoin");
const {deployHouseOfReserve} = require("../tasks/deployHouseOfReserve");
const {deployAccountLiquidator} = require("../tasks/deployAccountLiquidator");
// const { deployUMAOracleHelper } = require("../tasks/deployUMAOracleHelper");

const {systemPermissionGranting} = require("../tasks/setUpXocolatl");
const {setUpAssetsAccountant} = require("../tasks/setUpAssetsAccountant");
const {setUpHouseOfReserve, setUpOraclesHouseOfReserve} = require("../tasks/setUpHouseOfReserve");

const {rolesHandOverAssetsAccountant, handOverDefaultAdmin} = require("../tasks/rolesHandOver");
const {CHAINLINK_CONTRACTS} = require("../const");

const deploySystemContracts = async () => {
    console.log("\n\n 📡 Deploying...\n");

    const xoc = await getContract("Xocolatl", "Xocolatl");
    console.log("xoc", await xoc.getAddress());
    const accountant = await deployAssetsAccountant();
    const coinhouse = await deployHouseOfCoin(await xoc.getAddress(), await accountant.getAddress());
    const reservehouse = await deployHouseOfReserve(
        "HouseOfReserveWETH",
        ASSETS.sepolia.weth.address,
        await xoc.getAddress(),
        await accountant.getAddress(),
        "MXN",
        "ETH",
        WNATIVE,
    );
    const liquidator = await deployAccountLiquidator(await coinhouse.getAddress(), await accountant.getAddress());
    // const sixhours = 6 * 60 * 60;
    // const umahelper = await deployUMAOracleHelper(
    //   ASSETS.sepolia.weth.address,
    //   UMA_CONTRACTS.sepolia.finder.address,
    //   UMA_CONTRACTS.priceIdentifiers.mxnusd,
    //   sixhours
    // );

    await setUpHouseOfReserve(reservehouse, RESERVE_CAPS.weth.defaultInitialLimit);

    await setUpOraclesHouseOfReserve(reservehouse, ethers.ZeroAddress, CHAINLINK_CONTRACTS.sepolia.ethusd);

    await setUpAssetsAccountant(
        accountant,
        await coinhouse.getAddress(),
        await reservehouse.getAddress(),
        await liquidator.getAddress(),
    );

    await systemPermissionGranting(xoc, await coinhouse.getAddress(), await liquidator.getAddress());

    // await rolesHandOverAssetsAccountant(accountant);
    // await handOverDefaultAdmin(coinhouse);
    // await handOverDefaultAdmin(reservehouse);
    // await handOverDefaultAdmin(liquidator);
};

const main = async () => {
    if (network !== "sepolia") {
        throw new Error("Set 'NETWORK=sepolia' in .env file");
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
