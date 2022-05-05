// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
 * @title Mock Oracle contract used for testing.
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "../abstract/OracleHouse.sol";

contract MockOracleState {
    string public trackingAssetSymbol;

    uint256 internal lastPrice;

    uint256 public oraclePriceDecimals;

    uint256 public lastTimestampUpdate;
}

contract MockOracle is Ownable, MockOracleState, OracleHouse {
    constructor(
        string memory _trackingassetSymbol,
        uint256 _oraclePriceDecimals
    ) {
        trackingAssetSymbol = _trackingassetSymbol;
        oraclePriceDecimals = _oraclePriceDecimals;
    }

    function getLastPrice() external view returns (uint256) {
        return lastPrice;
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        lastPrice = newPrice;
        lastTimestampUpdate = block.timestamp;
    }

    function redstoneGetLastPrice() external view returns (uint256) {
        uint256 usdmxn = _getPriceFromMsg(bytes32("MXNUSD=X"));
        uint256 usdeth = _getPriceFromMsg(bytes32("ETH"));
        uint256 mxneth = (usdeth * 1e8) / usdmxn;
        return mxneth;
    }

    /**
     * @dev Must be implemented with admin restriction.
     */
    function setTickers(
        string calldata _tickerUsdFiat,
        string calldata _tickerReserveAsset
    ) external override onlyOwner {
        _setTickers(_tickerUsdFiat, _tickerReserveAsset);
    }

    /**
     * @dev Must be implemented with admin restriction.
     */
    function authorizeSigner(address _trustedSigner)
        external
        override
        onlyOwner
    {
        _authorizeSigner(_trustedSigner);
    }
}