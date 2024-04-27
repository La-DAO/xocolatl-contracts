const {deploy, redeployIf} = require("../utils");

const deployOracleImplementations = async (implNames) => {
    let computedPriceFeedImpl;
    let invPriceFeedImpl;
    let priceFeedPythWrapperImpl;
    let detailName;
    for (const n of implNames) {
        switch (n) {
            case "ComputedPriceFeed":
                detailName = n + "Impl";
                computedPriceFeedImpl = await redeployIf(detailName, n, deploy, []);
                break;
            case "ComputedPriceFeedWithSequencer":
                detailName = n + "Impl";
                computedPriceFeedImpl = await redeployIf(detailName, n, deploy, []);
                break;
            case "InversePriceFeed":
                detailName = n + "Impl";
                invPriceFeedImpl = await redeployIf(detailName, n, deploy, []);
                break;
            case "PriceFeedPythWrapper":
                detailName = n + "Impl";
                priceFeedPythWrapperImpl = await redeployIf(detailName, n, deploy, []);
                break;
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
