const { expect } = require("chai");
const { ethers } = require("hardhat");
const { provider } = ethers;

const {
  evmSnapshot,
  evmRevert
} = require("../utils.js");

describe("Xoc Tests - ChainlinkComputed Oracle", function () {

  // Global Test variables
  const description = "wsteth/usd computed";
  const decimals = 8;
  const wstetheth = "0x10f964234cae09cB6a9854B56FF7D4F38Cda5E6a";
  const ethusd = "0xF9680D99D6C9589e2a93a78A04A279e509205945";
  const allowedTimeout = 42300;

  let chainlinkComputed;

  let evmSnapshot0;
  let evmSnapshot1;

  before(async () => {
    evmSnapshot0 = await evmSnapshot();

    accounts = await ethers.getSigners();

    const ChainlinkComputed = await ethers.getContractFactory("ChainlinkComputedOracle");
    chainlinkComputed = await ChainlinkComputed.deploy(
      description, decimals, wstetheth, ethusd, allowedTimeout
    );
  });

  beforeEach(async function () {
    if (evmSnapshot1) await evmRevert(evmSnapshot1);
    evmSnapshot1 = await evmSnapshot();
  });

  after(async () => {
    await evmRevert(evmSnapshot0);
  });


  it("ChainlinkComputedOracle constructor properties should match", async () => {
    const desc = await chainlinkComputed.description();
    expect(desc).to.eq(description);

    const decim = await chainlinkComputed.decimals();
    expect(decim).to.eq(decimals);

    const feed1 = await chainlinkComputed.feedAsset();
    expect(feed1).to.eq(wstetheth);

    const feed2 = await chainlinkComputed.feedInterAsset();
    expect(feed2).to.eq(ethusd);
  });

  it("Oracle price feed tests, should return a price value", async () => {
    const price = await chainlinkComputed.latestAnswer();
    console.log(price.toString());
    expect(price).to.be.gt(0);
  });
});
