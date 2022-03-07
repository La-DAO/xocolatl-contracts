const { ethers } = require("hardhat");
const { ContractFunctionVisibility } = require("hardhat/internal/hardhat-network/stack-traces/model");

/**
 * @note Get etherjs contract instances of deployed contracts
 * @param chainID EVM chain Id, defaults to rinkeby.
 * 
 */
const getDeployedContracts = async (chainID = 4) => {

  let accountant;
  let coinhouse;
  let reservehouse;
  let xoc;
  let weth;
  
  // Rinkeby deployment 1-30-2022
  if (chainID == 4) {
    console.log("...Getting contracts from Chain Id", chainID)
    accountant = await ethers.getContractAt('AssetsAccountant', '0xf487Ff2A5430eFBdC4B15e2735d9D83e3508F317');
    coinhouse = await ethers.getContractAt('HouseOfCoin', '0xF3A1C091f110F7b931c02d3603ec8bC771182466');
    reservehouse = await ethers.getContractAt('HouseOfReserve', '0x62c4014a76e21C046fc5196D81E8cD7e04C5f122');
    xoc = await ethers.getContractAt('Xocolatl', '0x2872332fB3619F5fDbAeb04F4e3Bd8e42AF8fD04');
    weth = await ethers.getContractAt('MockWETH', '0xDf032Bc4B9dC2782Bb09352007D4C57B75160B15');
  }

  return {
    accountant,
    coinhouse,
    reservehouse,
    xoc,
    weth
  }
}

module.exports = {
  getDeployedContracts
};