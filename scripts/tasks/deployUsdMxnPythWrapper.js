const {ethers} = require("hardhat");
const {PYTH_MXN_USD_FEED_ID} = require("../const");
const {getDeployments} = require("../utils");

const deployUsdMxnPythWrapper = async (oracleFactory, pythAddress) => {
    const detailName = "PriceFeedPythWrapperUsdMxn";
    const currentDeployment = getDeployments(detailName);
    const contractArtifacts = await artifacts.readArtifact("PriceFeedPythWrapper");
    const addr = currentDeployment.address ?? "0x0000000000000000000000000000000000000000";
    const checkExistance = await ethers.provider.getCode(addr);
    if (
        checkExistance !== "0x" &&
        currentDeployment.bytecode === contractArtifacts.bytecode &&
        JSON.stringify(currentDeployment.abi) === JSON.stringify(contractArtifacts.abi)
    ) {
        console.log(detailName + ": Skipping...");
        return ethers.getContractAt("PriceFeedPythWrapper", currentDeployment.address);
    }

    console.log(detailName + ": Deploying...");
    const allowedTimeout = 234000; // Due to market closure on weekends
    const pythWrapperAddr = await oracleFactory.createPriceFeedPythWrapper.staticCall(
        "pyth usdmxn",
        8,
        pythAddress,
        PYTH_MXN_USD_FEED_ID,
        allowedTimeout,
    );

    const dtx1 = await oracleFactory.createPriceFeedPythWrapper(
        "pyth usdmxn",
        8,
        pythAddress,
        PYTH_MXN_USD_FEED_ID,
        allowedTimeout,
    );
    await dtx1.wait();

    const pythWrapperUsdMxn = await ethers.getContractAt("PriceFeedPythWrapper", pythWrapperAddr);

    console.log(detailName + ": Deployed at", await pythWrapperUsdMxn.getAddress());
    return pythWrapperUsdMxn;
};

module.exports = {
    deployUsdMxnPythWrapper,
};
