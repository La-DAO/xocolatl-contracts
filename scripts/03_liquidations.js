const {ethers} = require("hardhat");
const {WrapperBuilder} = require("redstone-evm-connector");

const fs = require("fs");

const {getDeployedContracts} = require("./utils.js");
const {removeDuplicates} = require("./helpers.js");

//TODO this entire script need to be re-done. Redstone-evm-connector not used anymore.

/**
 * @note Returns an array of addresses that have minted coin in a specific 'HouseOfCoin' deployed contract.
 * @param coinhouse etherjs contract object representing 'HouseOfCoin' deployed contract.
 * @param backedTokenID Id of the backed token minted.
 */
const getHistoricCoinMinters = async function (coinhouse, backedTokenID) {
    console.log("...getting historic coin minters");
    const path = "./scripts/output/coinminted-events.json";
    if (fs.existsSync(path)) {
        let savedData = JSON.parse(fs.readFileSync(path).toString());
        const dataLastBlock = savedData[savedData.length - 1].blockNumber;
        const data = await fetchCoinMintEvents(coinhouse, dataLastBlock + 1);
        if (data.length > 0) {
            savedData.append(data);
            fs.writeFile(path, JSON.stringify(savedData), (err) => {
                if (err) console.log(err);
                else {
                    console.log("...added CoinMinted events successfully");
                }
            });
        }
        const filteredbyBackedToken = savedData.filter((e) =>
            backedTokenID.eq(ethers.BigNumber.from(e.backedTokenID.hex)),
        );
        return removeDuplicates(filteredbyBackedToken.map((e) => e.user));
    } else {
        const data = await fetchCoinMintEvents(coinhouse);
        fs.writeFile(path, JSON.stringify(data), (err) => {
            if (err) console.log(err);
            else {
                console.log("...CoinMinted events saved successfully");
            }
        });
        const filteredbyBackedToken = data.filter((e) => backedTokenID.eq(e.backedTokenID));
        return removeDuplicates(filteredbyBackedToken.map((e) => e.user));
    }
};

/**
 * @note Returns formated array of events for 'CoinMint' of a specific 'HouseOfCoin' deployed contract.
 * @param coinhouse etherjs contract object representing 'HouseOfCoin' deployed contract.
 * @param startFromBlock block number reference to start searching for events.
 */
const fetchCoinMintEvents = async function (coinhouse, startFromBlock = 9913500) {
    const filterCoinMinted = await coinhouse.filters.CoinMinted();
    const eventsCoinMinted = await coinhouse.queryFilter(filterCoinMinted, startFromBlock);
    let data = [];
    if (eventsCoinMinted.length > 0) {
        for (let index = 0; index < eventsCoinMinted.length; index++) {
            data.push({
                blockNumber: eventsCoinMinted[index].blockNumber,
                backedTokenID: eventsCoinMinted[index].args[1],
                user: eventsCoinMinted[index].args[0],
                amount: eventsCoinMinted[index].args[2],
            });
        }
    }
    return data;
};

/**
 * @note Returns an array of validated addresses that continue to have an open debt position in a specific 'HouseOfCoin' deployed contract.
 * @param arrayOfHistoricMinters Array of addresses obtained from 'getHistoricCoinMinters()'.
 * @param accountant ethersjs contract object representing 'AssetsAccountant' deployed contract.
 * @param backedTokenID Id of the backed token minted.
 */
const validateMinters = async function (arrayOfHistoricMinters, accountant, backedTokenID) {
    console.log("...validating active minters");
    let validated = [];
    for (let index = 0; index < arrayOfHistoricMinters.length; index++) {
        let bal = await accountant.balanceOf(arrayOfHistoricMinters[index], backedTokenID);
        if (bal.gt(0)) {
            validated.push(arrayOfHistoricMinters[index]);
        }
    }
    return validated;
};

/**
 * @note Returns an array of addresses that are liquidatable.
 * @param addressArray Array of addresses obtained from 'validateMinters()'.
 * @param coinhouse ethersjs contract object representing 'HouseOfCoin' deployed contract.
 * @param liquidator etherjs wallet object of liquidator.
 * @param reserve ethersjs contract of the reserve asset.
 */
