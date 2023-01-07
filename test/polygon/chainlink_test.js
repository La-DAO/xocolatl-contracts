const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createFixtureLoader } = require("ethereum-waffle");
const { chainlinkFixture } = require("./fixture/chainlink_fixture");

const { provider } = ethers;


const {
  evmSnapshot,
  evmRevert,
  setERC20UserBalance,
  timeTravel
} = require("../utils.js");

describe("Xoc Tests - Polygon Chainlink Oracle", function () {

  // Global Test variables
  let accounts;
  let accountant;
  let coinhouse;
  let reservehouse;
  let liquidator;
  let xoc;
  let weth;

  let rid;
  let bid;

  let evmSnapshot0;
  let evmSnapshot1;

  before(async () => {
    evmSnapshot0 = await evmSnapshot();

    accounts = await ethers.getSigners();

    const loadFixture = createFixtureLoader(accounts, provider);
    const loadedContracts = await loadFixture(chainlinkFixture);

    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.coinhouse;
    reservehouse = loadedContracts.reservehouse;
    liquidator = loadedContracts.liquidator;
    xoc = loadedContracts.xoc;
    weth = loadedContracts.weth;

    rid = await reservehouse.reserveTokenID();
    bid = await reservehouse.backedTokenID();
  });

  beforeEach(async function () {
    if (evmSnapshot1) await evmRevert(evmSnapshot1);
    evmSnapshot1 = await evmSnapshot();
  });

  after(async () => {
    await evmRevert(evmSnapshot0);
  });


  it("Oracle price feed tests, should return a price value", async () => {
    const price = await reservehouse.getLatestPrice();
    expect(price).to.be.gt(0);
    const price2 = await coinhouse.getLatestPrice(reservehouse.address);
    expect(price2).to.eq(price);
  });

  it("Deposit in HouseOfReserve", async () => {
    const user = accounts[1];
    const depositAmount = ethers.utils.parseUnits("50", 18);
    await setERC20UserBalance(user.address, weth.address, 'polygon', depositAmount);
    await weth.connect(user).approve(reservehouse.address, depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    expect(await accountant.balanceOf(user.address, rid)).to.eq(depositAmount);
  });

  it("Mint in HouseOfCoin", async () => {
    const user = accounts[1];
    const depositAmount = ethers.utils.parseUnits("50", 18);
    const mintAmount = ethers.utils.parseUnits("2500", 18);
    await setERC20UserBalance(user.address, weth.address, 'polygon', depositAmount);
    await weth.connect(user).approve(reservehouse.address, depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    await coinhouse.connect(user).mintCoin(weth.address, reservehouse.address, mintAmount);
    expect(await xoc.balanceOf(user.address)).to.eq(mintAmount);
  });

  it("Payback in HouseOfCoin", async () => {
    const user = accounts[1];
    const depositAmount = ethers.utils.parseUnits("50", 18);
    const mintAmount = ethers.utils.parseUnits("2500", 18);
    await setERC20UserBalance(user.address, weth.address, 'polygon', depositAmount);
    await weth.connect(user).approve(reservehouse.address, depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    await coinhouse.connect(user).mintCoin(weth.address, reservehouse.address, mintAmount);
    await coinhouse.connect(user).paybackCoin(bid, mintAmount);
    expect(await xoc.balanceOf(user.address)).to.eq(0);
  });

  it("Withdraw in HouseOfReserve", async () => {
    const user = accounts[1];
    const depositAmount = ethers.utils.parseUnits("50", 18);
    const mintAmount = ethers.utils.parseUnits("2500", 18);
    await setERC20UserBalance(user.address, weth.address, 'polygon', depositAmount);
    await weth.connect(user).approve(reservehouse.address, depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    await coinhouse.connect(user).mintCoin(weth.address, reservehouse.address, mintAmount);
    await coinhouse.connect(user).paybackCoin(bid, mintAmount);
    await reservehouse.connect(user).withdraw(depositAmount);
    expect(await weth.balanceOf(user.address)).to.equal(depositAmount);
  });
});
