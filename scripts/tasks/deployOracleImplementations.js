const {deploy, redeployIf} = require("../utils");

const deployOracleImplementations = async (implNames) => {
    let computedPriceFeedImpl;
    let invPriceFeedImpl;
    let priceFeedPythWrapperImpl;
    let detailName;
    for (n in implNames) {
        switch (n) {
            case n == "ComputedPriceFeed" || n == "ComputedPriceFeedWithSequencer":
                detailName = n + "Impl";
                computedPriceFeedImpl = await redeployIf(detailName, contractName, deploy, []);
                break;
            case n == "InversePriceFeed":
                detailName = n + "Impl";
                invPriceFeedImpl = await redeployIf(detailName, contractName, deploy, []);
                break;
            case n == "PriceFeedPythWrapper":
                detailName = n + "Impl";
                priceFeedPythWrapperImpl = await redeployIf(detailName, contractName, deploy, []);
            default:
                throw "Unkown oracle implementation name";
        }
    }

    return {
        computedPriceFeedImpl,
        invPriceFeedImpl,
        priceFeedPythWrapperImpl,
    };
};

module.exports = {
    deployOracleImplementations,
};
