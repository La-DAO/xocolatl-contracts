const { ethers, upgrades } = require("hardhat");
const { ASSETS, UMA_CONTRACTS, CHAINLINK_CONTRACTS } = require("../../../scripts/const");

const {
  syncTime
} = require("../../utils.js");

const umaFixture = async () => {

  const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
  const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
  const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
  const Xocolatl = await ethers.getContractFactory("Xocolatl");
  const AccountLiquidator = await ethers.getContractFactory("AccountLiquidator");

  // 0.- Set-up wrapped-native
  const wnative = await ethers.getContractAt("IERC20", ASSETS.polygon.wmatic.getAddress());

  // 1.- Deploy all contracts
  const weth = await ethers.getContractAt("IERC20", ASSETS.polygon.weth.getAddress());
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
      xoc.getAddress(),
      accountant.getAddress()
    ],
    {
      kind: 'uups',
    }
  );
  let reservehouse = await upgrades.deployProxy(HouseOfReserve,
    [
      weth.getAddress(),
      xoc.getAddress(),
      accountant.getAddress(),
      "MXN",
      "ETH",
      wnative.getAddress()
    ],
    {
      kind: 'uups',
    }
  );
  let liquidator = await upgrades.deployProxy(AccountLiquidator,
    [
      coinhouse.getAddress(),
      accountant.getAddress()
    ],
    {
      kind: 'uups',
    }
  );

  // 2.- Register houses and allow liquidator
  await accountant.registerHouse(
    coinhouse.getAddress()
  );
  await accountant.registerHouse(
    reservehouse.getAddress()
  );
  await accountant.allowLiquidator(
    liquidator.getAddress(), 
    true
  );

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  const liquidatorRole = await accountant.LIQUIDATOR_ROLE();
  await xoc.grantRole(minter, coinhouse.getAddress());
  await xoc.grantRole(burner, coinhouse.getAddress());
  await xoc.grantRole(burner, liquidator.getAddress());
  await accountant.grantRole(liquidatorRole, liquidator.getAddress());

  // 4.- Assign deposit limit
  const depositLimitAmount = ethers.parseEther("100");
  await reservehouse.setDepositLimit(depositLimitAmount);

  //5.- Set-up oracle data
  const sixhours = 60 * 60 * 6;
  const UMAHelper = await ethers.getContractFactory("UMAOracleHelper");
  const umahelper = await UMAHelper.deploy(
    weth.getAddress(),
    UMA_CONTRACTS.polygon.finder.getAddress(),
    UMA_CONTRACTS.priceIdentifiers.mxnusd,
    sixhours
  );
  await reservehouse.setUMAOracleHelper(umahelper.getAddress());
  await reservehouse.setActiveOracle(1);
  await reservehouse.setChainlinkAddrs(
    CHAINLINK_CONTRACTS.polygon.mxnusd,
    CHAINLINK_CONTRACTS.polygon.ethusd
  );

  await syncTime();

  console.log("\tCompleted fixture routine!");

  return {
    accountant,
    coinhouse,
    reservehouse,
    liquidator,
    xoc,
    weth,
    umahelper
  }
}

module.exports = {
  umaFixture
};