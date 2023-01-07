const { ethers } = require("hardhat");
const { network } = require("../utils");
const { LADAO_MULTISIGS } = require("../const");

const rolesHandOverAssetsAccountant = async (contract) => {
  const admin = await contract.DEFAULT_ADMIN_ROLE();
  const minter = await contract.MINTER_ROLE();
  const burner = await contract.BURNER_ROLE();
  const liquidator = await contract.LIQUIDATOR_ROLE();

  const rtx1 = await contract.grantRole(admin, LADAO_MULTISIGS[network])
  await rtx1.wait();
  console.log("...multisig granted DEFAULT_ADMIN_ROLE in AssetsAccountant");

  const signer = await ethers.getSigner();

  const rtx2 = await contract.renounceRole(minter, signer.address);
  await rtx2.wait();
  console.log("...renounced to MINTER_ROLE in AssetsAccountant");

  const rtx3 = await contract.renounceRole(burner, signer.address);
  await rtx3.wait();
  console.log("...renounced to BURNER_ROLE in AssetsAccountant");

  const rtx4 = await contract.renounceRole(liquidator, signer.address);
  await rtx4.wait();
  console.log("...renounced to LIQUIDATOR_ROLE in AssetsAccountant");

  const rtx5 = await contract.renounceRole(admin, signer.address);
  await rtx5.wait();
  console.log("...renounced to DEFAULT_ADMIN_ROLE in AssetsAccountant");
}

const handOverDefaultAdmin = async (contract) => {
  const admin = await contract.DEFAULT_ADMIN_ROLE();

  const rtx1 = await contract.grantRole(admin, LADAO_MULTISIGS[network])
  await rtx1.wait();
  console.log(`...multisig granted DEFAULT_ADMIN_ROLE in contract:${contract.address}`);

  const signer = await ethers.getSigner();

  const rtx2 = await contract.renounceRole(admin, signer.address);
  await rtx2.wait();
  console.log(`...renounced to DEFAULT_ADMIN_ROLE in contract:${contract.address}`);

}

module.exports = {
  rolesHandOverAssetsAccountant,
  handOverDefaultAdmin
};