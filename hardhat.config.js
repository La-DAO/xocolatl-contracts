require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require('hardhat-contract-sizer');
require("@nomicfoundation/hardhat-verify");
require('@openzeppelin/hardhat-upgrades');

const fs = require("fs");

// Set default network
const dnetwork = !process.env.DEFAULT_NETWORK ? "localhost" : process.env.DEFAULT_NETWORK;

// Identify INFURA_ID type in .env file
if (!process.env.INFURA_ID) {
    throw "Please set INFURA_ID in .env";
}

/** Task to generate a wallet with a randomly created mnemonic */
task("generate", "Create a wallet for builder deploys", async (_, { ethers }) => {
    const newWallet = ethers.Wallet.createRandom();
    const address = newWallet.getAddress();
    const mnemonic = newWallet.mnemonic.phrase
    console.log("🔐 Account Generated as " + address + " and set as mnemonic in packages/hardhat");
    fs.writeFileSync("./" + address + ".txt", `${address}\n${mnemonic.toString()}\n${newWallet.privateKey}`);
    fs.writeFileSync("./mnemonic.txt", mnemonic.toString());
});

/** Function to read mnemonic from txt file */
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

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.17",
    networks: {
        localhost: {
            url: "http://localhost:8545/",
            timeout: 2000000,
        },
        localhostWithPKey: {
            url: "http://localhost:8545/",
            timeout: 2000000,
            accounts: process.env.PRIVATE_KEY ?
                [process.env.PRIVATE_KEY] :
                { mnemonic: mnemonic() },
        },
        mainnet: {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`,
            accounts: process.env.PRIVATE_KEY ?
                [process.env.PRIVATE_KEY] :
                { mnemonic: mnemonic() },
        },
        polygon: {
            url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_ID}`,
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
            url: `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_ID}`,
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
    etherscan: {
        // Your API key for Etherscan
        apiKey: process.env.ETHERSCAN_API_KEY,
    }
};