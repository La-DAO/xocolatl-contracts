const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Xoc Tests - ComputedPriceFeed Oracle", function () {
    // Global Test variables
    let accounts;

    const description = "wsteth/usd computed";
    const decimals = 8;
    const wstetheth = "0x10f964234cae09cB6a9854B56FF7D4F38Cda5E6a"; // Polygon oracle WstETH/ETH
    const ethusd = "0xF9680D99D6C9589e2a93a78A04A279e509205945"; // Polygon oracle ETH/USD
    const allowedTimeout = 86400;

    const setupFixture = async function () {
        accounts = await ethers.getSigners();

        const OracleFactory = await ethers.getContractFactory("OracleFactory");

        const InversePriceFeed = await ethers.getContractFactory("InversePriceFeed");
        const ComputedPriceFeed = await ethers.getContractFactory("ComputedPriceFeed");
        const PriceFeedPythWrapper = await ethers.getContractFactory("PriceFeedPythWrapper");

        const oracleFactory = await OracleFactory.deploy();

        const ipricefeedImpl = await InversePriceFeed.deploy();
        const cpricefeedImpl = await ComputedPriceFeed.deploy();
        const pythWrapperImpl = await PriceFeedPythWrapper.deploy();

        await oracleFactory.setInversePriceFeedImpl(await ipricefeedImpl.getAddress());
        await oracleFactory.setComputedPriceFeedImpl(await cpricefeedImpl.getAddress());
        await oracleFactory.setPriceFeedPythWrapperImpl(await pythWrapperImpl.getAddress());

        const initArgs = [description, decimals, wstetheth, ethusd, allowedTimeout];
        const feedAddr = await oracleFactory.createComputedPriceFeed.staticCall(...initArgs);
        await oracleFactory.createComputedPriceFeed(...initArgs);
        const computedPriceFeed = await ethers.getContractAt("ComputedPriceFeed", feedAddr);

        return {
            oracleFactory,
            computedPriceFeed,
        };
    };

    it("ComputedPriceFeed constructor properties should match", async () => {
        const {computedPriceFeed} = await loadFixture(setupFixture);
        const desc = await computedPriceFeed.description();
        expect(desc).to.eq(description);

        const decim = await computedPriceFeed.decimals();
        expect(decim).to.eq(decimals);

        const feed1 = await computedPriceFeed.feedAsset();
        expect(feed1).to.eq(wstetheth);

        const feed2 = await computedPriceFeed.feedInterAsset();
        expect(feed2).to.eq(ethusd);
    });

    it("Oracle price feed tests, should return a expected price value", async () => {
        const {computedPriceFeed} = await loadFixture(setupFixture);

        const price = await computedPriceFeed.latestAnswer();

        const feed1 = await ethers.getContractAt("IPriceBulletin", await computedPriceFeed.feedAsset());
        const f1Price = await feed1.latestAnswer();
        const f1decimals = parseInt((await feed1.decimals()).toString());

        const feed2 = await ethers.getContractAt("IPriceBulletin", await computedPriceFeed.feedInterAsset());
        const f2Price = await feed2.latestAnswer();
        const f2decimals = parseInt((await feed2.decimals()).toString());

        const refPrice = (f1Price * f2Price * BigInt(10 ** decimals)) / BigInt(10 ** (f1decimals + f2decimals));
        expect(price).to.be.eq(refPrice);
    });
});
