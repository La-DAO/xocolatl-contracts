const { ethers } = require("hardhat");
const { WrapperBuilder } = require("redstone-evm-connector");

const fs = require("fs");

const { getDeployedContracts } = require("./utils.js");
const { removeDuplicates } = require("./helpers.js");

/**
 * @note Returns an array of addresses that have minted coin in a specific 'HouseOfCoin' deployed contract.
 * @param coinhouse etherjs contract object representing 'HouseOfCoin' deployed contract.
 * @param startBlock Integer to start search of coin minters.
 */
const getHistoricCoinMinters = async function (coinhouse, startBlock=9913500) {
  console.log("...Getting historic coin minters");
  const path = "./scripts/output/coinminted-events.json";
  if (fs.existsSync(path)) {
    let historicData = JSON.parse(fs.readFileSync(path).toString());
    const dataLastBlock = historicData[historicData.length-1].blockNumber;
    const filterCoinMinted = await coinhouse.filters.CoinMinted();
    const eventsCoinMinted = await coinhouse.queryFilter(filterCoinMinted, dataLastBlock+1);
    console.log();
    if (eventsCoinMinted.length > 0) {
      historicData.append(eventsCoinMinted);
      fs.writeFile(path, JSON.stringify(historicData), (err) => {
        if (err)
          console.log(err);
        else {
          console.log("...added CoinMinted events successfully");
        }
      });
    }
    return removeDuplicates(historicData.map( e => e.args[0]));
  } else {
    const filterCoinMinted = await coinhouse.filters.CoinMinted();
    const eventsCoinMinted = await coinhouse.queryFilter(filterCoinMinted, startBlock);
    let organizedData = [];
    for (let index = 0; index < eventsCoinMinted.length; index++) {
      organizedData.push(
        {
          blockNumber: eventsCoinMinted[index].blockNumber,
          

        }

      );
      
    }
    fs.writeFile(path, JSON.stringify(eventsCoinMinted), (err) => {
      if (err)
        console.log(err);
      else {
        console.log("...CoinMinted events saved successfully");
      }
    });
    return removeDuplicates(eventsCoinMinted.map( e => e.args[0]));
  }
}

/**
 * @note Returns an array of validated addresses that continue to have an open debt position in a specific 'HouseOfCoin' deployed contract.
 * @param arrayOfHistoricMinters Array of addresses obtained from 'getHistoricCoinMinters()'.
 * @param coinhouse etherjs contract object representing 'HouseOfCoin' deployed contract.
 * @param reserveAsset address of the reserve asset. 
 * @param assetsaccountant ethersjs contract object representing 'AssetsAccountant' deployed contract.
 */
const validateMinters = async function(arrayOfHistoricMinters, coinhouse, reserveAsset, assetsaccountant) {
  const bid = await coinhouse.getBackedTokenID()
  let validated = [];
  for (let index = 0; index < arrayOfHistoricMinters.length; index++) {
    
    
  }
}

async function main() {
  const accounts = await ethers.getSigners();
  const liquidator = accounts[0];

  const contracts  = await getDeployedContracts();

  const coinhouse = contracts.coinhouse;

  const historicMinters = await getHistoricCoinMinters(coinhouse);
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