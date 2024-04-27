const {NETWORK, getContract, setDeploymentsPath, setPublishPath, publishUpdates} = require("../utils");
const {TREASURY, RESERVE_CAPS, VERSION, WNATIVE} = require("./utils_sepolia");
const {deployAccountLiquidator} = require("../tasks/deployAccountLiquidator");
const {deployAssetsAccountant} = require("../tasks/deployAssetsAccountant");
const {deployHouseOfCoin} = require("../tasks/deployHouseOfCoin");
const {deployHouseOfReserveImplementation} = require("../tasks/deployHouseOfReserve");
const {deployOracleFactory} = require("../tasks/deployOracleFactory");
const {deployOracleImplementations} = require("../tasks/deployOracleImplementations");
const {deployReserveBeaconFactory} = require("../tasks/deployReserveBeaconFactory");
const {ORACLE_CONTRACTS, PYTH_MXN_USD_FEED_ID} = require("../const");
const {rolesHandOverAssetsAccountant, handOverDefaultAdmin, handOverOwnership} = require("../tasks/rolesHandOver");
const {setUpAssetsAccountant} = require("../tasks/setUpAssetsAccountant");
const {setupOracleFactory} = require("../tasks/setupOracleFactory");

const deploySystemContracts = async () => {
    console.log("\n\n 📡 Deploying...\n");
    xoc = await getContract("Xocolatl", "Xocolatl");
    console.log("xoc", await xoc.getAddress());
    const accountant = await deployAssetsAccountant();
    const coinhouse = await deployHouseOfCoin(await xoc.getAddress(), await accountant.getAddress(), TREASURY);
    const reservehouseImpl = await deployHouseOfReserveImplementation();
    const factory = await deployReserveBeaconFactory(
        await reservehouseImpl.getAddress(),
        await xoc.getAddress(),
        await accountant.getAddress(),
        WNATIVE,
    );
    const liquidator = await deployAccountLiquidator(await coinhouse.getAddress(), await accountant.getAddress());

    await setUpAssetsAccountant(
        accountant,
        await coinhouse.getAddress(),
        await liquidator.getAddress(),
        await factory.getAddress(),
    );

    const {computedPriceFeedImpl, invPriceFeedImpl, priceFeedPythWrapperImpl} = await deployOracleImplementations([
        "ComputedPriceFeed",
        "InversePriceFeed",
        "PriceFeedPythWrapper",
    ]);
    const oracleFactory = await deployOracleFactory();
    await setupOracleFactory(oracleFactory, computedPriceFeedImpl, invPriceFeedImpl, priceFeedPythWrapperImpl);

    const pythWrapperAddr = await oracleFactory.createPriceFeedPythWrapper.staticCall(
        "pyth usdmxn",
        8,
        ORACLE_CONTRACTS.sepolia.pyth,
        PYTH_MXN_USD_FEED_ID,
        86400,
    );
    const dtx1 = await oracleFactory.createPriceFeedPythWrapper(
        "pyth usdmxn",
        8,
        ORACLE_CONTRACTS.sepolia.pyth,
        PYTH_MXN_USD_FEED_ID,
        86400,
    );
    await dtx1.wait();
    console.log("... pythWrapperAddr", pythWrapperAddr);

    const computedPriceAddr = await oracleFactory.createComputedPriceFeed.staticCall(
        "computed ethmxn",
        8,
        pythWrapperAddr,
        ORACLE_CONTRACTS.sepolia.ethusd,
        86400,
    );
    const dtx2 = await oracleFactory.createComputedPriceFeed(
        "computed ethmxn",
        8,
        pythWrapperAddr,
        ORACLE_CONTRACTS.sepolia.ethusd,
        86400,
    );
    await dtx2.wait();
    console.log("... computedPriceAddr", computedPriceAddr);

    const reserveAddr = await factory.deployHouseOfReserve.staticCall(
        WNATIVE,
        computedPriceAddr,
        ethers.parseUnits("0.8", 18),
        ethers.parseUnits("0.85", 18),
        ethers.parseEther("100"),
        15000, // 150 bps
    );
    const dtx3 = await factory.deployHouseOfReserve(
        WNATIVE,
        computedPriceAddr,
        ethers.parseUnits("0.8", 18),
        ethers.parseUnits("0.85", 18),
        RESERVE_CAPS.weth.defaultInitialLimit,
        15000, // 150 bps
    );
    await dtx3.wait();
    console.log("... reserveAddr", reserveAddr);

    const reservehouse = await ethers.getContractAt("HouseOfReserve", reserveAddr);

    await rolesHandOverAssetsAccountant(accountant);
    await handOverDefaultAdmin(coinhouse);
    await handOverOwnership(factory);
    await handOverOwnership(oracleFactory);
    await handOverDefaultAdmin(liquidator);
    await handOverDefaultAdmin(reservehouse);

    // In addition the multisig needs to queue
};

const main = async () => {
    if (NETWORK !== "sepolia") {
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
