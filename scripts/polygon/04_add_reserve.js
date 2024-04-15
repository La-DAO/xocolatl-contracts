const {ethers} = require("hardhat");

const {network, getContract, setDeploymentsPath, setPublishPath, publishUpdates} = require("../utils");

const {VERSION, RESERVE_CAPS, WNATIVE, ASSETS} = require("./utils_polygon");

const {deployHouseOfReserve} = require("../tasks/deployHouseOfReserve");

const {setUpHouseOfReserve, setUpOraclesHouseOfReserve} = require("../tasks/setUpHouseOfReserve");
const {CHAINLINK_CONTRACTS} = require("../const");

const deploySystemContracts = async () => {
    console.log("\n\n 📡 Deploying...\n");

    const xoc = await getContract("Xocolatl", "Xocolatl");
    console.log("xoc", await xoc.getAddress());
    const accountant = await getContract("AssetsAccountant", "AssetsAccountant");
    console.log("accountant", await accountant.getAddress());

    // WBTC
    const reservehouseWBTC = await deployHouseOfReserve(
        "HouseOfReserveWBTC",
        ASSETS.polygon.wbtc.address,
        await xoc.getAddress(),
        await accountant.getAddress(),
        "MXN",
        "WBTC",
        WNATIVE,
    );

    await setUpHouseOfReserve(reservehouseWBTC, RESERVE_CAPS.wbtc.defaultInitialLimit);

    await setUpOraclesHouseOfReserve(reservehouseWBTC, ethers.ZeroAddress, CHAINLINK_CONTRACTS.polygon.wbtcusd);

    ///@dev this following tx needs to be submitted via the multisig.

    // const stx = await accountant.registerHouse(
    //   reservehouseWBTC.address
    // );
    // await stx.wait();
    // console.log("...House of Reserve registered in AssetsAccountant");

    // WMATIC
    const reservehouseWMATIC = await deployHouseOfReserve(
        "HouseOfReserveWMATIC",
        ASSETS.polygon.wmatic.address,
        await xoc.getAddress(),
        await accountant.getAddress(),
        "MXN",
        "WMATIC",
        WNATIVE,
    );

    await setUpHouseOfReserve(reservehouseWMATIC, RESERVE_CAPS.wmatic.defaultInitialLimit);

    await setUpOraclesHouseOfReserve(reservehouseWMATIC, ethers.ZeroAddress, CHAINLINK_CONTRACTS.polygon.maticusd);

    // wstETH
    const reservehouseWSTETH = await deployHouseOfReserve(
        "HouseOfReserveWSTETH",
        ASSETS.polygon.wsteth.address,
        await xoc.getAddress(),
        await accountant.getAddress(),
        "MXN",
        "WSTETH",
        WNATIVE,
    );

    await setUpHouseOfReserve(reservehouseWSTETH, RESERVE_CAPS.wsteth.defaultInitialLimit);

    await setUpOraclesHouseOfReserve(reservehouseWSTETH, ethers.ZeroAddress, CHAINLINK_CONTRACTS.polygon.wstethusd);

    // MATICX
    const reservehouseMATICX = await deployHouseOfReserve(
        "HouseOfReserveMATICX",
        ASSETS.polygon.maticx.address,
        await xoc.getAddress(),
        await accountant.getAddress(),
        "MXN",
        "MATICX",
        WNATIVE,
    );

    await setUpHouseOfReserve(reservehouseMATICX, RESERVE_CAPS.maticx.defaultInitialLimit);

    await setUpOraclesHouseOfReserve(reservehouseMATICX, ethers.ZeroAddress, CHAINLINK_CONTRACTS.polygon.maticxusd);

    ///@dev this following tx needs to be submitted via the multisig.

    // const stx = await accountant.registerHouse(
    //   reservehouseWMATIC.address
    // );
    // await stx.wait();
    // console.log("...House of Reserve registered in AssetsAccountant");
};

const main = async () => {
    if (network !== "polygon") {
        throw new Error("Set 'NETWORK=polygon' in .env file");
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
