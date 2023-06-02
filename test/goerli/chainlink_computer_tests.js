const { expect } = require("chai");
const { ethers } = require("hardhat");
const { provider } = ethers;

const {
  evmSnapshot,
  evmRevert
} = require("../utils.js");

describe("Xoc Tests - ChainlinkComputed Oracle", function () {

  // Global Test variables
  const description = "btc/usd computed";
  const decimals = 8;
  const btceth = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
  const ethusd = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";
  const allowedTimeout = 86400;

  let chainlinkComputed;

  let evmSnapshot0;
  let evmSnapshot1;

  before(async () => {
    evmSnapshot0 = await evmSnapshot();

    accounts = await ethers.getSigners();

    const ChainlinkComputed = await ethers.getContractFactory("ChainlinkComputedOracle");
    chainlinkComputed = await ChainlinkComputed.deploy(
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


  it("ChainlinkComputedOracle constructor properties should match", async () => {
    const desc = await chainlinkComputed.description();
    expect(desc).to.eq(description);

    const decim = await chainlinkComputed.decimals();
    expect(decim).to.eq(decimals);

    const feed1 = await chainlinkComputed.feedAsset();
    expect(feed1).to.eq(btceth);

    const feed2 = await chainlinkComputed.feedInterAsset();
    expect(feed2).to.eq(ethusd);
  });

  it("Oracle price feed tests, should return a price value", async () => {
    const price = await chainlinkComputed.latestAnswer();
    expect(price).to.be.gt(0);
  });
});
