const { expect } = require("chai");
const { ethers } = require("hardhat");
const { provider } = ethers;

const {
  evmSnapshot,
  evmRevert
} = require("../utils.js");

describe("Xoc Tests - Computed Price Feed Oracle", function () {

  // Global Test variables
  const description = "btc/usd computed";
  const decimals = 8;
  const btceth = "0x5fb1616F78dA7aFC9FF79e0371741a747D2a7F22";
  const ethusd = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const allowedTimeout = 86400;

  let computedPriceFeed;

  let evmSnapshot0;
  let evmSnapshot1;

  before(async () => {
    evmSnapshot0 = await evmSnapshot();

    accounts = await ethers.getSigners();

    const ComputedPriceFeed = await ethers.getContractFactory("ComputedPriceFeed");
    computedPriceFeed = await ComputedPriceFeed.deploy(
      description, decimals, btceth, ethusd, allowedTimeout
    );
  });

  beforeEach(async function () {
    if (evmSnapshot1) await evmRevert(evmSnapshot1);
    evmSnapshot1 = await evmSnapshot();
  });

  after(async () => {
    await evmRevert(evmSnapshot0);
  });


  it("ComputedPriceFeed constructor properties should match", async () => {
    const desc = await computedPriceFeed.description();
    expect(desc).to.eq(description);

    const decim = await computedPriceFeed.decimals();
    expect(decim).to.eq(decimals);

    const feed1 = await computedPriceFeed.feedAsset();
    expect(feed1).to.eq(btceth);

    const feed2 = await computedPriceFeed.feedInterAsset();
    expect(feed2).to.eq(ethusd);
  });

  it("Oracle price feed tests, should return a expected price value", async () => {
    const price = await computedPriceFeed.latestAnswer();

    const feed1 = await ethers.getContractAt("IPriceBulletin", await computedPriceFeed.feedAsset());
    const f1Price = await feed1.latestAnswer();
    const f1decimals = parseInt((await feed1.decimals()).toString());

    const feed2 = await ethers.getContractAt("IPriceBulletin",await computedPriceFeed.feedInterAsset());
    const f2Price = await feed2.latestAnswer();
    const f2decimals = parseInt((await feed2.decimals()).toString());

    const refPrice = f1Price * f2Price * BigInt(10 ** (decimals)) / BigInt(10 ** (f1decimals + f2decimals));
    expect(price).to.be.eq(refPrice);
  });
});
