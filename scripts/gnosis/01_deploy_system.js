const {NETWORK, getContract, setDeploymentsPath, setPublishPath, publishUpdates} = require("../utils");
const {TREASURY, RESERVE_CAPS, VERSION, WNATIVE} = require("./utils_gnosis");
const {deployAccountLiquidator} = require("../tasks/deployAccountLiquidator");
const {deployAssetsAccountant} = require("../tasks/deployAssetsAccountant");
const {deployHouseOfCoin} = require("../tasks/deployHouseOfCoin");
const {deployHouseOfReserveImplementation} = require("../tasks/deployHouseOfReserve");
const {deployOracleFactory} = require("../tasks/deployOracleFactory");
const {deployOracleImplementations} = require("../tasks/deployOracleImplementations");
const {deployReserveBeaconFactory} = require("../tasks/deployReserveBeaconFactory");
const {ORACLE_CONTRACTS, ASSETS} = require("../const");
const {rolesHandOverAssetsAccountant, handOverOwnership} = require("../tasks/rolesHandOver");
const {setUpAssetsAccountant} = require("../tasks/setUpAssetsAccountant");
const {setupOracleFactory} = require("../tasks/setupOracleFactory");
const {deployUsdMxnPythWrapper} = require("../tasks/deployUsdMxnPythWrapper");
const {deployReserveViaFactory} = require("../tasks/deployReserveViaFactory");

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

    const pythWrapperUsdMxn = await deployUsdMxnPythWrapper(oracleFactory, ORACLE_CONTRACTS[NETWORK].pyth);

    const reservehouseWETH = await deployReserveViaFactory(
        factory,
        oracleFactory,
        ASSETS[NETWORK].gnosis.weth.address,
        RESERVE_CAPS.weth.defaultInitialLimit,
        ethers.parseUnits("0.8", 18),
        ethers.parseUnits("0.85", 18),
        15000,
        await pythWrapperUsdMxn.getAddress(),
        ORACLE_CONTRACTS[NETWORK].ethusd,
    );

    const reservehouseGNO = await deployReserveViaFactory(
        factory,
        oracleFactory,
        ASSETS[NETWORK].gnosis.gno.address,
        RESERVE_CAPS.gno.defaultInitialLimit,
        ethers.parseUnits("0.6", 18),
        ethers.parseUnits("0.65", 18),
        15000,
        await pythWrapperUsdMxn.getAddress(),
        ORACLE_CONTRACTS[NETWORK].gnousd,
    );

    await rolesHandOverAssetsAccountant(accountant);
    await handOverOwnership(coinhouse);
    await handOverOwnership(factory);
    await handOverOwnership(oracleFactory);
    await handOverOwnership(liquidator);
    await handOverOwnership(reservehouseWETH);
    await handOverOwnership(reservehouseGNO);

    // In addition the multisig needs to queue
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
    if (NETWORK !== "gnosis") {
        throw new Error("Set 'NETWORK=gnosis' in .env file");
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
