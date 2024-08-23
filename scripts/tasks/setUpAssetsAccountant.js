const setUpAssetsAccountant = async (contract, houseOfCoinAddr, liquidatorAddr, reserveFactoryAddr) => {
    const stx1 = await contract.registerHouse(houseOfCoinAddr);
    await stx1.wait();
    console.log("...House of Coin registered in AssetsAccountant");

    const stx2 = await contract.allowLiquidator(liquidatorAddr, true);
    await stx2.wait();
    console.log("...liquidator set in AssetsAccountant");

    const stx3 = await contract.allowReserveFactory(reserveFactoryAddr, true);
    await stx3.wait();
    console.log("...House of Reserve Factory allowed in AssetsAccountant");
};

module.exports = {
    setUpAssetsAccountant,
};
