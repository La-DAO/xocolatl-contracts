const setupOracleFactory = async (contract, computedPriceImpl, inversePriceImp, priceFeedPythWrapperImpl) => {
    const stx1 = await contract.setComputedPriceFeedImpl(computedPriceImpl);
    await stx1.wait();
    console.log("...computedPriceImpl set in OracleFactory");

    const stx2 = await contract.setInversePriceFeedImpl(inversePriceImp);
    await stx2.wait();
    console.log("...inversePriceImp set in OracleFactory");

    const stx3 = await contract.setPriceFeedPythWrapperImpl(priceFeedPythWrapperImpl);
    await stx3.wait();
    console.log("...priceFeedPythWrapperImpl set in OracleFactory");
};

module.exports = {
    setupOracleFactory,
};
