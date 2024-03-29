const {ethers, upgrades} = require("hardhat");

const WETH_MXN_PRICE = ethers.parseUnits("30000", 8);

async function basicFixture() {
    const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
    const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
    const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
    const ReserveBeaconFactory = await ethers.getContractFactory("ReserveBeaconFactory");
    const Xocolatl = await ethers.getContractFactory("Xocolatl");
    const AccountLiquidator = await ethers.getContractFactory("AccountLiquidator");
    const treasury = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf";

    // 0.- Set-up mocks
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const weth = await MockWETH.deploy();
    const MockFeed = await ethers.getContractFactory("MockChainlinkPriceFeed");
    const priceFeed = await MockFeed.deploy("mockFeed weth/mxn", 8);
    await priceFeed.requestPriceFeedData();
    await priceFeed.setPriceFeedData(WETH_MXN_PRICE);

    // 1.- Deploy all contracts
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
        await weth.getAddress(),
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

    // 3.- Assign proper roles
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

    return {
        accountant,
        coinhouse,
        reservehouse,
        liquidator,
        xoc,
        weth,
        priceFeed,
        treasury,
    };
}

module.exports = {
    basicFixture,
    WETH_MXN_PRICE,
};
