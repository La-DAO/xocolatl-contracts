const { ethers, upgrades } = require("hardhat");
const {
  ASSETS,
  CHAINLINK_CONTRACTS,
  TLATLALIANI_CONTRACTS,
} = require("../../../scripts/const");

const polygonFixture = async () => {
  const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
  const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
  const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
  const Xocolatl = await ethers.getContractFactory("Xocolatl");
  const AccountLiquidator = await ethers.getContractFactory(
    "AccountLiquidator"
  );
  const treasury = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf";

  const ComputedPriceFeed = await ethers.getContractFactory(
    "ComputedPriceFeed"
  );
  const InversePriceFeed = await ethers.getContractFactory("InversePriceFeed");

  // 0.- Set-up wrapped-native
  const wnative = await ethers.getContractAt(
    "IERC20",
    ASSETS.polygon.wmatic.address
  );

  // 1.- Deploy all contracts
  const weth = await ethers.getContractAt(
    "IERC20",
    ASSETS.polygon.weth.address
  );

  const inverseFeed = await InversePriceFeed.deploy(
    "inverse mxn/usd",
    8,
    CHAINLINK_CONTRACTS.polygon.mxnusd,
    86400
  );

  const priceFeed = await ComputedPriceFeed.deploy(
    "eth/mxn computed",
    8,
    CHAINLINK_CONTRACTS.polygon.ethusd,
    await inverseFeed.getAddress(), // usd/mxn
    86400
  );

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
    }
  );
  let reservehouse = await upgrades.deployProxy(
    HouseOfReserve,
    [
      await weth.getAddress(),
      await xoc.getAddress(),
      await accountant.getAddress(),
      await priceFeed.getAddress(),
      await wnative.getAddress(),
    ],
    {
      kind: "uups",
    }
  );
  let liquidator = await upgrades.deployProxy(
    AccountLiquidator,
    [await coinhouse.getAddress(), await accountant.getAddress()],
    {
      kind: "uups",
    }
  );

  // 2.- Register houses and allow liquidator
  await accountant.registerHouse(await coinhouse.getAddress());
  await accountant.registerHouse(await reservehouse.getAddress());
  await accountant.allowLiquidator(await liquidator.getAddress(), true);

  // 3.- These calls are needed from the multisig in production
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  const liquidatorRole = await accountant.LIQUIDATOR_ROLE();

  await xoc.grantRole(minter, await coinhouse.getAddress());
  await xoc.grantRole(burner, await coinhouse.getAddress());
  await xoc.grantRole(burner, await liquidator.getAddress());

  await accountant.grantRole(liquidatorRole, await liquidator.getAddress());
  await accountant.grantRole(burner, await liquidator.getAddress());

  // 4.- Assign deposit limit
  const depositLimitAmount = ethers.parseEther("100");
  await reservehouse.setDepositLimit(depositLimitAmount);

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
