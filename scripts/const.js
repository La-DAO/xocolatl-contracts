const ASSETS = {
  polygon: {
    weth: {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      storageSlots: {
        balanceOf: 0,
      },
    },
  },
}

const UMA_CONTRACTS = {
  priceIdentifiers: {
    // ethers.utils.formatBytes32String("MXNUSD")
    mxnusd: "0x4d584e5553440000000000000000000000000000000000000000000000000000",
  },
  polygon: {
    finder: {
      "address": "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64"
    },
  },
}

module.exports = {
  ASSETS,
  UMA_CONTRACTS
}