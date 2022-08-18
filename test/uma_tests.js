const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createFixtureLoader } = require("ethereum-waffle");
const { ASSETS, UMA_CONTRACTS } = require("../scripts/const");
const { umaFixture } = require("./fixtures/uma_fixture");

const { provider } = ethers;


const {
  evmSnapshot,
  evmRevert,
  setERC20UserBalance,
  timeTravel
} = require("./utils.js");

describe("Xoc Tests - Polygon UMA Oracle", function () {

  // Global Test variables
  let accounts;
  let accountant;
  let coinhouse;
  let reservehouse;
  let xoc;
  let weth;

  let rid;
  let bid;

  let evmSnapshot0;

  let umahelper;

  before(async () => {

    accounts = await ethers.getSigners();

    const loadFixture = createFixtureLoader(accounts, provider);
    const loadedContracts = await loadFixture(umaFixture);

    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.coinhouse;
    reservehouse = loadedContracts.reservehouse;
    xoc = loadedContracts.xoc;
    weth = loadedContracts.weth;

    rid = await reservehouse.reserveTokenID();
    bid = await reservehouse.backedTokenID();

    const UMAHelper = await ethers.getContractFactory("UMAOracleHelper");
    umahelper = await UMAHelper.deploy(
      weth.address,
      UMA_CONTRACTS.polygon.finder.address,
      UMA_CONTRACTS.priceIdentifiers.mxnusd
    );
  });

  beforeEach(async () => {
    evmSnapshot0 = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(evmSnapshot0);
  });

  it("succesfully complete UMAOracleHelper request processs", async () => {
    await umahelper.requestPrice();
    const proposeStake = ethers.utils.parseEther("10");
    const proposerUser = accounts[1];
    const priceProposal = ethers.utils.parseUnits("5",16);

    await setERC20UserBalance(proposerUser.address, weth.address, 'polygon', proposeStake);
    expect(await weth.balanceOf(proposerUser.address)).to.eq(proposeStake);
    
    await weth.connect(proposerUser).approve(umahelper.address, proposeStake);
    await umahelper.connect(proposerUser).proposePriceLastRequest(priceProposal);
    await timeTravel(60 * 60 * 24);
    const returnedPrice = await umahelper.callStatic.settleLastRequestAndGetPrice();
    await umahelper.settleLastRequestAndGetPrice();
    expect(priceProposal).to.eq(returnedPrice);
  });

  // it("Oracle price feed tests, should return a price value", async () => {
  //   await syncTime();
  //   const price = await coinhouse.getLatestPrice();
  //   await expect(price).to.be.gt(0);

  //   await syncTime();
  //   const price2 = await reservehouse.getLatestPrice();
  //   await expect(price2).to.be.gt(0);
  // });

  // it("Deposit in HouseOfReserve", async () => {
  //   const depositAmount = ethers.utils.parseUnits("50", 18);
  //   await weth.connect(accounts[1]).deposit({ value: depositAmount });
  //   await weth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
  //   await syncTime();
  //   await reservehouse.connect(accounts[1]).deposit(depositAmount);
  //   expect(await accountant.balanceOf(accounts[1].address, rid)).to.eq(depositAmount);
  // });

  // it("Deposit in HouseOfReserve, sending native-token directly", async () => {
  //   const depositAmount = ethers.utils.parseUnits("50", 18);
  //   // This method does automatic wrapping to WETH-token-type and deposit.
  //   const tx = {
  //     to: reservehouse.address,
  //     value: depositAmount
  //   }
  //   await accounts[1].sendTransaction(tx);
  //   expect(await accountant.balanceOf(accounts[1].address, rid)).to.eq(depositAmount);
  // });

  // it("Mint in HouseOfCoin", async () => {
  //   const depositAmount = ethers.utils.parseUnits("50", 18);
  //   const mintAmount = ethers.utils.parseUnits("2500", 18);
  //   await weth.connect(accounts[1]).deposit({ value: depositAmount });
  //   await weth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
  //   await syncTime();
  //   let localreservehouse = reservehouse.connect(accounts[1]);
  //   localreservehouse = WrapperBuilder.wrapLite(localreservehouse).usingPriceFeed("redstone-stocks");
  //   await localreservehouse.deposit(depositAmount);
  //   await syncTime();
  //   let localcoinhouse = coinhouse.connect(accounts[1]);
  //   localcoinhouse = WrapperBuilder.wrapLite(localcoinhouse).usingPriceFeed("redstone-stocks");
  //   await localcoinhouse.mintCoin(weth.address, reservehouse.address, mintAmount);
  //   expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);
  // });

  // it("Payback in HouseOfCoin", async () => {
  //   const depositAmount = ethers.utils.parseUnits("50", 18);
  //   const mintAmount = ethers.utils.parseUnits("2500", 18);
  //   await weth.connect(accounts[1]).deposit({ value: depositAmount });
  //   await weth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
  //   await syncTime();
  //   let localreservehouse = reservehouse.connect(accounts[1]);
  //   localreservehouse = WrapperBuilder.wrapLite(localreservehouse).usingPriceFeed("redstone-stocks");
  //   await localreservehouse.deposit(depositAmount);
  //   await syncTime();
  //   let localcoinhouse = coinhouse.connect(accounts[1]);
  //   localcoinhouse = WrapperBuilder.wrapLite(localcoinhouse).usingPriceFeed("redstone-stocks");
  //   await localcoinhouse.mintCoin(weth.address, reservehouse.address, mintAmount);
  //   expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);
  //   await localcoinhouse.paybackCoin(bid, mintAmount);
  //   expect(await xoc.balanceOf(accounts[1].address)).to.eq(0);
  // });

  // it("Withdraw in HouseOfReserve", async () => {
  //   const depositAmount = ethers.utils.parseUnits("50", 18);
  //   const mintAmount = ethers.utils.parseUnits("2500", 18);
  //   await weth.connect(accounts[1]).deposit({ value: depositAmount });
  //   await weth.connect(accounts[1]).approve(reservehouse.address, depositAmount);
  //   await syncTime();
  //   let localreservehouse = reservehouse.connect(accounts[1]);
  //   localreservehouse = WrapperBuilder.wrapLite(localreservehouse).usingPriceFeed("redstone-stocks");
  //   await localreservehouse.deposit(depositAmount);
  //   await syncTime();
  //   let localcoinhouse = coinhouse.connect(accounts[1]);
  //   localcoinhouse = WrapperBuilder.wrapLite(localcoinhouse).usingPriceFeed("redstone-stocks");
  //   await localcoinhouse.mintCoin(weth.address, reservehouse.address, mintAmount);
  //   expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);
  //   await localcoinhouse.paybackCoin(bid, mintAmount);
  //   expect(await xoc.balanceOf(accounts[1].address)).to.eq(0);
  //   await localreservehouse.withdraw(depositAmount);
  //   expect(await weth.balanceOf(accounts[1].address)).to.equal(depositAmount);
  // });
});
