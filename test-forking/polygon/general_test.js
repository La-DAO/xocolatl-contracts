const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { polygonFixture } = require("./fixture/polygonFixture.js");

const {
  evmSnapshot,
  evmRevert,
  setERC20UserBalance,
} = require("../../test/utils.js");

describe("Xoc Tests - Polygon General", function () {
  // Global Test variables
  let accounts;
  let accountant;
  let coinhouse;
  let reservehouse;
  let liquidator;
  let xoc;
  let weth;
  let inverseFeed;
  let priceFeed;

  let rid;
  let bid;

  let evmSnapshot0;
  let evmSnapshot1;

  before(async () => {
    evmSnapshot0 = await evmSnapshot();

    accounts = await ethers.getSigners();

    const loadedContracts = await loadFixture(polygonFixture);

    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.coinhouse;
    reservehouse = loadedContracts.reservehouse;
    liquidator = loadedContracts.liquidator;
    xoc = loadedContracts.xoc;
    weth = loadedContracts.weth;
    inverseFeed = loadedContracts.inverseFeed;
    priceFeed = loadedContracts.priceFeed;

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
    const priceRef = await priceFeed.latestAnswer();
    const price = await reservehouse.getLatestPrice();
    expect(price).to.eq(priceRef);
    const price2 = await coinhouse.getLatestPrice(
      await reservehouse.getAddress()
    );
    expect(price2).to.eq(price);
  });

  it("Deposit in HouseOfReserve", async () => {
    const user = accounts[1];
    const depositAmount = ethers.parseUnits("50", 18);
    await setERC20UserBalance(
      await user.getAddress(),
      await weth.getAddress(),
      "polygon",
      depositAmount
    );
    await weth
      .connect(user)
      .approve(await reservehouse.getAddress(), depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    expect(await accountant.balanceOf(await user.getAddress(), rid)).to.eq(
      depositAmount
    );
  });

  it("Mint in HouseOfCoin", async () => {
    const user = accounts[1];
    const depositAmount = ethers.parseUnits("50", 18);
    const mintAmount = ethers.parseUnits("2500", 18);
    await setERC20UserBalance(
      await user.getAddress(),
      await weth.getAddress(),
      "polygon",
      depositAmount
    );
    await weth
      .connect(user)
      .approve(await reservehouse.getAddress(), depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    await coinhouse
      .connect(user)
      .mintCoin(
        await weth.getAddress(),
        await reservehouse.getAddress(),
        mintAmount
      );
    expect(await xoc.balanceOf(await user.getAddress())).to.eq(mintAmount);
  });

  it("Payback in HouseOfCoin", async () => {
    const user = accounts[1];
    const depositAmount = ethers.parseUnits("50", 18);
    const mintAmount = ethers.parseUnits("2500", 18);
    await setERC20UserBalance(
      await user.getAddress(),
      await weth.getAddress(),
      "polygon",
      depositAmount
    );
    await weth
      .connect(user)
      .approve(await reservehouse.getAddress(), depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    await coinhouse
      .connect(user)
      .mintCoin(
        await weth.getAddress(),
        await reservehouse.getAddress(),
        mintAmount
      );
    await coinhouse.connect(user).paybackCoin(bid, mintAmount);
    expect(await xoc.balanceOf(await user.getAddress())).to.eq(0);
  });

  it("Withdraw in HouseOfReserve", async () => {
    const user = accounts[1];
    const depositAmount = ethers.parseUnits("50", 18);
    const mintAmount = ethers.parseUnits("2500", 18);
    await setERC20UserBalance(
      await user.getAddress(),
      await weth.getAddress(),
      "polygon",
      depositAmount
    );
    await weth
      .connect(user)
      .approve(await reservehouse.getAddress(), depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    await coinhouse
      .connect(user)
      .mintCoin(
        await weth.getAddress(),
        await reservehouse.getAddress(),
        mintAmount
      );
    await coinhouse.connect(user).paybackCoin(bid, mintAmount);
    await reservehouse.connect(user).withdraw(depositAmount);
    expect(await weth.balanceOf(await user.getAddress())).to.equal(
      depositAmount
    );
  });
});
