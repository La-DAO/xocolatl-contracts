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

  let depositLimitAmount;

  before(async () => {

    accounts = await ethers.getSigners();

    const loadFixture = createFixtureLoader(accounts, provider);
    const loadedContracts = await loadFixture(deploy_setup);

    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.coinhouse;
    reservehouse = loadedContracts.reservehouse;
    xoc = loadedContracts.xoc;
    mockweth = loadedContracts.mockweth;

    rid = await reservehouse.reserveTokenID();
    bid = await reservehouse.backedTokenID();

    depositLimitAmount = ethers.utils.parseEther("10");
    await reservehouse.setDepositLimit(depositLimitAmount);

    evmSnapshot0 = await evmSnapshot();
  });

  after(async () => {
    await evmRevert(evmSnapshot0);
  });

  it("User makes deposit in HouseOfReserve", async () => {
    const depositAmount = ethers.utils.parseUnits("8", 18);
    const user = accounts[1];
    await mockweth.connect(user).deposit({ value: depositAmount });
    await mockweth.connect(user).approve(reservehouse.address, depositAmount);
    await reservehouse.connect(user).deposit(depositAmount);
    expect(await accountant.balanceOf(user.address, rid)).to.eq(depositAmount);
    expect(await reservehouse.totalDeposits()).to.eq(depositAmount);
  });

  it("Second user makes deposit in HouseOfReserve, sending native-token directly", async () => {
    const depositAmount = ethers.utils.parseUnits("2", 18);
    const user = accounts[2];
    // This method does automatic wrapping to WETH-token-type and deposit.
    const tx = {
      to: reservehouse.address,
      value: depositAmount
    }
    await user.sendTransaction(tx);
    expect(await accountant.balanceOf(user.address, rid)).to.eq(depositAmount);
    expect(await reservehouse.totalDeposits()).to.eq(depositLimitAmount);
  });

  it("Should revert when additional user tries to deposit after 'depositLimit' is reached", async () => {
    const depositAmount = ethers.utils.parseUnits("5", 18);
    const user = accounts[3];
    await mockweth.connect(user).deposit({ value: depositAmount });
    await mockweth.connect(user).approve(reservehouse.address, depositAmount);
    await expect(reservehouse.connect(user).deposit(depositAmount)).to.be.reverted;
  });

  it("Should revert when additional user tries to deposit after 'depositLimit' is reached, sending native-token directly", async () => {
    const depositAmount = ethers.utils.parseUnits("5", 18);
    const user = accounts[3];
    // This method does automatic wrapping to WETH-token-type and deposit.
    const tx = {
      to: reservehouse.address,
      value: depositAmount
    }
    await expect(user.sendTransaction(tx)).to.be.reverted;
  });


});
