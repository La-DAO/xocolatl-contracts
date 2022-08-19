const { ethers, upgrades } = require("hardhat");
const { ASSETS, UMA_CONTRACTS } = require("../../scripts/const");

const {
  syncTime
} = require("../utils.js");

const umaFixture = async () => {

  const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
  const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
  const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
  const Xocolatl = await ethers.getContractFactory("Xocolatl");

  // 0.- Set-up weth
  const weth = await ethers.getContractAt("IERC20", ASSETS.polygon.weth.address);

  // 1.- Deploy all contracts
  let accountant = await AssetsAccountant.deploy();
  let coinhouse = await HouseOfCoin.deploy();
  let reservehouse = await HouseOfReserve.deploy();
  let xoc = await upgrades.deployProxy(Xocolatl, [], {
    kind: 'uups',
    unsafeAllow: [
      'delegatecall'
    ]
  });


  // 2.- Initialize house contracts and register with accountant
  await coinhouse.initialize(
    xoc.address,
    accountant.address
  );
  await reservehouse.initialize(
    weth.address,
    xoc.address,
    accountant.address,
    "MXN",
    "ETH",
    weth.address
  );
  await accountant.registerHouse(
    coinhouse.address,
    xoc.address
  );
  await accountant.registerHouse(
    reservehouse.address,
    weth.address
  );

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const minter = await xoc.MINTER_ROLE();
  const liquidator = await accountant.LIQUIDATOR_ROLE();
  await xoc.grantRole(minter, coinhouse.address);
  await accountant.grantRole(liquidator, coinhouse.address);

  // 4.- Assign deposit limit
  const depositLimitAmount = ethers.utils.parseEther("100");
  await reservehouse.setDepositLimit(depositLimitAmount);

  await syncTime();

  console.log("complete utils!");

  return {
    accountant,
    coinhouse,
    reservehouse,
    xoc,
    weth
  }
}

module.exports = {
  umaFixture
};