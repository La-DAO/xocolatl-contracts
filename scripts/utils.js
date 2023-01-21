const hre = require("hardhat");
const fs = require("fs");

const { ethers, artifacts, upgrades } = hre;
const { provider, utils } = ethers;

const network = process.env.NETWORK;

const DEBUG = false;

// Default
let deploymentsPath = "core-version-last.deploy";
let publishPath = "core-version-last.deploy";

/**
 * @note Set the deployment path for the contract artifacts to be saved.
 * @param {integer} version of the deployment.
 */
const setDeploymentsPath = async (version) => {
  const netw = await provider.getNetwork();
  deploymentsPath = `${hre.config.paths.artifacts}/${netw.chainId}-version-${version}.deploy`;
  if(DEBUG) {
    console.log("deploymentsPath", deploymentsPath);
  }
};

/**
 * @note Set the publish path for the contract artifacts to be saved.
 */
 const setPublishPath = async (version) => {
  const netw = await provider.getNetwork();
  publishPath = `${hre.config.paths.root}/deployments/${network}/${netw.chainId}-version-${version}.deploy`;
  if(DEBUG) {
    console.log("publishPath", publishPath);
  }
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
 * @note Get the contract address from recorded .deploy file.
 * @param {string} detailName to get in artifacts, as defined in .deploy file.
 * @returns {string} address of the contract. 
 */
const getContractAddress = (detailName) => {
  return getDeployments(detailName).address;
};

/**
 * @note Get ethersJS contract from recorded .deploy file.
 * @param {string} detailName to get in artifacts, as defined in .deploy file.
 * @param {string} contractName of the compiled contract as defined in the solidity file.
 * @returns {Promise} resolves to Ethersjs contract requested. 
 */
 const getContract = async (detailName, contractName) => {
  const contractData = getDeployments(detailName);
  const contract = await ethers.getContractAt(contractName, contractData.address);
  return contract;
};

/**
 * @dev encodes contract arguments, useful to manually verify the contracts on Etherscan
 * @param {Object} deployed ethersjs contract returned after deployment.
 * @param {Array} contractArgs passed in contract constructor (if any).
 * @returns {String} of hex bytes if applicable.
 */
const abiEncodeArgs = (deployed, contractArgs) => {
  // not writing abi encoded args if this does not pass
  if (!contractArgs || !deployed ) {
    return "";
  }
  const encoded = utils.defaultAbiCoder.encode(deployed.interface.deploy.inputs, contractArgs);
  return encoded;
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
  const encoded = abiEncodeArgs(deployed, contractArgs);
  fs.writeFileSync(`artifacts/${detailName}.address`, deployed.address);
  await updateDeployments(detailName, contractName, deployed.address);
  if (!encoded || encoded.length <= 2) return deployed;
  fs.writeFileSync(`artifacts/${detailName}.args`, encoded.slice(2));
  return deployed;
};

/**
 * Deploy a contract with upgradeable proxy pattern.
 * @param {string} detailName unique to distinguish and defined in .deploy file.  
 * @param {string} contractName name of the compiled contract as defined in the solidity file. 
 * @param {Array} args arguments required in contract constructor or initializer.
 * @param {Object} overrides arguments required in some functions.
 * @param {Object} options arguments required in some functions.
 * @returns {Promise} resolves to an ethers.js contract object.
 */
const deployProxy = async (detailName, contractName, args = [], overrides = {}, options = {}) => {
  const contractArgs = args || [{gasLimit: 8000000}];
  const proxyOpts = overrides || {};
  const factoryOpts = options || {};
  const contractArtifacts = await ethers.getContractFactory(contractName, factoryOpts);
  const deployed = await upgrades.deployProxy(contractArtifacts, contractArgs, proxyOpts);
  await deployed.deployed();

  const initializeFunction = Object.keys(contractArtifacts.interface.functions).find((fname) =>
    fname.startsWith("initialize")
  );
  const encoded = utils.defaultAbiCoder.encode(
    contractArtifacts.interface.functions[initializeFunction].inputs,
    contractArgs
  );
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
    return ethers.getContractAt(contractName, currentDeployment.address);
  }
  console.log(detailName + ": Deploying...");
  const deployed = await deployContract(detailName, contractName, args, overrides, options);
  console.log(detailName + ": Deployed at", deployed.address);
  return deployed;
};

const publishUpdates = async () => {
  const netw = await provider.getNetwork();
  if (netw.chainId != 31337) {
    fs.copyFile(deploymentsPath, publishPath, (err) => {
      if (err) throw err;
      console.log('Deployments/Updates have been published!');
    });
  }
}

module.exports = {
  network,
  setDeploymentsPath,
  setPublishPath,
  publishUpdates,
  getDeployments,
  updateDeployments,
  getContractAddress,
  getContract,
  deploy,
  deployProxy,
  redeployIf
};