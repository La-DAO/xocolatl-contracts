const { ethers, upgrades } = require("hardhat");

const WETH_MXN_PRICE = ethers.parseUnits("30000", 8);

const basicFixture = async () => {
  const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
  const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
  const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
  const Xocolatl = await ethers.getContractFactory("Xocolatl");
  const AccountLiquidator = await ethers.getContractFactory("AccountLiquidator");

  // 0.- Set-up mocks
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  const MockFeed = await ethers.getContractFactory("MockChainlinkPriceFeed");
  const priceFeed = await MockFeed.deploy(
    "mockFeed weth/usd",
    8
  );
  await priceFeed.requestPriceFeedData();
  await priceFeed.setPriceFeedData(
    WETH_MXN_PRICE
  );

  // 1.- Deploy all contracts
  let xoc = await upgrades.deployProxy(Xocolatl, [], {
    kind: 'uups',
    unsafeAllow: [
      'delegatecall'
    ]
  });

  let accountant = await upgrades.deployProxy(AssetsAccountant, [], {
    kind: 'uups',
  });

  let coinhouse = await upgrades.deployProxy(HouseOfCoin,
    [
      await xoc.getAddress(),
      await accountant.getAddress()
    ],
    {
      kind: 'uups',
    }
  );

  let reservehouse = await upgrades.deployProxy(HouseOfReserve,
    [
      await weth.getAddress(),
      await xoc.getAddress(),
      await accountant.getAddress(),
      await priceFeed.getAddress(),
      await weth.getAddress()
    ],
    {
      kind: 'uups',
    }
  );

  let liquidator = await upgrades.deployProxy(AccountLiquidator,
    [
      await coinhouse.getAddress(),
      await accountant.getAddress()
    ],
    {
      kind: 'uups',
    }
  );

  // 2.- Register houses and allow liquidator
  await accountant.registerHouse(
    await coinhouse.getAddress()
  );
  await accountant.registerHouse(
    await reservehouse.getAddress()
  );

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  const liquidatorRole = await accountant.LIQUIDATOR_ROLE();
  await xoc.grantRole(minter, await coinhouse.getAddress());
  await xoc.grantRole(burner, await coinhouse.getAddress());
  await xoc.grantRole(burner, await liquidator.getAddress());
  await accountant.grantRole(liquidatorRole, await liquidator.getAddress());

  // 4.- Assign deposit limit
  const depositLimitAmount = ethers.parseEther("100");
  await reservehouse.setDepositLimit(depositLimitAmount);

  return {
    accountant,
    coinhouse,
    reservehouse,
    liquidator,
    xoc,
    weth,
    priceFeed
  }
}

module.exports = {
  basicFixture,
  WETH_MXN_PRICE
};