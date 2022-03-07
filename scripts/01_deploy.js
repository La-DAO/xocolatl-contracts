// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");
const fs = require('fs');

let txReceipts = [];

const pushTheReceipt = (tx) => {
  txReceipts.push(tx);
  console.log(`Transacion txs${txReceipts.length} Complete!`);
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
  const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
  const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
  const Xocolatl = await ethers.getContractFactory("Xocolatl");
  // const MockWETH = await hre.ethers.getContractFactory("MockWETH");

  // 1.- Deploy all contracts
  // let accountant = await AssetsAccountant.deploy();
  // txReceipts.push(accountant.deployTransaction);
  let accountant = await ethers.getContractAt("AssetsAccountant", "0xf487Ff2A5430eFBdC4B15e2735d9D83e3508F317");

  // let coinhouse = await HouseOfCoin.deploy();
  // txReceipts.push(coinhouse.deployTransaction);
  let coinhouse = await ethers.getContractAt("HouseOfCoin", "0xF3A1C091f110F7b931c02d3603ec8bC771182466");

  // let reservehouse = await HouseOfReserve.deploy();
  // txReceipts.push(reservehouse.deployTransaction);
  let reservehouse = await ethers.getContractAt("HouseOfReserve", "0x62c4014a76e21C046fc5196D81E8cD7e04C5f122")

  // let xoc = await Xocolatl.deploy();
  // txReceipts.push(xoc.deployTransaction);
  let xoc = await ethers.getContractAt("Xocolatl", "0x2872332fB3619F5fDbAeb04F4e3Bd8e42AF8fD04");

  let weth = await ethers.getContractAt("MockWETH", "0xDf032Bc4B9dC2782Bb09352007D4C57B75160B15");

  // 2.- Initialize house contracts and register with accountant
  let txs1 = await coinhouse.initialize(
    xoc.address,
    accountant.address
  );
  txs1 = await txs1.wait();
  pushTheReceipt(txs1);

  let txs2 = await reservehouse.initialize(
    weth.address,
    xoc.address,
    accountant.address
  );
  txs2 = await txs2.wait();
  pushTheReceipt(txs2);

  let txs3 = await accountant.registerHouse(
    coinhouse.address,
    xoc.address
  );
  txs3 = await txs3.wait();
  pushTheReceipt(txs3);

  let txs4 = await accountant.registerHouse(
    reservehouse.address,
    weth.address
  );
  txs4 = await txs4.wait();
  pushTheReceipt(txs4);

  // 3.- Assign proper roles to coinhouse in fiat ERC20
  const minter = await xoc.MINTER_ROLE();
  const burner = await xoc.BURNER_ROLE();
  const liquidator = await accountant.LIQUIDATOR_ROLE();

  let txs5 = await xoc.grantRole(minter, coinhouse.address);
  txs5 = await txs5.wait();
  pushTheReceipt(txs5);

  let txs6 = await xoc.grantRole(burner, coinhouse.address);
  txs6 = await txs6.wait();
  pushTheReceipt(txs6);

  let txs7 = await accountant.grantRole(liquidator, coinhouse.address);
  txs7 = await txs7.wait();
  pushTheReceipt(txs7);

  // 4.- Authorize Provider
  const w_reservehouse = WrapperBuilder.wrapLite(reservehouse).usingPriceFeed("redstone-stocks");
  const w_coinhouse = WrapperBuilder.wrapLite(coinhouse).usingPriceFeed("redstone-stocks");

  // 5.- Authorize Redstone Provider
  let txs8 = await w_reservehouse.authorizeProvider();
  txs8 = await txs8.wait();
  pushTheReceipt(txs8);

  let txs9 = await w_coinhouse.authorizeProvider();
  txs9 = await txs9.wait();
  pushTheReceipt(txs9);

  fs.writeFileSync(path.resolve('./', 'deployment.json'), JSON.stringify(txReceipts));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
