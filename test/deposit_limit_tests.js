const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {basicFixture} = require("./fixtures/basicFixture");
const {evmSnapshot, evmRevert} = require("./utils.js");

describe("Xoc System Tests - Deposit Limit", function () {
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

    let depositLimitAmount;

    before(async () => {
        accounts = await ethers.getSigners();

        const loadedContracts = await loadFixture(basicFixture);

        accountant = loadedContracts.accountant;
        coinhouse = loadedContracts.coinhouse;
        reservehouse = loadedContracts.reservehouse;
        liquidator = loadedContracts.liquidator;
        xoc = loadedContracts.xoc;
        weth = loadedContracts.weth;

        rid = await reservehouse.reserveTokenID();
        bid = await reservehouse.backedTokenID();

        depositLimitAmount = ethers.parseEther("10");
        await reservehouse.setDepositLimit(depositLimitAmount);

        evmSnapshot0 = await evmSnapshot();
    });

    after(async () => {
        await evmRevert(evmSnapshot0);
    });

    it("User makes deposit in HouseOfReserve", async () => {
        const depositAmount = ethers.parseUnits("8", 18);
        const user = accounts[1];
        await weth.connect(user).deposit({value: depositAmount});
        await weth.connect(user).approve(reservehouse.getAddress(), depositAmount);
        await reservehouse.connect(user).deposit(depositAmount);
        expect(await accountant.balanceOf(user.getAddress(), rid)).to.eq(depositAmount);
        expect(await reservehouse.totalDeposits()).to.eq(depositAmount);
    });

    it("Second user makes deposit in HouseOfReserve, sending native-token directly", async () => {
        const depositAmount = ethers.parseUnits("2", 18);
        const user = accounts[2];
        // This method does automatic wrapping to WETH-token-type and deposit.
        const tx = {
            to: reservehouse.getAddress(),
            value: depositAmount,
        };
        await user.sendTransaction(tx);
        expect(await accountant.balanceOf(user.getAddress(), rid)).to.eq(depositAmount);
        expect(await reservehouse.totalDeposits()).to.eq(depositLimitAmount);
    });

    it("Should revert when additional user tries to deposit after 'depositLimit' is reached", async () => {
        const depositAmount = ethers.parseUnits("5", 18);
        const user = accounts[3];
        await weth.connect(user).deposit({value: depositAmount});
        await weth.connect(user).approve(reservehouse.getAddress(), depositAmount);
        await expect(reservehouse.connect(user).deposit(depositAmount)).to.be.reverted;
    });

    it("Should revert when additional user tries to deposit after 'depositLimit' is reached, sending native-token directly", async () => {
        const depositAmount = ethers.parseUnits("5", 18);
        const user = accounts[3];
        // This method does automatic wrapping to WETH-token-type and deposit.
        const tx = {
            to: reservehouse.getAddress(),
            value: depositAmount,
        };
        await expect(user.sendTransaction(tx)).to.be.reverted;
    });
});
