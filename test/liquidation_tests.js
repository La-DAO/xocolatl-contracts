const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { 
  basicFixture,
  WETH_MXN_PRICE
 } = require("./fixtures/basicFixture");

const { provider } = ethers;

const {
  evmSnapshot,
  evmRevert,
  setERC20UserBalance
} = require("./utils.js");

const DEBUG = false;

describe("Xoc Liquidation Tests", function () {

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

    const loadedContracts = await loadFixture(basicFixture);

    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.coinhouse;
    reservehouse = loadedContracts.reservehouse;
    liquidator = loadedContracts.liquidator;
    xoc = loadedContracts.xoc;
    weth = loadedContracts.weth;

    rid = await reservehouse.reserveTokenID();
    bid = await reservehouse.backedTokenID();

    // Load liquidatorUser
    await xoc.mint(liquidatorUser.address, largeAmountXoc);
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
    await weth.connect(dumbUser).mintFaucet(depositAmount);
    await weth.connect(dumbUser).approve(await reservehouse.getAddress(), depositAmount);
    await reservehouse.connect(dumbUser).deposit(depositAmount);
    await coinhouse.connect(dumbUser).mintCoin(await weth.getAddress(), await reservehouse.getAddress(), mintAmount);
    expect(await xoc.balanceOf(dumbUser.address)).to.eq(mintAmount);
  }

  /**
  * Transforms regular healthy position of dumbUser into close to liquidation.
  * Must followed a 'depositMintRoutine' function call.
  */
  const makeARiskyPosition = async () => {
    const remainingMintingPower = await coinhouse.checkRemainingMintingPower((dumbUser.address), await reservehouse.getAddress());
    const percentDesired = ethers.getBigInt("99");
    const percentBase = ethers.getBigInt("100");
    const extraToMint = (remainingMintingPower * percentDesired) / percentBase;
    if (DEBUG) {
      console.log("remainingMintingPower", remainingMintingPower.toString());
      console.log("extraToMint", extraToMint.toString());
    }
    await coinhouse.connect(dumbUser).mintCoin(await weth.getAddress(), await reservehouse.getAddress(), extraToMint);
  }


  it("Should return a good health ratio", async () => {
    // dumbUser Actions
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);

    const liqParam = await coinhouse.getLiqParams();
    const price = await coinhouse.getLatestPrice(await reservehouse.getAddress());
    const healthRatio = await coinhouse.computeUserHealthRatio(dumbUser.address, await reservehouse.getAddress());

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

    await expect(liqudiatorL.liquidateUser(dumbUser.address, await reservehouse.getAddress())).to.be.reverted;
  });

  it("Should return a bad health ratio", async () => {
    // dumbUser Actions
    const depositAmount = ethers.parseUnits("1", 18);
    const mintAmount = ethers.parseUnits("500", 18);
    await depositMintRoutine(depositAmount, mintAmount);
    await makeARiskyPosition();

    // Force into liquidation by burning 10% of collateral just for test purpose.
    const burnAmount = (depositAmount * ethers.getBigInt("10")) / ethers.getBigInt("100");
    await accountant.connect(accounts[0]).burn(dumbUser.address, rid, burnAmount);

    const price = await reservehouse.getLatestPrice();
    const liqParam = await coinhouse.getLiqParams();
    const healthRatio = await coinhouse.computeUserHealthRatio(dumbUser.address, await reservehouse.getAddress());

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
    const burnAmount = (depositAmount * ethers.getBigInt("7")) / ethers.getBigInt("100");
    await accountant.connect(accounts[0]).burn(dumbUser.getAddress(), rid, burnAmount);

    // liquidatorUser actions
    let liquidatorL = liquidator.connect(liquidatorUser);

    const txResponse = await liquidatorL.liquidateUser(dumbUser.address, await reservehouse.getAddress());
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
      ethers.zeroPadValue(dumbUser.address, 32),
      ethers.zeroPadValue(await xoc.getAddress(), 32),
      ethers.zeroPadValue(await weth.getAddress(), 32)
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
    const burnAmount = (depositAmount * ethers.getBigInt("10")) / ethers.getBigInt("100");
    await accountant.connect(accounts[0]).burn(dumbUser.address, rid, burnAmount);

    // liquidatorUser actions
    let liquidatorL = liquidator.connect(liquidatorUser);

    [
      costAmount,
      collateralPenalty
    ] = await liquidatorL.computeCostOfLiquidation(dumbUser.address, await reservehouse.getAddress());

    let computedPrice = (costAmount * ethers.parseUnits("1", 8)) / collateralPenalty;
    let oraclePrice = await reservehouse.getLatestPrice();

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
    const burnAmount = (depositAmount * ethers.getBigInt("20")) / ethers.getBigInt("100");
    await accountant.connect(accounts[0]).burn(dumbUser.address, rid, burnAmount);

    // liquidatorUser actions
    let liquidatorL = liquidator.connect(liquidatorUser);

    [
      costAmount,
      collateralPenalty
    ] = await liquidatorL.computeCostOfLiquidation(dumbUser.address, await reservehouse.getAddress());

    await xoc.connect(liquidatorUser).approve(await liquidatorL.getAddress(), costAmount);

    const wethBalBefore = await accountant.balanceOf(liquidatorUser.address, rid);
    const xocBalBefore = await xoc.balanceOf(liquidatorUser.address);

    const liquidatorRole = await accountant.LIQUIDATOR_ROLE();
    const response = await accountant.hasRole(liquidatorRole, await liquidatorL.getAddress());
    await liquidatorL.liquidateUser(dumbUser.address, await reservehouse.getAddress());

    const wethBalAfter = await accountant.balanceOf(liquidatorUser.address, rid);
    const xocBalAfter = await xoc.balanceOf(liquidatorUser.address);

    if (DEBUG) {
      console.log("wethBalBefore", wethBalBefore.toString(), "wethBalAfter", wethBalAfter.toString());
      console.log("xocBalBefore", xocBalBefore.toString(), "xocBalAfter", xocBalAfter.toString());
    }

    expect(wethBalAfter).to.be.gt(wethBalBefore);
    expect(wethBalAfter).to.eq(collateralPenalty);
    expect(xocBalAfter).to.be.lt(xocBalBefore);
    expect(xocBalAfter).to.eq(xocBalBefore - costAmount);
  });
});
