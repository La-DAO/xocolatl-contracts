const hre = require("hardhat");
const fs = require("fs");

const { ethers, artifacts } = hre;
const { provider } = ethers;

const network = process.env.NETWORK;

// Default
let deploymentsPath = "core-version-last.deploy";

/**
 * @note Set the deployment path for the contract artifacts to be saved.
 * @param {integer} version of the deployment.
 */
const setDeploymentsPath = async (version) => {
  const netw = await provider.getNetwork();
  deploymentsPath = `${hre.config.paths.artifacts}/${netw.chainId}-version-${version}.deploy`;
};

/**
 * @note Get the contract abi for the contract name.
 * @param {string} detailName to get artifacts, as defined in .deploy file.
 */
const getDeployments = (detailName) => {
  let deployData;
  if (fs.existsSync(deploymentsPath)) {
    deployData = JSON.parse(fs.readFileSync(deploymentsPath).toString());
  } else {
    deployData = {};
  }
  return deployData[detailName] || {};
};

/**
 * @note Update the contract abi with new contract data.
 * @param {string} detailName to get artifacts, as defined in .deploy file.
 * @param {string} contractName name of the compiled contract as defined in the solidity file.
 * @param {string} address of the contract.
 */
const updateDeployments = async (detailName, contractName, address) => {
  let deployData;
  if (fs.existsSync(deploymentsPath)) {
    deployData = JSON.parse(fs.readFileSync(deploymentsPath).toString());
  } else {
    deployData = {};
  }
  const contractArtifacts = await artifacts.readArtifact(contractName);
  deployData[detailName] = {
    address,
    abi: contractArtifacts.abi,
    bytecode: contractArtifacts.bytecode,
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployData, null, 2));
};

/**
 * @note Update the contract abi with new contract data.
 * @param {string} detailName to get in artifacts, as defined in .deploy file.
 */
const getContractAddress = (detailName) => {
  return getDeployments(detailName).address;
};

/**
 * Deploy a contract.
 * @param {string} detailName unique to distinguish and defined in .deploy file.  
 * @param {string} contractName name of the compiled contract as defined in the solidity file. 
 * @param {Array} args arguments required in contract constructor or initializer.
 * @param {Object} overrides arguments required in some functions.
 * @param {Object} options arguments required in some functions.
 * @returns {Promise} resolves to an ethers.js contract object.
 */
const deploy = async (detailName, contractName, args = [], overrides = {}, options = {}) => {
  const contractArgs = args || [];
  const contractFactory = await ethers.getContractFactory(contractName, options);
  const deployed = await contractFactory.deploy(...contractArgs, overrides);
  await deployed.deployed();
  const encoded = abiEncodeArgs(deployed, contractArgs);
  fs.writeFileSync(`artifacts/${detailName}.address`, deployed.address);
  await updateDeployments(detailName, contractName, deployed.address);
  if (!encoded || encoded.length <= 2) return deployed;
  fs.writeFileSync(`artifacts/${detailName}.args`, encoded.slice(2));
  return deployed;
};

/**
 * Redeploy a contract if it has not been deployed, otherwise contract data from artifacts.
 * @param {string} detailName unique to distinguish and defined in .deploy file. 
 * @param {string} contractName name of the compiled contract as defined in the solidity file.
 * @param {Function} deployContract function call type {deploy, deployProxy}.
 * @param {Array} args arguments required in contract constructor or initializer.
 * @param {Object} overrides arguments required in some functions.
 * @param {Object} options arguments required in some functions.
 * @returns {Promise} resolves to an ethers.js contract object.
 */
 const redeployIf = async (detailName, contractName, deployContract, args = [], overrides={}, options = {}) => {
  const currentDeployment = getDeployments(detailName);
  const contractArtifacts = await artifacts.readArtifact(contractName);
  const addr = currentDeployment.address ?? "0x0000000000000000000000000000000000000000";
  const checkExistance = await ethers.provider.getCode(addr);
  if (
    checkExistance !== "0x" &&
    currentDeployment.bytecode === contractArtifacts.bytecode &&
    JSON.stringify(currentDeployment.abi) === JSON.stringify(contractArtifacts.abi)
  ) {
    console.log(detailName + ": Skipping...");
    return currentDeployment;
  }
  console.log(detailName + ": Deploying...");
  const deployed = await deployContract(detailName, contractName, args, overrides, options);
  console.log(detailName + ": Deployed at", deployed.address);
  return deployed;
};

module.exports = {
  setDeploymentsPath,
  getDeployments,
  updateDeployments,
  getContractAddress,
  deploy,
  redeployIf
};