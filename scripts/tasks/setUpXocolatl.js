const systemPermissionGranting = async (xocContract, houseOfCoinAddr, liquidatorAddr) => {
    const minter = await xocContract.MINTER_ROLE();
    const burner = await xocContract.BURNER_ROLE();

    const stx1 = await xocContract.grantRole(minter, houseOfCoinAddr);
    await stx1.wait();
    console.log("...minter XOC role assigned House of Coin");

    const stx2 = await xocContract.grantRole(burner, houseOfCoinAddr);
    await stx2.wait();
    console.log("...burner XOC role assigned House of Coin");

    const stx3 = await xocContract.grantRole(burner, liquidatorAddr);
    await stx3.wait();
    console.log("...burner XOC role assigned AccountLiquidator");
};

module.exports = {
    systemPermissionGranting,
};
