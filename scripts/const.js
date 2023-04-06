const LADAO_MULTISIGS = {
  mainnet: "0xaaE1A89e827Ac63d92f3633Be2e0dDd6edafd34a",
  polygon: "0x707C5E55277A0C2f598f191b269c9e773516052A",
  arbitrum: "0x80Ea762B09883Bddf09d3F7E4142ca6E1e697490",
  optimism: "0xC6A1425bC0D0c3FcE5055da85032d36893f91D03",
  gnosis: "0x2CBe215Eae3e926f11291560be0e4cda9556DCBb"
}

const CONTRACT_DEPLOYER_FACTORY = "0xF8faF9319e5CDDfda173B0a6461f19765AAAbf03";

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
    },
    wbtc:{
      address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"
    },
    storageSlots: {
      balanceOf: 0,
    },
  },
  gnosis: {
    weth: {
      address: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
      storageSlots: {
        balanceOf: 0,
      },
    },
  },
  goerli: {
    weth: {
      address: "0xCCB14936C2E000ED8393A571D15A2672537838Ad",
      storageSlots: {
        balanceOf: 3,
      },
    },
    wbtc:{
      address: "0x45AC379F019E48ca5dAC02E54F406F99F5088099"
    },
    storageSlots: {
      balanceOf: 0,
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
    btcusd: "0xA338e0492B2F944E9F8C0653D3AD1484f2657a37",
    maticusd: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
    usdcusd: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
    mxnusd: "0x171b16562EA3476F5C61d1b8dad031DbA0768545"
  },
  goerli: {
    ethusd: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    btcusd: "0xA39434A63A52E749F02807ae27335515BA4b07F7",
    mxnusd: "0x480f3c11381824E9EEbEEdbB6398dB86e38bAEA0"
  }
}

module.exports = {
  LADAO_MULTISIGS,
  ASSETS,
  UMA_CONTRACTS,
  CHAINLINK_CONTRACTS,
  CONTRACT_DEPLOYER_FACTORY
}