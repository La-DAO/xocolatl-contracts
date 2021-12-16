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

describe("efiat Sytem Tests", function () {

  // Global Test variables
  let accounts;
  let accountant;
  let coinhouse;
  let reservehouse;
  let fiat;
  let mockweth;

  let rid;
  let bid;

  let evmSnapshot0;

  before(async () => {

    accounts = await ethers.getSigners();

    const loadFixture = createFixtureLoader(accounts, provider);
    const loadedContracts = await loadFixture(deploy_setup);

    evmSnapshot0 = await evmSnapshot();
    
    accountant = loadedContracts.accountant;
    coinhouse = loadedContracts.w_coinhouse;
    reservehouse = loadedContracts.w_reservehouse;
    fiat = loadedContracts.fiat;
    mockweth = loadedContracts.mockweth;

    rid = await reservehouse.reserveTokenID();
    bid = await reservehouse.backedTokenID();
  });

  it("Oracle price feed tests, should return a price value", async () => {
    await syncTime();
    const price = await coinhouse.redstoneGetLastPrice(); 
    await expect(price).to.be.gt(0);

    await syncTime();
    const price2 = await reservehouse.redstoneGetLastPrice();
    await expect(price2).to.be.gt(0);
  });
});
