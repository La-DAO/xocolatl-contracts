let accountant = await AssetsAccountant.deploy();
undefined
> accountant.address
'0xd9c5D3B12719fdA2d8c2CCA48FD3D92123c5D1CC'
> let coinhouse = await HouseOfCoin.deploy();
undefined
> coinhouse.address
'0x3c3714b6Ac979241a71717c0A89e7226988141A5'
> let reservehouse = await HouseOfReserve.deploy();
undefined
> reservehouse.address
'0x8325CE385A2Fbc320f55F6C7bbe267532bF1F89B'
> let xoc = await Xocolatl.deploy();
undefined
> xoc.address
'0x2FeE11961a58b36E766a74CC9c76A847E002FEAa'
> let mockweth = await MockWETH.deploy();
undefined
> mockweth.address
'0x053DA244AaaF94A071d9e3E73141e5249FE9251D'

const accountant = await ethers.getContractAt('AssetsAccountant', '0xd9c5D3B12719fdA2d8c2CCA48FD3D92123c5D1CC');
const coinhouse = await ethers.getContractAt('HouseOfCoin', '0x3c3714b6Ac979241a71717c0A89e7226988141A5');
const reservehouse = await ethers.getContractAt('HouseOfReserve', '0x8325CE385A2Fbc320f55F6C7bbe267532bF1F89B');
const xoc = await ethers.getContractAt('Xocolatl', '0x2FeE11961a58b36E766a74CC9c76A847E002FEAa');
const mockweth = await ethers.getContractAt('MockWETH', '0x053DA244AaaF94A071d9e3E73141e5249FE9251D');