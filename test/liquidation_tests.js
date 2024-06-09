const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {basicFixture} = require("./fixtures/basicFixture");

const DEBUG = false;

describe("Xoc Liquidation Tests", function () {
    /// 10,000 XOC per WETH
    const SIMPLE_WETH_XOC_PRICE = ethers.parseUnits("10000", 8);
    const LARGE_XOC_AMT = ethers.parseUnits("1000000", 18);

    let utilsStore;
    let rid;
    let bid;

    const setupFixture = async function () {
        const setup = await loadFixture(basicFixture);
        const accounts = await ethers.getSigners();
        const liquidatorUser = accounts[19];
        const dumbUser = accounts[10];
        // Set a simple price for computations
        await setup.priceFeed.setPriceFeedData(SIMPLE_WETH_XOC_PRICE);
        // Load liquidatorUser
        await setup.xoc.mint(liquidatorUser.address, LARGE_XOC_AMT);
        return {
            liquidatorUser,
            dumbUser,
            ...setup,
        };
    };

    before(async () => {
        const setup = await loadFixture(setupFixture);
        utilsStore = {
            weth: setup.weth,
            xoc: setup.xoc,
            reservehouse: setup.reservehouse,
            coinhouse: setup.coinhouse,
            liquidatorUser: setup.liquidatorUser,
            dumbUser: setup.dumbUser,
        };
        rid = await setup.reservehouse.reserveTokenID();
        bid = await setup.reservehouse.backedTokenID();
    });

    /**
     * Performs deposit and mint routine for dumbUser.
     * @param userSigner - EthersJS signer
     * @param {ethers.BigNumber} depositAmount - Etherjs compatible BigNumber.
     * @param {ethers.BigNumber} mintAmount - Etherjs compatible BigNumber.
     */
    const depositMintRoutine = async (userSigner, depositAmount, mintAmount) => {
        await utilsStore.weth.connect(userSigner).mintFaucet(depositAmount);
        await utilsStore.weth.connect(userSigner).approve(await utilsStore.reservehouse.getAddress(), depositAmount);
        await utilsStore.reservehouse.connect(userSigner).deposit(depositAmount);
        await utilsStore.coinhouse
            .connect(userSigner)
            .mintCoin(await utilsStore.weth.getAddress(), await utilsStore.reservehouse.getAddress(), mintAmount);
        expect(await utilsStore.xoc.balanceOf(userSigner.address)).to.eq(mintAmount);
    };

    it("Should return a good health ratio", async () => {
        const {coinhouse, reservehouse, dumbUser} = await loadFixture(setupFixture);
        // dumbUser Actions
        const depositAmount = ethers.parseUnits("1", 18);
        const mintAmount = ethers.parseUnits("7000", 18);
        await depositMintRoutine(dumbUser, depositAmount, mintAmount);

        const liqParam = await coinhouse.getLiqParams();
        const price = await coinhouse.getLatestPrice(await reservehouse.getAddress());
        const healthRatio = await coinhouse.computeUserHealthRatio(dumbUser.address, await reservehouse.getAddress());

        if (DEBUG) {
            console.log("oracleLastPrice", price.toString());
            console.log(
                "liqParam",
                liqParam.map((each) => each.toString()),
            );
            console.log("healthRatio", healthRatio.toString());
        }

        const OneInWei = ethers.parseUnits("1", 18);
        expect(healthRatio).to.be.gt(OneInWei);
    });

    it("Should revert when trying to liquidate a good health ratio", async () => {
        const {reservehouse, liquidator, dumbUser, liquidatorUser} = await loadFixture(setupFixture);
        // dumbUser Actions
        const depositAmount = ethers.parseUnits("1", 18);
        const mintAmount = ethers.parseUnits("7000", 18);
        await depositMintRoutine(dumbUser, depositAmount, mintAmount);

        // liquidatorUser actions
        let liqudiatorL = liquidator.connect(liquidatorUser);

        await expect(liqudiatorL.liquidateUser(dumbUser.address, await reservehouse.getAddress())).to.be.reverted;
    });

    it("Should return a bad health ratio", async () => {
        const {reservehouse, coinhouse, priceFeed, dumbUser} = await loadFixture(setupFixture);
        // dumbUser Actions
        const depositAmount = ethers.parseUnits("1", 18);
        const mintAmount = ethers.parseUnits("7400", 18);
        await depositMintRoutine(dumbUser, depositAmount, mintAmount);

        // Force into bad healthratio by dropping 10% price
        await priceFeed.setPriceFeedData((SIMPLE_WETH_XOC_PRICE * 90n) / 100n);

        const price = await reservehouse.getLatestPrice();
        const liqParam = await coinhouse.getLiqParams();
        const healthRatio = await coinhouse.computeUserHealthRatio(dumbUser.address, await reservehouse.getAddress());

        if (DEBUG) {
            console.log("oracleLastPrice", price.toString());
            console.log(
                "liqParam",
                liqParam.map((each) => each.toString()),
            );
            console.log("healthRatio", healthRatio.toString());
        }

        const unitWAD = ethers.parseUnits("1", 18);
        expect(healthRatio).to.be.lt(unitWAD);
    });

    it("Should log a Margincall event", async () => {
        const {xoc, weth, reservehouse, liquidator, priceFeed, dumbUser, liquidatorUser} =
            await loadFixture(setupFixture);
        // dumbUser Actions
        const depositAmount = ethers.parseUnits("1", 18);
        const mintAmount = ethers.parseUnits("7400", 18);
        await depositMintRoutine(dumbUser, depositAmount, mintAmount);

        // Force into liquidation by dropping 10% price
        await priceFeed.setPriceFeedData((SIMPLE_WETH_XOC_PRICE * 90n) / 100n);

        // liquidatorUser actions
        let liquidatorL = liquidator.connect(liquidatorUser);

        const txResponse = await liquidatorL.liquidateUser(dumbUser.address, await reservehouse.getAddress());
        const txReceipt = await txResponse.wait();

        if (DEBUG) {
            console.log("logs", txReceipt.logs);
        }

        const txLogTopics = [txReceipt.logs[0].topics[1], txReceipt.logs[0].topics[2], txReceipt.logs[0].topics[3]];

        let expectedTopics = [
            ethers.zeroPadValue(dumbUser.address, 32),
            ethers.zeroPadValue(await xoc.getAddress(), 32),
            ethers.zeroPadValue(await weth.getAddress(), 32),
        ];

        expectedTopics = expectedTopics.map((each) => each.toLowerCase());

        if (DEBUG) {
            console.log("txLogTopics", txLogTopics);
            console.log("expectedTopics", expectedTopics);
        }

        for (let index = 0; index < txLogTopics.length; index++) {
            expect(expectedTopics[index]).to.eq(txLogTopics[index]);
        }
    });

    it("Should have penalty price be less than oracle price", async () => {
        const {reservehouse, liquidator, priceFeed, dumbUser, liquidatorUser} = await loadFixture(setupFixture);
        // dumbUser Actions
        const depositAmount = ethers.parseUnits("1", 18);
        const mintAmount = ethers.parseUnits("500", 18);
        await depositMintRoutine(dumbUser, depositAmount, mintAmount);

        // Force into liquidation by dropping 15% price
        await priceFeed.setPriceFeedData((SIMPLE_WETH_XOC_PRICE * 85n) / 100n);

        // liquidatorUser actions
        let liquidatorL = liquidator.connect(liquidatorUser);

        const [costAmount, collateralPenalty] = await liquidatorL.computeCostOfLiquidation(
            dumbUser.address,
            await reservehouse.getAddress(),
        );

        let computedPrice = (costAmount * ethers.parseUnits("1", 8)) / collateralPenalty;
        let oraclePrice = await reservehouse.getLatestPrice();

        if (DEBUG) {
            console.log("costAmount", costAmount.toString(), "collateralPenalty", collateralPenalty.toString());
            console.log("computedPrice", computedPrice.toString(), "oraclePrice", oraclePrice.toString());
        }

        expect(computedPrice).to.be.lt(oraclePrice);
    });

    it("Should liquidate user", async () => {
        const {xoc, accountant, reservehouse, liquidator, priceFeed, dumbUser, liquidatorUser} =
            await loadFixture(setupFixture);
        // dumbUser Actions
        const depositAmount = ethers.parseUnits("1", 18);
        const mintAmount = ethers.parseUnits("7400", 18);
        await depositMintRoutine(dumbUser, depositAmount, mintAmount);

        // Force into liquidation by dropping 15% price
        await priceFeed.setPriceFeedData((SIMPLE_WETH_XOC_PRICE * 85n) / 100n);

        // liquidatorUser actions
        let liquidatorL = liquidator.connect(liquidatorUser);

        [costAmount, collateralPenalty] = await liquidatorL.computeCostOfLiquidation(
            dumbUser.address,
            await reservehouse.getAddress(),
        );

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
