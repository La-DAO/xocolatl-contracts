const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createFixtureLoader } = require("ethereum-waffle");
const { chainlinkFixture } = require("./fixture/chainlink_fixture");

const { provider } = ethers;

const {
  evmSnapshot,
  evmRevert,
  setERC20UserBalance
} = require("../utils.js");

const DEBUG = false;

describe("Xoc Liquidation Tests: using chainlink oracle", function () {

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

  let liquidatorUser;
  let dumbUser;

  const largeAmountXoc = ethers.parseUnits("1000000", 18);

  before(async () => {
    evmSnapshot0 = await evmSnapshot();

    accounts = await ethers.getSigners();

    liquidatorUser = accounts[19];
    dumbUser = accounts[10];

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

    // Load liquidatorUser
    await xoc.mint(liquidatorUser.getAddress(), largeAmountXoc);
  });

  beforeEach(async function () {
    if (evmSnapshot1) await evmRevert(evmSnapshot1);
    evmSnapshot1 = await evmSnapshot();
  });

  after(async () => {
    await evmRevert(evmSnapshot0);
  });

  /**
  * Performs deposit and mint routine for dumbUser.
  * @param {ethers.BigNumber} depositAmount - Etherjs compatible BigNumber.
  * @param {ethers.BigNumber} mintAmount - Etherjs compatible BigNumber.
  */
  const depositMintRoutine = async (depositAmount, mintAmount) => {
    await setERC20UserBalance(dumbUser.getAddress(), weth.getAddress(), 'polygon', depositAmount);
    await weth.connect(dumbUser).approve(reservehouse.getAddress(), depositAmount);
    await reservehouse.connect(dumbUser).deposit(depositAmount);
    await coinhouse.connect(dumbUser).mintCoin(weth.getAddress(), reservehouse.getAddress(), mintAmount);
    expect(await xoc.balanceOf(dumbUser.getAddress())).to.eq(mintAmount);
  }

  /**
  * Transforms regular healthy position of dumbUser into close to liquidation.
  * Must followed a 'depositMintRoutine' function call.
  */
  const makeARiskyPosition = async () => {
    const remainingMintingPower = await coinhouse.checkRemainingMintingPower(dumbUser.getAddress(), reservehouse.getAddress());
    const percentDesired = ethers.BigNumber.from("99");
    const percentBase = ethers.BigNumber.from("100");
    const extraToMint = remainingMintingPower.mul(percentDesired).div(percentBase);
    if (DEBUG) {
      console.log("remainingMintingPower", remainingMintingPower.toString());
      console.log("extraToMint", extraToMint.toString());
    }
    await coinhouse.connect(dumbUser).mintCoin(weth.getAddress(), reservehouse.getAddress(), extraToMint);
  }


  it("Should return a good health ratio", async () => {

    // dumbUser Actions
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);

    const liqParam = await coinhouse.getLiqParams();
    const price = await coinhouse.getLatestPrice(reservehouse.getAddress());
    const healthRatio = await coinhouse.computeUserHealthRatio(dumbUser.getAddress(), reservehouse.getAddress());

    if (DEBUG) {
      console.log("oracleLastPrice", price.toString());
      console.log("liqParam", liqParam.map(each => each.toString()));
      console.log("healthRatio", healthRatio.toString())
    }

    const OneInWei = ethers.parseUnits("1", 18);
    expect(healthRatio).to.be.gt(OneInWei);
  });

  it("Should revert when trying to liquidate a good health ratio", async () => {
    // dumbUser Actions
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);

    // liquidatorUser actions
    let liqudiatorL = liquidator.connect(liquidatorUser);

    await expect(liqudiatorL.liquidateUser(dumbUser.getAddress(), reservehouse.getAddress())).to.be.reverted;
  });

  it("Should return a bad health ratio", async () => {
    // dumbUser Actions
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by burning 10% of collateral just for test purpose.
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("10")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.getAddress(), rid, burnAmount);

    const price = await coinhouse.getLatestPrice(reservehouse.getAddress());
    const liqParam = await coinhouse.getLiqParams();
    const healthRatio = await coinhouse.computeUserHealthRatio(dumbUser.getAddress(), reservehouse.getAddress());

    if (DEBUG) {
      console.log("oracleLastPrice", price.toString());
      console.log("liqParam", liqParam.map(each => each.toString()));
      console.log("healthRatio", healthRatio.toString())
    }

    const OneInWei = ethers.parseUnits("1", 18);
    expect(healthRatio).to.be.lt(OneInWei);
  });

  it("Should log a Margincall event", async () => {
    // dumbUser Actions
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by burning 10% of collateral just for test purpose.
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("7")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.getAddress(), rid, burnAmount);

    // liquidatorUser actions
    let liquidatorL = liquidator.connect(liquidatorUser);

    const txResponse = await liquidatorL.liquidateUser(dumbUser.getAddress(), reservehouse.getAddress());
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
      ethers.utils.hexZeroPad(dumbUser.getAddress(), 32),
      ethers.utils.hexZeroPad(xoc.getAddress(), 32),
      ethers.utils.hexZeroPad(weth.getAddress(), 32)
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
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by admin
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("10")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.getAddress(), rid, burnAmount);

    // liquidatorUser actions
    let liquidatorL = liquidator.connect(liquidatorUser);

    [
      costAmount,
      collateralPenalty
    ] = await liquidatorL.computeCostOfLiquidation(dumbUser.getAddress(), reservehouse.getAddress());

    let computedPrice = costAmount.mul(ethers.parseUnits("1", 8)).div(collateralPenalty);
    let oraclePrice = await liquidatorL.getLatestPrice(reservehouse.getAddress());

    if (DEBUG) {
      console.log("costAmount", costAmount.toString(), "collateralPenalty", collateralPenalty.toString());
      console.log("computedPrice", computedPrice.toString(), "oraclePrice", oraclePrice.toString());
    }

    expect(computedPrice).to.be.lt(oraclePrice);
  });

  it("Should liquidate user", async () => {
    // dumbUser Actions
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by admin
    const burnAmount = depositAmount.mul(ethers.BigNumber.from("20")).div(ethers.BigNumber.from("100"));
    await accountant.connect(accounts[0]).burn(dumbUser.getAddress(), rid, burnAmount);

    // liquidatorUser actions
    let liquidatorL = liquidator.connect(liquidatorUser);

    [
      costAmount,
      collateralPenalty
    ] = await liquidatorL.computeCostOfLiquidation(dumbUser.getAddress(), reservehouse.getAddress());

    await xoc.connect(liquidatorUser).approve(liquidatorL.getAddress(), costAmount);

    const wethBalBefore = await accountant.balanceOf(liquidatorUser.getAddress(), rid);
    const xocBalBefore = await xoc.balanceOf(liquidatorUser.getAddress());

    await liquidatorL.liquidateUser(dumbUser.getAddress(), reservehouse.getAddress());

    const wethBalAfter = await accountant.balanceOf(liquidatorUser.getAddress(), rid);
    const xocBalAfter = await xoc.balanceOf(liquidatorUser.getAddress());

    if (DEBUG) {
      console.log("wethBalBefore", wethBalBefore.toString(), "wethBalAfter", wethBalAfter.toString());
      console.log("xocBalBefore", xocBalBefore.toString(), "xocBalAfter", xocBalAfter.toString());
    }

    expect(wethBalAfter).to.be.gt(wethBalBefore);
    expect(wethBalAfter).to.eq(collateralPenalty);
    expect(xocBalAfter).to.be.lt(xocBalBefore);
    expect(xocBalAfter).to.eq(xocBalBefore.sub(costAmount));
  });
});
