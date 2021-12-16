const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

const syncTime = async function () {
    const now = Math.ceil(new Date().getTime() / 1000);
    try {
      await ethers.provider.send('evm_setNextBlockTimestamp', [now]);
    } catch (error) {
      //Skipping time sync - block is ahead of current time
    }
};

const deploy_setup = async () => {

    const AssetsAccountant = await ethers.getContractFactory("AssetsAccountant");
    const HouseOfCoin = await ethers.getContractFactory("HouseOfCoin");
    const HouseOfReserve = await ethers.getContractFactory("HouseOfReserve");
    const MockeFiat = await ethers.getContractFactory("MockeFiat");
    const MockWETH = await ethers.getContractFactory("MockWETH");

    // 1.- Deploy all contracts
    let accountant = await AssetsAccountant.deploy();
    let coinhouse = await HouseOfCoin.deploy();
    let reservehouse = await HouseOfReserve.deploy();
    let fiat = await MockeFiat.deploy();
    let mockweth = await MockWETH.deploy();

    // 2.- Initialize house contracts and register with accountant
    await coinhouse.initialize(
        fiat.address,
        accountant.address
    );
    await reservehouse.initialize(
        mockweth.address,
        fiat.address,
        accountant.address
      );
    await accountant.registerHouse(
        coinhouse.address,
        fiat.address
    );
    await accountant.registerHouse(
        reservehouse.address,
        mockweth.address
    );

    // 3.- Assign minter and burner role to coinhouse in fiat ERC20
    const minter = await fiat.MINTER_ROLE();
    const burner = await fiat.BURNER_ROLE();
    await fiat.grantRole(minter, coinhouse.address);
    await fiat.grantRole(burner, coinhouse.address);

    // 4.- Authorize Provider
    const w_reservehouse = WrapperBuilder.wrapLite(reservehouse).usingPriceFeed("redstone-stocks");
    const w_coinhouse = WrapperBuilder.wrapLite(coinhouse).usingPriceFeed("redstone-stocks");

    // 5.- Authorize Redstone Provider
    const txrh = await w_reservehouse.authorizeProvider();
    await txrh.wait();
    const txch = await w_coinhouse.authorizeProvider();
    await txch.wait();

    await syncTime();

    return {
        accountant,
        w_coinhouse,
        w_reservehouse,
        fiat,
        mockweth
    }
}

const evmSnapshot = async () => ethers.provider.send("evm_snapshot", []);

const evmRevert = async (id) => ethers.provider.send("evm_revert", [id]);

module.exports = {
    deploy_setup,
    evmSnapshot,
    evmRevert,
    syncTime
  };
