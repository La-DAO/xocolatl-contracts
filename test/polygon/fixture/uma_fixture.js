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
  const wnative = await ethers.getContractAt("IERC20", ASSETS.polygon.wmatic.address);

  // 1.- Deploy all contracts
  const weth = await ethers.getContractAt("IERC20", ASSETS.polygon.weth.address);
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
      xoc.address,
      accountant.address
    ],
    {
      kind: 'uups',
    }
  );
  let reservehouse = await upgrades.deployProxy(HouseOfReserve,
    [
      weth.address,
      xoc.address,
      accountant.address,
      "MXN",
      "ETH",
      wnative.address
    ],
    {
      kind: 'uups',
    }
  );
  let liquidator = await upgrades.deployProxy(AccountLiquidator,
    [
      coinhouse.address,
      accountant.address
    ],
    {
      kind: 'uups',
    }
  );

  // 2.- Register houses
  await accountant.registerHouse(
    coinhouse.address
  );
  await accountant.registerHouse(
    reservehouse.address
  );

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  const liquidatorRole = await accountant.LIQUIDATOR_ROLE();
  await xoc.grantRole(minter, coinhouse.address);
  await xoc.grantRole(burner, coinhouse.address);
  await accountant.grantRole(liquidatorRole, coinhouse.address);

  // 4.- Assign deposit limit
  const depositLimitAmount = ethers.utils.parseEther("100");
  await reservehouse.setDepositLimit(depositLimitAmount);

  //5.- Set-up oracle data
  const sixhours = 60 * 60 * 6;
  const UMAHelper = await ethers.getContractFactory("UMAOracleHelper");
  const umahelper = await UMAHelper.deploy(
    weth.address,
    UMA_CONTRACTS.polygon.finder.address,
    UMA_CONTRACTS.priceIdentifiers.mxnusd,
    sixhours
  );
  await reservehouse.setUMAOracleHelper(umahelper.address);
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