const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {polygonFixture} = require("./fixture/polygonFixture.js");
const {setERC20UserBalance} = require("../../test/utils.js");

describe("Xoc Tests - Polygon General", function () {
    // Global Test variables
    let accounts;
    let rid;
    let bid;

    before(async () => {
        accounts = await ethers.getSigners();
        const setup = await loadFixture(polygonFixture);
        const reservehouse = setup.reservehouse;
        rid = await reservehouse.reserveTokenID();
        bid = await reservehouse.backedTokenID();
    });

    it("Oracle price feed tests, should return cross-checked value", async () => {
        const {reservehouse, coinhouse, priceFeed} = await loadFixture(polygonFixture);
        const priceRef = await priceFeed.latestAnswer();
        const price = await reservehouse.getLatestPrice();
        expect(price).to.eq(priceRef);
        const price2 = await coinhouse.getLatestPrice(await reservehouse.getAddress());
        expect(price2).to.eq(price);
    });

    it("Deposit in HouseOfReserve", async () => {
        const {weth, reservehouse, accountant} = await loadFixture(polygonFixture);
        const user = accounts[1];
        const depositAmount = ethers.parseUnits("50", 18);
        await setERC20UserBalance(await user.getAddress(), await weth.getAddress(), "polygon", depositAmount);
        await weth.connect(user).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(user).deposit(depositAmount);
        expect(await accountant.balanceOf(await user.getAddress(), rid)).to.eq(depositAmount);
    });

    it("Mint in HouseOfCoin", async () => {
        const {weth, reservehouse, coinhouse, xoc} = await loadFixture(polygonFixture);
        const user = accounts[1];
        const depositAmount = ethers.parseUnits("50", 18);
        const mintAmount = ethers.parseUnits("2500", 18);
        await setERC20UserBalance(await user.getAddress(), await weth.getAddress(), "polygon", depositAmount);
        await weth.connect(user).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(user).deposit(depositAmount);
        await coinhouse.connect(user).mintCoin(await weth.getAddress(), await reservehouse.getAddress(), mintAmount);
        expect(await xoc.balanceOf(await user.getAddress())).to.eq(mintAmount);
    });

    it("Payback in HouseOfCoin", async () => {
        const {weth, reservehouse, coinhouse, xoc} = await loadFixture(polygonFixture);
        const user = accounts[1];
        const depositAmount = ethers.parseUnits("50", 18);
        const mintAmount = ethers.parseUnits("2500", 18);
        await setERC20UserBalance(await user.getAddress(), await weth.getAddress(), "polygon", depositAmount);
        await weth.connect(user).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(user).deposit(depositAmount);
        await coinhouse.connect(user).mintCoin(await weth.getAddress(), await reservehouse.getAddress(), mintAmount);
        await coinhouse.connect(user).paybackCoin(bid, mintAmount);
        expect(await xoc.balanceOf(await user.getAddress())).to.eq(0);
    });

    it("Withdraw in HouseOfReserve", async () => {
        const {weth, reservehouse, coinhouse} = await loadFixture(polygonFixture);
        const user = accounts[1];
        const depositAmount = ethers.parseUnits("50", 18);
        const mintAmount = ethers.parseUnits("2500", 18);
        await setERC20UserBalance(await user.getAddress(), await weth.getAddress(), "polygon", depositAmount);
        await weth.connect(user).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(user).deposit(depositAmount);
        await coinhouse.connect(user).mintCoin(await weth.getAddress(), await reservehouse.getAddress(), mintAmount);
        await coinhouse.connect(user).paybackCoin(bid, mintAmount);
        await reservehouse.connect(user).withdraw(depositAmount);
        expect(await weth.balanceOf(await user.getAddress())).to.equal(depositAmount);
    });
});