const checkLiquidatable = async function (addressArray, coinhouse, liquidator, reserve) {
    console.log("...checking for liquidatable minters");
    const wrappedcoinhouse = WrapperBuilder.wrapLite(coinhouse.connect(liquidator)).usingPriceFeed("redstone-stocks");
    const liqParam = await coinhouse.liqParam();
    let liquidatable = [];
    for (let index = 0; index < addressArray.length; index++) {
        let hr = await wrappedcoinhouse.computeUserHealthRatio(addressArray[index], reserve.address);
        if (hr.lte(liqParam.liquidationThreshold)) {
            liquidatable.push(addressArray[index]);
        }
    }
    return liquidatable;
};

/**
 * @note Returns the amount of backing asset required to liquidate users.
 * @param addressArray Array of addresses obtained from 'checkLiquidatable()'.
 * @param coinhouse ethersjs contract object representing 'HouseOfCoin' deployed contract.
 * @param liquidator etherjs wallet object of liquidator.
 * @param reserve ethersjs contract of the reserve asset.
 */
const computeLiquidationCost = async function (addressArray, coinhouse, liquidator, reserve) {
    console.log("...calculating cost of liquidation");
    const wrappedcoinhouse = WrapperBuilder.wrapLite(coinhouse.connect(liquidator)).usingPriceFeed("redstone-stocks");
    let totalCost = ethers.BigNumber.from(0);
    for (let index = 0; index < addressArray.length; index++) {
        [costAmount, collateralPenalty] = await wrappedcoinhouse.computeCostOfLiquidation(
            addressArray[index],
            reserve.address,
        );
        totalCost = costAmount.add(totalCost);
    }
    return totalCost;
};

/**
 * @note Execute liquidatio of users.
 * @param addressArray Array of addresses obtained from 'checkLiquidatable()'.
 * @param coinhouse ethersjs contract object representing 'HouseOfCoin' deployed contract.
 * @param liquidator etherjs wallet object of liquidator.
 * @param reserve ethersjs contract of the reserve asset.
 */
const liquidateUsers = async function (addressArray, coinhouse, liquidator, weth) {
    const wrappedcoinhouse = WrapperBuilder.wrapLite(coinhouse.connect(liquidator)).usingPriceFeed("redstone-stocks");
    for (let index = 0; index < addressArray.length; index++) {
        console.log(`...liquidating user ${addressArray[index]}`);
        let txLiquidate = await wrappedcoinhouse.liquidateUser(addressArray[index], weth.address);
        let txResponse = await txLiquidate.wait();
        console.log(`...succesfully liquidated user ${addressArray[index]} per txHash: ${txResponse.transactionHash}`);
    }
};

async function main() {
    const accounts = await ethers.getSigners();
    const liquidator = accounts[0];

    const contracts = await getDeployedContracts();

    const coinhouse = contracts.coinhouse;
    const reservehouse = contracts.reservehouse;
    const accountant = contracts.accountant;
    const weth = contracts.weth;
    const xoc = contracts.xoc;

    const bid = await reservehouse.backedTokenID();

    const historicMinters = await getHistoricCoinMinters(coinhouse, bid);
    const validminters = await validateMinters(historicMinters, accountant, bid);
    const liquidatableUsers = await checkLiquidatable(validminters, coinhouse, liquidator, weth);

    if (liquidatableUsers.length > 0) {
        const cost = await computeLiquidationCost(validminters, coinhouse, liquidator, weth);
        const liquidatorBal = await xoc.balanceOf(await liquidator.getAddress());
        if (liquidatorBal.gte(cost)) {
            try {
                console.log("...approving funds for liquidation");
                const txApproval = await xoc.connect(liquidator).approve(await coinhouse.getAddress(), cost);
                await txApproval.wait();
                await liquidateUsers(liquidatableUsers, coinhouse, liquidator, weth);
            } catch (error) {
                console.log("Error!");
                console.log(error);
            }
        } else {
            console.log("liquidator with not sufficient balance for liquidation");
        }
    } else {
        console.log("No users to liquidate.");
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
