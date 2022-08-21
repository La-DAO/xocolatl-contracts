const PIPILADAO_MULTISIGS = {
  mainnet: "0xaaE1A89e827Ac63d92f3633Be2e0dDd6edafd34a",
  polygon: "0x707C5E55277A0C2f598f191b269c9e773516052A",
  arbitrum: "0x80Ea762B09883Bddf09d3F7E4142ca6E1e697490",
  optimism: "0xC6A1425bC0D0c3FcE5055da85032d36893f91D03",
}

const ASSETS = {
  rinkeby: {
    weth: {
      address: "0xDf032Bc4B9dC2782Bb09352007D4C57B75160B15",
      storageSlots: {
        balanceOf: 3,
      },
    },
  },
  polygon: {
    weth: {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      storageSlots: {
        balanceOf: 0,
      },
    },
    wmatic: {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      storageSlots: {
        balanceOf: 3,
      },
    }
  },
}

const UMA_CONTRACTS = {
  priceIdentifiers: {
    // ethers.utils.formatBytes32String("MXNUSD")
    mxnusd: "0x4d584e5553440000000000000000000000000000000000000000000000000000",
  },
  polygon: {
    finder: {
      address: "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64"
    },
  },
}

const CHAINLINK_CONTRACTS = {
  polygon: {
    ethusd: "0xf9680d99d6c9589e2a93a78a04a279e509205945",
    mxnusd: "0x171b16562EA3476F5C61d1b8dad031DbA0768545"
  }
}

module.exports = {
  PIPILADAO_MULTISIGS,
  ASSETS,
  UMA_CONTRACTS,
  CHAINLINK_CONTRACTS
}