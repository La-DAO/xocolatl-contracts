const { ethers, upgrades } = require("hardhat");
const { ASSETS, UMA_CONTRACTS, CHAINLINK_CONTRACTS } = require("../../../scripts/const");

const {
  syncTime
} = require("../../utils.js");

const chainlinkFixture = async () => {

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

  // 2.- Register houses and allow liquidator
  await accountant.registerHouse(
    coinhouse.address
  );
  await accountant.registerHouse(
    reservehouse.address
  );
  await accountant.allowLiquidator(
    liquidator.address, 
    true
  );

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const liquidatorRole = await accountant.LIQUIDATOR_ROLE();
  await accountant.grantRole(liquidatorRole, liquidator.address);
  // 3.1 These calls are needed from the multisig in production
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  await xoc.grantRole(minter, coinhouse.address);
  await xoc.grantRole(burner, coinhouse.address);
  await xoc.grantRole(burner, liquidator.address);

  // 4.- Assign deposit limit
  const depositLimitAmount = ethers.utils.parseEther("100");
  await reservehouse.setDepositLimit(depositLimitAmount);

  //5.- Set-up oracle data
  await reservehouse.setActiveOracle(2);
  await reservehouse.setChainlinkAddrs(
    CHAINLINK_CONTRACTS.polygon.mxnusd,
    CHAINLINK_CONTRACTS.polygon.ethusd
  );

  console.log("\tCompleted fixture routine!");

  return {
    accountant,
    coinhouse,
    reservehouse,
    liquidator,
    xoc,
    weth
  }
}

module.exports = {
  chainlinkFixture
};