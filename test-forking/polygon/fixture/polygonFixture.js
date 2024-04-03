const {ethers, upgrades} = require("hardhat");
const {ASSETS, CHAINLINK_CONTRACTS, TLATLALIANI_CONTRACTS} = require("../../../scripts/const");

const polygonFixture = async function () {
    const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
    const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
    const ReserveBeaconFactory = await ethers.getContractFactory("ReserveBeaconFactory");
    const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
    const Xocolatl = await ethers.getContractFactory("Xocolatl");
    const AccountLiquidator = await ethers.getContractFactory("AccountLiquidator");
    const OracleFactory = await ethers.getContractFactory("OracleFactory");
    const InversePriceFeed = await ethers.getContractFactory("InversePriceFeed");
    const ComputedPriceFeed = await ethers.getContractFactory("ComputedPriceFeed");
    const PriceFeedPythWrapper = await ethers.getContractFactory("PriceFeedPythWrapper");

    const treasury = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf";

    // 0.- Set-up wrapped-native
    const wnative = await ethers.getContractAt("IERC20", ASSETS.polygon.wmatic.address);

    // 1.- Deploy all contracts
    const weth = await ethers.getContractAt("IERC20", ASSETS.polygon.weth.address);

    const oracleFactory = await OracleFactory.deploy();
    const ipricefeedImpl = await InversePriceFeed.deploy();
    const cpricefeedImpl = await ComputedPriceFeed.deploy();
    const pythWrapperImpl = await PriceFeedPythWrapper.deploy();
    await oracleFactory.setInversePriceFeedImpl(await ipricefeedImpl.getAddress());
    await oracleFactory.setComputedPriceFeedImpl(await cpricefeedImpl.getAddress());
    await oracleFactory.setPriceFeedPythWrapperImpl(await pythWrapperImpl.getAddress());

    const inverseFeedArgs = ["inverse mxn/usd", 8, CHAINLINK_CONTRACTS.polygon.mxnusd, 86400];
    const inverseFeedAddress = await oracleFactory.createInversePriceFeed.staticCall(...inverseFeedArgs);
    await oracleFactory.createInversePriceFeed(...inverseFeedArgs);
    const inverseFeed = await ethers.getContractAt("InversePriceFeed", inverseFeedAddress);

    const priceFeedArgs = ["eth/mxn", 8, CHAINLINK_CONTRACTS.polygon.ethusd, await inverseFeed.getAddress(), 86400];
    const priceFeedAddress = await oracleFactory.createComputedPriceFeed.staticCall(...priceFeedArgs);
    await oracleFactory.createComputedPriceFeed(...priceFeedArgs);
    const priceFeed = await ethers.getContractAt("ComputedPriceFeed", priceFeedAddress);

    let xoc = await upgrades.deployProxy(Xocolatl, [], {
        kind: "uups",
        unsafeAllow: ["delegatecall"],
    });
    let accountant = await upgrades.deployProxy(AssetsAccountant, [], {
        kind: "uups",
    });
    let coinhouse = await upgrades.deployProxy(
        HouseOfCoin,
        [await xoc.getAddress(), await accountant.getAddress(), treasury],
        {
            kind: "uups",
        },
    );
    let reservehouseImpl = await HouseOfReserve.deploy();
    let factory = await ReserveBeaconFactory.deploy(
        await reservehouseImpl.getAddress(),
        await xoc.getAddress(),
        await accountant.getAddress(),
        await wnative.getAddress(),
    );

    let liquidator = await upgrades.deployProxy(
        AccountLiquidator,
        [await coinhouse.getAddress(), await accountant.getAddress()],
        {
            kind: "uups",
        },
    );

    // 2.- Register houses and allow liquidator
    await accountant.registerHouse(await coinhouse.getAddress());
    await accountant.allowLiquidator(await liquidator.getAddress(), true);

    // 3.- These calls are needed from the multisig in production
    const admin = await xoc.DEFAULT_ADMIN_ROLE();
    const minter = await xoc.MINTER_ROLE();
    const burner = await xoc.BURNER_ROLE();
    const liquidatorRole = await accountant.LIQUIDATOR_ROLE();

    await xoc.grantRole(minter, await coinhouse.getAddress());
    await xoc.grantRole(burner, await coinhouse.getAddress());
    await xoc.grantRole(burner, await liquidator.getAddress());

    await accountant.grantRole(admin, await factory.getAddress());
    await accountant.grantRole(liquidatorRole, await liquidator.getAddress());
    await accountant.grantRole(burner, await liquidator.getAddress());

    // 4.- Deploy a reservehouse
    const depositLimit = ethers.parseEther("100");
    const maxLtv = ethers.parseUnits("0.75", 18);
    const liqFactor = ethers.parseUnits("0.8", 18);
    const reserveFee = 0; // 0%

    const reservehouseAddr = await factory.deployHouseOfReserve.staticCall(
        await weth.getAddress(),
        await priceFeed.getAddress(),
        maxLtv,
        liqFactor,
        depositLimit,
        reserveFee,
    );
    await factory.deployHouseOfReserve(
        await weth.getAddress(),
        await priceFeed.getAddress(),
        maxLtv,
        liqFactor,
        depositLimit,
        reserveFee,
    );
    const reservehouse = await ethers.getContractAt("HouseOfReserve", reservehouseAddr);

    console.log("\tCompleted fixture routine!");

    return {
        accountant,
        coinhouse,
        reservehouse,
        liquidator,
        xoc,
        weth,
        inverseFeed,
        priceFeed,
    };
};

module.exports = {
    polygonFixture,
};
