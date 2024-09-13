const {deploy, redeployIf} = require("../utils");
const {NETWORK} = require("../utils");
const {ORACLE_CONTRACTS} = require("../const");

const deployOracleFactoryL2 = async () => {
    const contractName = "OracleFactoryL2";
    const detailName = contractName;
    const deployed = await redeployIf(detailName, contractName, deploy, []);
    const tx = await deployed.setSequencerFeed(ORACLE_CONTRACTS[NETWORK].sequencer);
    await tx.wait();
    return deployed;
};

module.exports = {
    deployOracleFactoryL2,
};
