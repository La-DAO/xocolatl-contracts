const PIPILADAO_MULTISIGS = {
  mainnet: "0xaaE1A89e827Ac63d92f3633Be2e0dDd6edafd34a",
  polygon: "0x707C5E55277A0C2f598f191b269c9e773516052A",
  arbitrum: "0x80Ea762B09883Bddf09d3F7E4142ca6E1e697490",
  optimism: "0xC6A1425bC0D0c3FcE5055da85032d36893f91D03",
  gnosis: "0x2CBe215Eae3e926f11291560be0e4cda9556DCBb"
}

const ASSETS = {
  mainnet: {
    weth: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      storageSlots: {
        balanceOf: 3,
      },
    },
  },
  arbitrum: {
    weth: {
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      storageSlots: {
        balanceOf: 3,
      },
    },
  },
  optimism: {
    weth: {
      address: "0x4200000000000000000000000000000000000006",
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
  gnosis: {
    weth: {
      address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
      storageSlots: {
        balanceOf: 0,
      },
    },
  },
  rinkeby: {
    weth: {
      address: "0xDf032Bc4B9dC2782Bb09352007D4C57B75160B15",
      storageSlots: {
        balanceOf: 3,
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
      address: "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64"
    },
  },
  gnosis: {
    finder: {
      address: "0xeF684C38F94F48775959ECf2012D7E864ffb9dd4"
    }
  }
}

const CHAINLINK_CONTRACTS = {
  polygon: {
    ethusd: "0xf9680d99d6c9589e2a93a78a04a279e509205945",
    mxnusd: "0x171b16562EA3476F5C61d1b8dad031DbA0768545"
  },
  gnosis: {
    ethusd: "0xa767f745331D267c7751297D982b050c93985627",
    mxnusd: "0xe9cea51a7b1b9B32E057ff62762a2066dA933cD2"
  }
}

module.exports = {
  PIPILADAO_MULTISIGS,
  ASSETS,
  UMA_CONTRACTS,
  CHAINLINK_CONTRACTS
}