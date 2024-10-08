const {ethers} = require("hardhat");
const {NETWORK} = require("../utils");
const {LADAO_MULTISIGS} = require("../const");

const rolesHandOverAssetsAccountant = async (contract) => {
    const admin = await contract.DEFAULT_ADMIN_ROLE();
    const minter = await contract.MINTER_ROLE();
    const burner = await contract.BURNER_ROLE();
    const liquidator = await contract.LIQUIDATOR_ROLE();

    console.log(`LADAO_MULTISIGS[${NETWORK}]`, LADAO_MULTISIGS[NETWORK]);

    const rtx1 = await contract.grantRole(admin, LADAO_MULTISIGS[NETWORK]);
    await rtx1.wait(1);
    console.log("...multisig granted DEFAULT_ADMIN_ROLE in AssetsAccountant");

    const signer = await ethers.provider.getSigner();

    const rtx2 = await contract.renounceRole(minter, signer.address);
    await rtx2.wait(1);
    console.log("...renounced to MINTER_ROLE in AssetsAccountant");

    const rtx3 = await contract.renounceRole(burner, signer.address);
    await rtx3.wait(1);
    console.log("...renounced to BURNER_ROLE in AssetsAccountant");

    const rtx4 = await contract.renounceRole(liquidator, signer.address);
    await rtx4.wait(1);
    console.log("...renounced to LIQUIDATOR_ROLE in AssetsAccountant");

    const rtx5 = await contract.renounceRole(admin, signer.address);
    await rtx5.wait(1);
    console.log("...renounced to DEFAULT_ADMIN_ROLE in AssetsAccountant");
};

const handOverDefaultAdmin = async (contract) => {
    const admin = await contract.DEFAULT_ADMIN_ROLE();

    const rtx1 = await contract.grantRole(admin, LADAO_MULTISIGS[NETWORK]);
    await rtx1.wait(1);
    console.log(`...multisig granted DEFAULT_ADMIN_ROLE in contract:${await contract.getAddress()}`);

    const signer = await ethers.provider.getSigner();

    const rtx2 = await contract.renounceRole(admin, signer.address);
    await rtx2.wait(1);
    console.log(`...renounced to DEFAULT_ADMIN_ROLE in contract:${await contract.getAddress()}`);
};

const handOverOwnership = async (contract) => {
    const rtx1 = await contract.transferOwnership(LADAO_MULTISIGS[NETWORK]);
    await rtx1.wait(1);
    console.log(`...multisig granted ownership in contract:${await contract.getAddress()}`);
};

module.exports = {
    rolesHandOverAssetsAccountant,
    handOverDefaultAdmin,
    handOverOwnership,
};
