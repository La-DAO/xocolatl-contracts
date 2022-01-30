// Rinkeby deployment 1-30-2022
const accountant = await ethers.getContractAt('AssetsAccountant', '0xf487Ff2A5430eFBdC4B15e2735d9D83e3508F317');
const coinhouse = await ethers.getContractAt('HouseOfCoin', '0xF3A1C091f110F7b931c02d3603ec8bC771182466');
const reservehouse = await ethers.getContractAt('HouseOfReserve', '0x62c4014a76e21C046fc5196D81E8cD7e04C5f122');
const xoc = await ethers.getContractAt('Xocolatl', '0x2872332fB3619F5fDbAeb04F4e3Bd8e42AF8fD04');
const rinkebyweth = await ethers.getContractAt('MockWETH', '0xDf032Bc4B9dC2782Bb09352007D4C57B75160B15');
