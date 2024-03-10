const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { basicFixture } = require("./fixtures/basicFixture");
const { evmSnapshot, evmRevert } = require("./utils.js");

describe("Xoc System Tests - Fee collection", function () {
  // Global Test variables
  let accounts;

  const DEPOSIT_AMOUNT = ethers.parseEther("1");
  const MINT_AMOUNT = ethers.parseEther("1000");
  const ONE_AND_HALF_PERCENT = 15000n;
  const ALL_BPS = 1000000n;

  const setupFixture = async function () {
    const loadedContracts = await loadFixture(basicFixture);
    const rid = await loadedContracts.reservehouse.reserveTokenID();
    const bid = await loadedContracts.reservehouse.backedTokenID();
    // Set treasury
    await loadedContracts.coinhouse.setTreasury(loadedContracts.treasury);
    // Set reserve minting fee
    await loadedContracts.reservehouse.setReserveMintFee(ONE_AND_HALF_PERCENT);
    return { ...loadedContracts, rid, bid };
  };

  before(async () => {
    accounts = await ethers.getSigners();
  });

  it("should check user has fee debt and treasury collected fee", async () => {
    const { xoc, reservehouse, weth, coinhouse, accountant, bid, treasury } =
      await loadFixture(setupFixture);

    const user = accounts[1];
    await weth.connect(user).deposit({ value: DEPOSIT_AMOUNT });
    await weth
      .connect(user)
      .approve(await reservehouse.getAddress(), DEPOSIT_AMOUNT);
    await reservehouse.connect(user).deposit(DEPOSIT_AMOUNT);
    await coinhouse
      .connect(user)
      .mintCoin(
        await weth.getAddress(),
        await reservehouse.getAddress(),
        MINT_AMOUNT
      );
    const userDebt = await accountant.balanceOf(user.address, bid);
    const expectedFee = (MINT_AMOUNT * ONE_AND_HALF_PERCENT) / ALL_BPS;
    expect(userDebt).to.eq(MINT_AMOUNT + expectedFee);
    expect(await xoc.balanceOf(treasury)).to.eq(expectedFee);
  });

  it("should check setting zero address treasury fails", async () => {
    const { coinhouse } = await loadFixture(setupFixture);
    await expect(
      coinhouse.setTreasury(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(coinhouse, "HouseOfCoin_invalidInput");
  });

  it("should check setting treasury by non-owner fails", async () => {
    const { coinhouse } = await loadFixture(setupFixture);
    await expect(
      coinhouse.connect(accounts[1]).setTreasury(accounts[2].address)
    ).to.be.reverted;
  });

  it("should check setting treasury by owner succeeds", async () => {
    const { coinhouse } = await loadFixture(setupFixture);
    const randoAddress = await accounts[1].getAddress();
    await coinhouse.setTreasury(randoAddress);
    expect(await coinhouse.treasury()).to.eq(randoAddress);
  });

  it("should check setting reserve minting fee by non-owner fails", async () => {
    const { reservehouse } = await loadFixture(setupFixture);
    await expect(reservehouse.connect(accounts[1]).setReserveMintFee(0)).to.be
      .reverted;
  });

  it("should check setting reserve minting fee by owner succeeds", async () => {
    const { reservehouse } = await loadFixture(setupFixture);
    await reservehouse.setReserveMintFee(0);
    expect(await reservehouse.reserveMintFee()).to.eq(0);
  });

  it("should check setting reserve minting fee to 100% fails", async () => {
    const { reservehouse } = await loadFixture(setupFixture);
    await expect(
      reservehouse.setReserveMintFee(ALL_BPS)
    ).to.be.revertedWithCustomError(
      reservehouse,
      "HouseOfReserve_invalidInput"
    );
  });

  it("should check no fee is collected when reserve minting fee is 0", async () => {
    const { xoc, reservehouse, weth, coinhouse, accountant, bid, treasury } =
      await loadFixture(setupFixture);

    await reservehouse.setReserveMintFee(0);
    const user = accounts[1];
    await weth.connect(user).deposit({ value: DEPOSIT_AMOUNT });
    await weth
      .connect(user)
      .approve(await reservehouse.getAddress(), DEPOSIT_AMOUNT);
    await reservehouse.connect(user).deposit(DEPOSIT_AMOUNT);
    await coinhouse
      .connect(user)
      .mintCoin(
        await weth.getAddress(),
        await reservehouse.getAddress(),
        MINT_AMOUNT
      );
    const userDebt = await accountant.balanceOf(user.address, bid);
    expect(userDebt).to.eq(MINT_AMOUNT);
    expect(await xoc.balanceOf(treasury)).to.eq(0);
  });
});
