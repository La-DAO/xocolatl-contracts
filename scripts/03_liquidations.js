const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

const fs = require("fs");

const { getDeployedContracts } = require("./utils.js");
const { removeDuplicates } = require("./helpers.js");

/**
 * @note Returns an array of addresses that have minted coin in a specific 'HouseOfCoin' deployed contract.
 * @param coinhouse etherjs contract object representing 'HouseOfCoin' deployed contract.
 * @param backedTokenID Id of the token minted.
 */
const getHistoricCoinMinters = async function (coinhouse, backedTokenID) {
  console.log("...Getting historic coin minters");
  const path = "./scripts/output/coinminted-events.json";
  if (fs.existsSync(path)) {
    let savedData = JSON.parse(fs.readFileSync(path).toString());
    const dataLastBlock = savedData[savedData.length - 1].blockNumber;
    const data = await fetchCoinMintEvents(coinhouse, dataLastBlock + 1);
    if (data.length > 0) {
      savedData.append(data);
      fs.writeFile(path, JSON.stringify(savedData), (err) => {
        if (err)
          console.log(err);
        else {
          console.log("...added CoinMinted events successfully");
        }
      });
    }
    const filteredbyBackedToken = savedData.filter(
      e => backedTokenID.eq(ethers.BigNumber.from(e.backedTokenID.hex))
    );
    return removeDuplicates(filteredbyBackedToken.map(e => e.user));

  } else {
    const data = await fetchCoinMintEvents(coinhouse);
    fs.writeFile(path, JSON.stringify(data), (err) => {
      if (err)
        console.log(err);
      else {
        console.log("...CoinMinted events saved successfully");
      }
    });
    const filteredbyBackedToken = savedData.filter(
      e => backedTokenID.eq(ethers.BigNumber.from(e.backedTokenID.hex))
    );
    return removeDuplicates(filteredbyBackedToken.map(e => e.user));
  }
}

/**
 * @note Returns formated array of events for 'CoinMint' of a specific 'HouseOfCoin' deployed contract.
 * @param coinhouse etherjs contract object representing 'HouseOfCoin' deployed contract.
 * @param startFromBlock block number reference to start searching for events.
 */
const fetchCoinMintEvents = async function (coinhouse, startFromBlock = 9913500) {
  const filterCoinMinted = await coinhouse.filters.CoinMinted();
  const eventsCoinMinted = await coinhouse.queryFilter(filterCoinMinted, startFromBlock);
  let data = [];
  if (eventsCoinMinted.length > 0) {
    for (let index = 0; index < eventsCoinMinted.length; index++) {
      data.push(
        {
          blockNumber: eventsCoinMinted[index].blockNumber,
          backedTokenID: eventsCoinMinted[index].args[1],
          user: eventsCoinMinted[index].args[0],
          amount: eventsCoinMinted[index].args[2]
        }
      );
    }
  }
  return data;
}

/**
 * @note Returns an array of validated addresses that continue to have an open debt position in a specific 'HouseOfCoin' deployed contract.
 * @param arrayOfHistoricMinters Array of addresses obtained from 'getHistoricCoinMinters()'.
 * @param coinhouse etherjs contract object representing 'HouseOfCoin' deployed contract.
 * @param reserveAsset address of the reserve asset. 
 * @param assetsaccountant ethersjs contract object representing 'AssetsAccountant' deployed contract.
 */
const validateMinters = async function (arrayOfHistoricMinters, coinhouse, reserveAsset, assetsaccountant) {
  const bid = await coinhouse.getBackedTokenID()
  let validated = [];
  for (let index = 0; index < arrayOfHistoricMinters.length; index++) {


  }
}

async function main() {
  const accounts = await ethers.getSigners();
  const liquidator = accounts[0];

  const contracts = await getDeployedContracts();

  const coinhouse = contracts.coinhouse;
  const reservehouse = contracts.reservehouse;

  const rid = await reservehouse.reserveTokenID();
  const bid = await reservehouse.backedTokenID();

  const historicMinters = await getHistoricCoinMinters(coinhouse, bid);
  console.log(historicMinters);

  const wrappedcoinhouse = WrapperBuilder.wrapLite(coinhouse.connect(liquidator)).usingPriceFeed("redstone-stocks");

  // [
  //   costAmount,
  //   collateralPenalty
  // ] = await wrappedcoinhouse.computeCostOfLiquidation(dumbUser.address, mockweth.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});