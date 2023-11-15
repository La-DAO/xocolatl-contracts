require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('dotenv').config()
const fs = require("fs");

const DEBUG = false;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  console.log('Hardhat Node Accounts');
  for (const account of accounts) {
    console.log(account.address);
  }
});

// Task to generate a wallet with a randomly created mnemonic
task("generate", "Create a wallet for builder deploys", async (_, { ethers }) => {
  const newWallet = ethers.Wallet.createRandom();
  const address = newWallet.address;
  const mnemonic = newWallet.mnemonic.phrase
  console.log("🔐 Account Generated as " + address + " and set as mnemonic in packages/hardhat");
  fs.writeFileSync("./" + address + ".txt", `${address}\n${mnemonic.toString()}\n${newWallet.privateKey}`);
  fs.writeFileSync("./mnemonic.txt", mnemonic.toString());
});

// Function to read mnemonic from file
function mnemonic() {
  try {
    return fs.readFileSync("./mnemonic.txt").toString().trim();
  } catch (e) {
    if (dnetwork !== "localhost") {
      console.log(
        "☢️ WARNING: No mnemonic file created for a deploy account. Try `yarn run generate` and then `yarn run account`."
      );
    }
  }
  return "";
}

const dnetwork = !process.env.DEFAULT_NETWORK ? "localhost" : process.env.DEFAULT_NETWORK;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: dnetwork,
  solidity: "0.8.17",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
      timeout: 2000000,
    },
    localhostWithPKey: {
      url: "http://127.0.0.1:8545/",
      timeout: 2000000,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
      /*
        no mnemonic here? it will just use account 0 of the hardhat node to deploy
        (add mnemonic() here to set the deployer locally)
      */
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_ID}`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    polygonzkevm: {
      url: `https://zkevm-rpc.com`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    arbitrum: {
      url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    optimism: {
      url: `https://opt-mainnet.g.alchemy.com/v2/wnUjek6Gv5MSSiGwLD-UjE9oQ_3qIui2`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    gnosis: {
      url: `https://rpc.ankr.com/gnosis`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    binance: {
      url: `https://bsc-dataseed1.binance.org`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    linea: {
      url: `https://linea-mainnet.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    base: {
      url: `https://base.meowrpc.com`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: process.env.PRIVATE_KEY ?
        [process.env.PRIVATE_KEY] :
        { mnemonic: mnemonic() },
    },
  },
};