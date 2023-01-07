const { ethers, upgrades } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

const {
  syncTime
} = require("../utils.js");

const redstoneFixture = async () => {

  const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
  const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
  const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
  const Xocolatl = await ethers.getContractFactory("Xocolatl");
  const AccountLiquidator = await ethers.getContractFactory("AccountLiquidator");

  // 0.- Set-up mockweth
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();

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
      weth.address
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

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  const liquidatorRole = await accountant.LIQUIDATOR_ROLE();
  await xoc.grantRole(minter, coinhouse.address);
  await xoc.grantRole(burner, coinhouse.address);
  await xoc.grantRole(burner, liquidator.address);
  await accountant.grantRole(liquidatorRole, liquidator.address);

  // 4.- Wrap the contracts in redstone-evm-connector
  const w_reservehouse = WrapperBuilder.wrapLite(reservehouse).usingPriceFeed("redstone-stocks");
  const w_coinhouse = WrapperBuilder.wrapLite(coinhouse).usingPriceFeed("redstone-stocks");

  // 5.- Authorize Redstone Provider
  // You can check check evm addresses for providers at: https://api.redstone.finance/providers
  // 'redstone' main demo provider = 0x0C39486f770B26F5527BBBf942726537986Cd7eb; 
  // 'redstone-stocks' demo provider = 0x926E370fD53c23f8B71ad2B3217b227E41A92b12;
  // 'redstone-rapid' demo provider = 0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9;
  const txrh = await reservehouse.authorizeSigner("0x926E370fD53c23f8B71ad2B3217b227E41A92b12");
  await txrh.wait();
  const txch = await coinhouse.authorizeSigner("0x926E370fD53c23f8B71ad2B3217b227E41A92b12");
  await txch.wait();

  // 6.- Assign deposit limit
  const depositLimitAmount = ethers.utils.parseEther("100");
  await reservehouse.setDepositLimit(depositLimitAmount);

  await syncTime();

  console.log("\tCompleted fixture routine!");

  return {
    accountant,
    coinhouse,
    w_coinhouse,
    reservehouse,
    w_reservehouse,
    liquidator,
    xoc,
    weth
  }
}

module.exports = {
  redstoneFixture
};