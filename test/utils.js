const { ethers } = require("hardhat");
const { ASSETS } = require("../scripts/const");

const syncTime = async function () {
  const now = Math.ceil(new Date().getTime() / 1000);
  try {
    await ethers.provider.send("evm_setNextBlockTimestamp", [now]);
  } catch (error) {
    //Skipping time sync - block is ahead of current time
  }
};

const timeTravel = async (seconds) => {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine");
};

const toBytes32 = (bn) => {
  // Convert bn to even length hex string
  const hex = bn.toString(16);
  const pad = hex.length % 2 == 0 ? "0x" : "0x0";
  const paddedHex = pad.concat(hex);
  return ethers.hexlify(ethers.zeroPadValue(paddedHex, 32));
};

const setStorageAt = async (address, index, value) => {
  await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
  await ethers.provider.send("evm_mine", []); // Just mines to the next block
};

const getStorageSlot = (address, chain, method) => {
  const assets = Object.values(ASSETS[chain]);
  const asset = assets.find((e) => e.address == address);
  const slot = asset.storageSlots[method];
  if (!Number.isInteger(slot)) {
    throw "Set storage slot in 'ASSETS' object; Refer to https://github.com/kendricktan/slot20 on how get slot number.";
  }
  return asset.storageSlots[method];
};

/**
 * Sets ERC20 balance for testing purposes
 * @param {string} userAddr
 * @param {string} erc20address
 * @param {string} chain name
 * @param {bigint} BNbalance
 */
const setERC20UserBalance = async (
  userAddr,
  erc20address,
  chain,
  BNbalance
) => {
  // Get storage slot index
  const slot = getStorageSlot(erc20address, chain, "balanceOf");
  const solidityIndex = ethers.solidityPackedKeccak256(
    ["uint256", "uint256"],
    [userAddr, slot] // key, slot
  );
  // Manipulate local balance (needs to be bytes32 string)
  await setStorageAt(
    erc20address,
    solidityIndex.toString(),
    toBytes32(BNbalance).toString()
  );
};

const evmSnapshot = async () => ethers.provider.send("evm_snapshot", []);

const evmRevert = async (id) => ethers.provider.send("evm_revert", [id]);

module.exports = {
  evmSnapshot,
  evmRevert,
  syncTime,
  timeTravel,
  setERC20UserBalance,
};
