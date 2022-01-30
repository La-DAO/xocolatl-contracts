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

const DEBUG = false;

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

  let liquidator;
  let dumbUser;

  const largeAmountXoc = ethers.utils.parseUnits("1000000", 18);

  before(async () => {

    accounts = await ethers.getSigners();

    liquidator = accounts[19];
    dumbUser = accounts[10];

    const loadFixture = createFixtureLoader(accounts, provider);
    const loadedContracts = await loadFixture(deploy_setup);

    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.w_coinhouse;
    reservehouse = loadedContracts.w_reservehouse;
    xoc = loadedContracts.xoc;
    mockweth = loadedContracts.mockweth;

    rid = await reservehouse.reserveTokenID();
    bid = await reservehouse.backedTokenID();

    // Load liquidator
    await xoc.mint(liquidator.address, largeAmountXoc);
  });

  beforeEach(async () => {
    evmSnapshot0 = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(evmSnapshot0);
  });

  /**
  * Performs deposit and mint routine for dumbUser.
  * @param {ethers.BigNumber} depositAmount - Etherjs compatible BigNumber.
  * @param {ethers.BigNumber} mintAmount - Etherjs compatible BigNumber.
  */
  const depositMintRoutine = async (depositAmount, mintAmount) => {
    await mockweth.connect(dumbUser).deposit({ value: depositAmount });
    await mockweth.connect(dumbUser).approve(reservehouse.address, depositAmount);
    await syncTime();
    let localreservehouseD = reservehouse.connect(dumbUser);
    localreservehouseD = WrapperBuilder.wrapLite(localreservehouseD).usingPriceFeed("redstone-stocks");
    await localreservehouseD.deposit(depositAmount);
    await syncTime();
    let localcoinhouseD = coinhouse.connect(dumbUser);
    localcoinhouseD = WrapperBuilder.wrapLite(localcoinhouseD).usingPriceFeed("redstone-stocks");
    await localcoinhouseD.mintCoin(mockweth.address, reservehouse.address, mintAmount);
    expect(await xoc.balanceOf(dumbUser.address)).to.eq(mintAmount);
  }

  /**
  * Transforms regular healthy position of dumbUser into close to liquidation.
  * Must followed a 'depositMintRoutine' function call.
  */
  const makeARiskyPosition = async () => {
    let localcoinhouseD = coinhouse.connect(dumbUser);
    localcoinhouseD = WrapperBuilder.wrapLite(localcoinhouseD).usingPriceFeed("redstone-stocks");

    const remainingMintingPower = await localcoinhouseD.checkRemainingMintingPower(dumbUser.address, mockweth.address);

    const percentDesired = ethers.BigNumber.from("99");
    const percentBase = ethers.BigNumber.from("100");

    const extraToMint = remainingMintingPower.mul(percentDesired).div(percentBase);

    await localcoinhouseD.mintCoin(mockweth.address, reservehouse.address, extraToMint);
  }


  it("Should return a good health ratio", async () => {

    // dumbUser Actions
    const depositAmount = ethers.utils.parseUnits("1", 18);
    const mintAmount = ethers.utils.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);

    // Liquidator actions
    let localcoinhouseL = coinhouse.connect(liquidator);
    localcoinhouseL = WrapperBuilder.wrapLite(localcoinhouseL).usingPriceFeed("redstone-stocks");

    const liqParam = await localcoinhouseL.liqParam();
    const price = await localcoinhouseL.redstoneGetLastPrice();
    const healthRatio = await localcoinhouseL.computeUserHealthRatio(dumbUser.address, mockweth.address);

    if (DEBUG) {
      console.log("restoneLastPrice", price.toString());
      console.log("liqParam", liqParam.map(each => each.toString()));
      console.log("healthRatio", healthRatio.toString())
    }

    expect(healthRatio).to.be.gt(liqParam.globalBase);
  });

  it("Should revert when trying to liquidate a good health ratio", async () => {
    // dumbUser Actions
    const depositAmount = ethers.utils.parseUnits("1", 18);
    const mintAmount = ethers.utils.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);

    // Liquidator actions
    let localcoinhouseL = coinhouse.connect(liquidator);
    localcoinhouseL = WrapperBuilder.wrapLite(localcoinhouseL).usingPriceFeed("redstone-stocks");

    expect(localcoinhouseL.liquidateUser(dumbUser.address, mockweth.address)).to.be.reverted;
  });

  it("Should return a bad health ratio", async () => {
    // dumbUser Actions
    const depositAmount = ethers.utils.parseUnits("1", 18);
    const mintAmount = ethers.utils.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by admin
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("2")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.address, rid, burnAmount);

    // Liquidator actions
    let localcoinhouseL = coinhouse.connect(liquidator);
    localcoinhouseL = WrapperBuilder.wrapLite(localcoinhouseL).usingPriceFeed("redstone-stocks");

    const liqParam = await localcoinhouseL.liqParam();
    const healthRatio = await localcoinhouseL.computeUserHealthRatio(dumbUser.address, mockweth.address);

    if (DEBUG) {
      console.log("liqParam", liqParam.map(each => each.toString()));
      console.log("healthRatio", healthRatio.toString())
    }

    expect(healthRatio).to.be.lt(liqParam.globalBase);
  });

  it("Should log a Margincall event", async () => {
    // dumbUser Actions
    const depositAmount = ethers.utils.parseUnits("1", 18);
    const mintAmount = ethers.utils.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by admin
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("3")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.address, rid, burnAmount);

    // Liquidator actions
    let localcoinhouseL = coinhouse.connect(liquidator);
    localcoinhouseL = WrapperBuilder.wrapLite(localcoinhouseL).usingPriceFeed("redstone-stocks");

    const txResponse = await localcoinhouseL.liquidateUser(dumbUser.address, mockweth.address);
    const txReceipt = await txResponse.wait();

    if (DEBUG) {
      console.log("logs", txReceipt.logs);
    }

    const txLogTopics = [
      txReceipt.logs[0].topics[1],
      txReceipt.logs[0].topics[2],
      txReceipt.logs[0].topics[3]
    ];

    let expectedTopics = [
      ethers.utils.hexZeroPad(dumbUser.address, 32),
      ethers.utils.hexZeroPad(xoc.address, 32),
      ethers.utils.hexZeroPad(mockweth.address, 32)
    ]

    expectedTopics = expectedTopics.map(each => each.toLowerCase());

    if (DEBUG) {
      console.log("txLogTopics", txLogTopics);
      console.log("expectedTopics", expectedTopics);
    }

    for (let index = 0; index < txLogTopics.length; index++) {
      expect(expectedTopics[index]).to.eq(txLogTopics[index]);
    }
  });

  it("Should have penalty price be less than oracle price", async () => {
    // dumbUser Actions
    const depositAmount = ethers.utils.parseUnits("1", 18);
    const mintAmount = ethers.utils.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by admin
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("10")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.address, rid, burnAmount);

    // Liquidator actions
    let localcoinhouseL = coinhouse.connect(liquidator);
    localcoinhouseL = WrapperBuilder.wrapLite(localcoinhouseL).usingPriceFeed("redstone-stocks");

    [
      costAmount,
      collateralPenalty
    ] = await localcoinhouseL.computeCostOfLiquidation(dumbUser.address, mockweth.address);

    let computedPrice = costAmount.mul(ethers.utils.parseUnits("1", 8)).div(collateralPenalty);
    let oraclePrice = await localcoinhouseL.redstoneGetLastPrice();

    if (DEBUG) {
      console.log("costAmount", costAmount.toString(), "collateralPenalty", collateralPenalty.toString());
      console.log("computedPrice", computedPrice.toString(), "oraclePrice", oraclePrice.toString());
    }

    expect(computedPrice).to.be.lt(oraclePrice);
  });

  it("Should liquidate user", async () => {
    // dumbUser Actions
    const depositAmount = ethers.utils.parseUnits("1", 18);
    const mintAmount = ethers.utils.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by admin
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("10")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.address, rid, burnAmount);

    // Liquidator actions
    let localcoinhouseL = coinhouse.connect(liquidator);
    localcoinhouseL = WrapperBuilder.wrapLite(localcoinhouseL).usingPriceFeed("redstone-stocks");

    [
      costAmount,
      collateralPenalty
    ] = await localcoinhouseL.computeCostOfLiquidation(dumbUser.address, mockweth.address);

    await xoc.connect(liquidator).approve(coinhouse.address, costAmount);

    const mockwethBalBefore = await accountant.balanceOf(liquidator.address, rid);
    const xocBalBefore = await xoc.balanceOf(liquidator.address);

    await localcoinhouseL.liquidateUser(dumbUser.address, mockweth.address);

    const mockwethBalAfter = await accountant.balanceOf(liquidator.address, rid);
    const xocBalAfter = await xoc.balanceOf(liquidator.address);

    if (DEBUG) {
      console.log("mockwethBalBefore", mockwethBalBefore.toString(), "mockwethBalAfter", mockwethBalAfter.toString());
      console.log("xocBalBefore", xocBalBefore.toString(), "xocBalAfter", xocBalAfter.toString());
    }

    expect(mockwethBalAfter).to.be.gt(mockwethBalBefore);
    expect(mockwethBalAfter).to.eq(collateralPenalty);
    expect(xocBalAfter).to.be.lt(xocBalBefore);
    expect(xocBalAfter).to.eq(xocBalBefore.sub(costAmount));
  });
});
