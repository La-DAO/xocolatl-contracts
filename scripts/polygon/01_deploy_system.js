const {NETWORK, getContract, setDeploymentsPath, setPublishPath, publishUpdates} = require("../utils");
const {TREASURY, RESERVE_CAPS, VERSION, WNATIVE} = require("./utils_polygon");
const {deployAccountLiquidator} = require("../tasks/deployAccountLiquidator");
const {deployAssetsAccountant} = require("../tasks/deployAssetsAccountant");
const {deployHouseOfCoin} = require("../tasks/deployHouseOfCoin");
const {deployHouseOfReserveImplementation} = require("../tasks/deployHouseOfReserve");
const {deployOracleFactory} = require("../tasks/deployOracleFactory");
const {deployOracleImplementations} = require("../tasks/deployOracleImplementations");
const {deployReserveBeaconFactory} = require("../tasks/deployReserveBeaconFactory");
const {ASSETS, ORACLE_CONTRACTS} = require("../const");
const {rolesHandOverAssetsAccountant, handOverOwnership} = require("../tasks/rolesHandOver");
const {setUpAssetsAccountant} = require("../tasks/setUpAssetsAccountant");
const {setupOracleFactory} = require("../tasks/setupOracleFactory");
const {deployUsdMxnPythWrapper} = require("../tasks/deployUsdMxnPythWrapper");
const {deployReserveViaFactory} = require("../tasks/deployReserveViaFactory");
const {ethers} = require("hardhat");

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

    await deployUsdMxnPythWrapper(oracleFactory, ORACLE_CONTRACTS[NETWORK].pyth);

    const invUsdMxnAddr = await oracleFactory.createInversePriceFeed.staticCall(
        "USD/MXN",
        8,
        ORACLE_CONTRACTS[NETWORK].mxnusd,
        86400,
    );

    let tx = await oracleFactory.createInversePriceFeed("USD/MXN", 8, ORACLE_CONTRACTS[NETWORK].mxnusd, 86400);
    await tx.wait();

    const reservehouseWeth = await deployReserveViaFactory(
        factory,
        oracleFactory,
        ASSETS[NETWORK].weth.address,
        RESERVE_CAPS.weth.defaultInitialLimit,
        ethers.parseUnits("0.8", 18),
        ethers.parseUnits("0.85", 18),
        15000,
        invUsdMxnAddr,
        ORACLE_CONTRACTS[NETWORK].ethusd,
        "weth/mxn",
    );

    const reservehouseWmatic = await deployReserveViaFactory(
        factory,
        oracleFactory,
        ASSETS[NETWORK].wmatic.address,
        RESERVE_CAPS.wmatic.defaultInitialLimit,
        ethers.parseUnits("0.68", 18),
        ethers.parseUnits("0.75", 18),
        15000,
        invUsdMxnAddr,
        ORACLE_CONTRACTS[NETWORK].wmaticusd,
        "wmatic/mxn",
    );

    const reservehouseMaticX = await deployReserveViaFactory(
        factory,
        oracleFactory,
        ASSETS[NETWORK].maticx.address,
        RESERVE_CAPS.maticx.defaultInitialLimit,
        ethers.parseUnits("0.50", 18),
        ethers.parseUnits("0.60", 18),
        15000,
        invUsdMxnAddr,
        ORACLE_CONTRACTS[NETWORK].maticxusd,
        "maticx/mxn",
    );

    await rolesHandOverAssetsAccountant(accountant);
    await handOverOwnership(coinhouse);
    await handOverOwnership(factory);
    await handOverOwnership(oracleFactory);
    await handOverOwnership(liquidator);
    await handOverOwnership(reservehouseWeth);
    await handOverOwnership(reservehouseWmatic);
    await handOverOwnership(reservehouseMaticX);

    // In addition the multisig needs to queue
    // 1.- Xocolatl contract grants minter role to Coinhouse
    // 2.- Xocolatl contract grants burner role to Coinhouse
    // 3.- Xocolatl contract grants burner role to Liquidator
    // For example:
    // await xoc.grantRole(minter, await coinhouse.getAddress());
    // await xoc.grantRole(burner, await coinhouse.getAddress());
    // await xoc.grantRole(burner, await liquidator.getAddress());
};

const main = async () => {
    if (NETWORK !== "polygon") {
        throw new Error("Set 'NETWORK=base' in .env file");
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
