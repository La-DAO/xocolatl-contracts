const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {basicFixture, WETH_MXN_PRICE} = require("./fixtures/basicFixture");

describe("Xoc Tests - General Systems tests", function () {
    // Global Test variables

    let rid;
    let bid;

    before(async () => {
        accounts = await ethers.getSigners();
        const setup = await loadFixture(basicFixture);
        const reservehouse = setup.reservehouse;
        rid = await reservehouse.reserveTokenID();
        bid = await reservehouse.backedTokenID();
    });

    it("PriceFeed should return price constant", async () => {
        const {priceFeed} = await loadFixture(basicFixture);
        const response = await priceFeed.latestRoundData();
        const price = response[1];
        expect(price).to.eq(WETH_MXN_PRICE);
    });

    it("House Of Reserve should have a computed priceFeed address", async () => {
        const {reservehouse, priceFeed} = await loadFixture(basicFixture);
        const response = await reservehouse.getComputedPriceFeedAddr();
        expect(response).to.eq(await priceFeed.getAddress());
    });

    it("House of Reserve and House of Coin should return same price value", async () => {
        const {reservehouse, coinhouse} = await loadFixture(basicFixture);
        const price = await reservehouse.getLatestPrice();
        expect(price).to.be.gt(0);
        const price2 = await coinhouse.getLatestPrice(await reservehouse.getAddress());
        expect(price2).to.be.gt(0);
        expect(price).to.eq(price2);
    });

    it("Deposit in HouseOfReserve", async () => {
        const {weth, reservehouse, accountant} = await loadFixture(basicFixture);
        const depositAmount = ethers.parseUnits("50", 18);
        await weth.connect(accounts[1]).deposit({value: depositAmount});
        await weth.connect(accounts[1]).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(accounts[1]).deposit(depositAmount);
        expect(await accountant.balanceOf(accounts[1].address, rid)).to.eq(depositAmount);
        expect(await accountant.totalSupply(rid)).to.eq(depositAmount);
    });

    it("Deposit in HouseOfReserve, sending native-token directly", async () => {
        const {reservehouse, accountant} = await loadFixture(basicFixture);
        const depositAmount = ethers.parseUnits("50", 18);
        // This method does automatic wrapping to WETH-token-type and deposit.
        const tx = {
            to: await reservehouse.getAddress(),
            value: depositAmount,
        };
        await accounts[1].sendTransaction(tx);
        expect(await accountant.balanceOf(accounts[1].address, rid)).to.eq(depositAmount);
        expect(await accountant.totalSupply(rid)).to.eq(depositAmount);
    });

    it("Mint in HouseOfCoin", async () => {
        const {weth, reservehouse, coinhouse, xoc, accountant} = await loadFixture(basicFixture);
        const depositAmount = ethers.parseUnits("50", 18);
        const mintAmount = ethers.parseUnits("2500", 18);
        await weth.connect(accounts[1]).deposit({value: depositAmount});
        await weth.connect(accounts[1]).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(accounts[1]).deposit(depositAmount);
        await coinhouse
            .connect(accounts[1])
            .mintCoin(await weth.getAddress(), await reservehouse.getAddress(), mintAmount);
        expect(await xoc.balanceOf(accounts[1].getAddress())).to.eq(mintAmount);
        expect(await accountant.totalSupply(bid)).to.eq(mintAmount);
    });

    it("Payback in HouseOfCoin", async () => {
        const {weth, reservehouse, coinhouse, xoc, accountant} = await loadFixture(basicFixture);
        const depositAmount = ethers.parseUnits("50", 18);
        const mintAmount = ethers.parseUnits("2500", 18);
        await weth.connect(accounts[1]).deposit({value: depositAmount});
        await weth.connect(accounts[1]).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(accounts[1]).deposit(depositAmount);
        await coinhouse
            .connect(accounts[1])
            .mintCoin(await weth.getAddress(), await reservehouse.getAddress(), mintAmount);
        expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);

        await coinhouse.connect(accounts[1]).paybackCoin(bid, mintAmount);
        expect(await xoc.balanceOf(accounts[1].address)).to.eq(0);
        expect(await accountant.balanceOf(accounts[1].address, bid)).to.eq(0);
        expect(await accountant.totalSupply(bid)).to.eq(0);
    });

    it("Withdraw in HouseOfReserve", async () => {
        const {weth, reservehouse, coinhouse, xoc, accountant} = await loadFixture(basicFixture);
        const depositAmount = ethers.parseUnits("50", 18);
        const mintAmount = ethers.parseUnits("2500", 18);
        await weth.connect(accounts[1]).deposit({value: depositAmount});
        await weth.connect(accounts[1]).approve(await reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(accounts[1]).deposit(depositAmount);
        await coinhouse
            .connect(accounts[1])
            .mintCoin(await weth.getAddress(), await reservehouse.getAddress(), mintAmount);
        expect(await xoc.balanceOf(accounts[1].address)).to.eq(mintAmount);
        await coinhouse.connect(accounts[1]).paybackCoin(bid, mintAmount);
        expect(await xoc.balanceOf(accounts[1].address)).to.eq(0);
        await reservehouse.connect(accounts[1]).withdraw(depositAmount);
        expect(await weth.balanceOf(accounts[1].address)).to.equal(depositAmount);
    });
});
