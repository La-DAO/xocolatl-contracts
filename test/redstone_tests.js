const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createFixtureLoader } = require("ethereum-waffle");
const { WrapperBuilder } = require("redstone-evm-connector");

const { provider } = ethers;

const {
  deploy_setup,
  evmSnapshot,
  evmRevert,
  syncTime
} = require("./utils.js");

describe("Xoc System Tests", function () {

  // Global Test variables
  let accounts;
  let accountant;
  let coinhouse;
  let reservehouse;
  let xoc;
  let mockweth;

  let rid;
  let bid;

  let evmSnapshot0;

  before(async () => {

    accounts = await ethers.getSigners();

    const loadFixture = createFixtureLoader(accounts, provider);
    const loadedContracts = await loadFixture(deploy_setup);

    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.w_coinhouse;
    reservehouse = loadedContracts.w_reservehouse;
    xoc = loadedContracts.xoc;
    mockweth = loadedContracts.mockweth;

    rid = await reservehouse.reserveTokenID();
    bid = await reservehouse.backedTokenID();
  });

  beforeEach(async () => {
    evmSnapshot0 = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(evmSnapshot0);
  });

  it("Oracle price feed tests, should return a price value", async () => {
    await syncTime();
    const price = await coinhouse.getLastPrice();
    await expect(price).to.be.gt(0);

    await syncTime();
    const price2 = await reservehouse.getLastPrice();
    await expect(price2).to.be.gt(0);
  });

  it("Deposit in HouseOfReserve", async () => {
    const depositAmount = ethers.utils.parseUnits("50", 18);
    await mockweth.connect(accounts[1]).deposit({ value: depositAmount });
    await mockweth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
    await syncTime();
    await reservehouse.connect(accounts[1]).deposit(depositAmount);
    expect(await accountant.balanceOf(accounts[1].address, rid)).to.eq(depositAmount);
  });

  it("Deposit in HouseOfReserve, sending native-token directly", async () => {
    const depositAmount = ethers.utils.parseUnits("50", 18);
    // This method does automatic wrapping to WETH-token-type and deposit.
    const tx = {
      to: reservehouse.address,
      value: depositAmount
    }
    await accounts[1].sendTransaction(tx);
    expect(await accountant.balanceOf(accounts[1].address, rid)).to.eq(depositAmount);
  });

  it("Mint in HouseOfCoin", async () => {
    const depositAmount = ethers.utils.parseUnits("50", 18);
    const mintAmount = ethers.utils.parseUnits("2500", 18);
    await mockweth.connect(accounts[1]).deposit({ value: depositAmount });
    await mockweth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
    await syncTime();
    let localreservehouse = reservehouse.connect(accounts[1]);
    localreservehouse = WrapperBuilder.wrapLite(localreservehouse).usingPriceFeed("redstone-stocks");
    await localreservehouse.deposit(depositAmount);
    await syncTime();
    let localcoinhouse = coinhouse.connect(accounts[1]);
    localcoinhouse = WrapperBuilder.wrapLite(localcoinhouse).usingPriceFeed("redstone-stocks");
    await localcoinhouse.mintCoin(mockweth.address, reservehouse.address, mintAmount);
    expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);
  });

  it("Payback in HouseOfCoin", async () => {
    const depositAmount = ethers.utils.parseUnits("50", 18);
    const mintAmount = ethers.utils.parseUnits("2500", 18);
    await mockweth.connect(accounts[1]).deposit({ value: depositAmount });
    await mockweth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
    await syncTime();
    let localreservehouse = reservehouse.connect(accounts[1]);
    localreservehouse = WrapperBuilder.wrapLite(localreservehouse).usingPriceFeed("redstone-stocks");
    await localreservehouse.deposit(depositAmount);
    await syncTime();
    let localcoinhouse = coinhouse.connect(accounts[1]);
    localcoinhouse = WrapperBuilder.wrapLite(localcoinhouse).usingPriceFeed("redstone-stocks");
    await localcoinhouse.mintCoin(mockweth.address, reservehouse.address, mintAmount);
    expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);
    await localcoinhouse.paybackCoin(bid, mintAmount);
    expect(await xoc.balanceOf(accounts[1].address)).to.eq(0);
  });

  it("Withdraw in HouseOfReserve", async () => {
    const depositAmount = ethers.utils.parseUnits("50", 18);
    const mintAmount = ethers.utils.parseUnits("2500", 18);
    await mockweth.connect(accounts[1]).deposit({ value: depositAmount });
    await mockweth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
    await syncTime();
    let localreservehouse = reservehouse.connect(accounts[1]);
    localreservehouse = WrapperBuilder.wrapLite(localreservehouse).usingPriceFeed("redstone-stocks");
    await localreservehouse.deposit(depositAmount);
    await syncTime();
    let localcoinhouse = coinhouse.connect(accounts[1]);
    localcoinhouse = WrapperBuilder.wrapLite(localcoinhouse).usingPriceFeed("redstone-stocks");
    await localcoinhouse.mintCoin(mockweth.address, reservehouse.address, mintAmount);
    expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);
    await localcoinhouse.paybackCoin(bid, mintAmount);
    expect(await xoc.balanceOf(accounts[1].address)).to.eq(0);
    await localreservehouse.withdraw(depositAmount);
    expect(await mockweth.balanceOf(accounts[1].address)).to.equal(depositAmount);
  });
});
