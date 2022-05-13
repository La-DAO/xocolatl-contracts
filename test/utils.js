const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

const syncTime = async function () {
  const now = Math.ceil(new Date().getTime() / 1000);
  try {
    await ethers.provider.send('evm_setNextBlockTimestamp', [now]);
  } catch (error) {
    //Skipping time sync - block is ahead of current time
  }
};

const deploy_setup = async () => {

  const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
  const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
  const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
  const Xocolatl = await ethers.getContractFactory("Xocolatl");
  const MockWETH = await ethers.getContractFactory("MockWETH");

  // 1.- Deploy all contracts
  let accountant = await AssetsAccountant.deploy();
  let coinhouse = await HouseOfCoin.deploy();
  let reservehouse = await HouseOfReserve.deploy();
  let xoc = await Xocolatl.deploy();
  let mockweth = await MockWETH.deploy();

  // 2.- Initialize house contracts and register with accountant
  await coinhouse.initialize(
    xoc.address,
    accountant.address,
    "MXN",
    "ETH"
  );
  await reservehouse.initialize(
    mockweth.address,
    xoc.address,
    accountant.address,
    "MXN",
    "ETH",
    mockweth.address
  );
  await accountant.registerHouse(
    coinhouse.address,
    xoc.address
  );
  await accountant.registerHouse(
    reservehouse.address,
    mockweth.address
  );

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  const liquidator = await accountant.LIQUIDATOR_ROLE();
  await xoc.grantRole(minter, coinhouse.address);
  await xoc.grantRole(burner, coinhouse.address);
  await accountant.grantRole(liquidator, coinhouse.address);

  // 4.- Wrap the contracts in redstone-evm-connector
  const w_reservehouse = WrapperBuilder.wrapLite(reservehouse).usingPriceFeed("redstone-stocks");
  const w_coinhouse = WrapperBuilder.wrapLite(coinhouse).usingPriceFeed("redstone-stocks");

  // 5.- Authorize Redstone Provider
  const txrh = await w_reservehouse.authorizeProvider();
  await txrh.wait();
  const txch = await w_coinhouse.authorizeProvider();
  await txch.wait();

  await syncTime();

  console.log("complete utils!");

  return {
    accountant,
    w_coinhouse,
    w_reservehouse,
    xoc,
    mockweth
  }
}

const evmSnapshot = async () => ethers.provider.send("evm_snapshot", []);

const evmRevert = async (id) => ethers.provider.send("evm_revert", [id]);

module.exports = {
  deploy_setup,
  evmSnapshot,
  evmRevert,
  syncTime
};
