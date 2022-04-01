// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
* @title Mock Oracle contract used for testing.
*/
import "redstone-evm-connector/lib/contracts/message-based/PriceAware.sol";

contract MockOracleState{

    string public trackingAssetSymbol;

    uint internal lastPrice;

    uint public oraclePriceDecimals;

    uint public lastTimestampUpdate;
}

contract MockOracle is MockOracleState, PriceAware {

    constructor (
        string memory _trackingassetSymbol,
        uint _oraclePriceDecimals
    ) {
        trackingAssetSymbol = _trackingassetSymbol;
        oraclePriceDecimals = _oraclePriceDecimals;
    }

    function getLastPrice() external view returns(uint){
        return lastPrice;
    }

    function setPrice(uint newPrice) external onlyOwner {
        lastPrice = newPrice;
        lastTimestampUpdate = block.timestamp;
    }

    function redstoneGetLastPrice() external view returns(uint) {
        uint usdmxn = getPriceFromMsg(bytes32("MXNUSD=X"));
        uint usdeth = getPriceFromMsg(bytes32("ETH"));
        uint mxneth = (usdeth * 1e8) / usdmxn;
        return mxneth;
    }
}