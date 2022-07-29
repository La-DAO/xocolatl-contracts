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

    /** see {OracleHouse-activeOracle}*/
    function activeOracle() external override view returns (uint256) {
        return _activeOracle;
    }

    /**
     * @notice  See '_setActiveOracle()' in {OracleHouse}.
     * @dev restricted to admin only.
     */
    function setActiveOracle(OracleIds id_)
        external
        override
        onlyOwner
    {
        _setActiveOracle(id_);
    }

    /**
     * @notice  See '_setTickers()' in {OracleHouse}.
     * @dev restricted to admin only.
     */
    function setTickers(
        string memory tickerUsdFiat_,
        string memory tickerReserveAsset_
    ) external override onlyOwner {
        _setTickers(tickerUsdFiat_, tickerReserveAsset_);
    }

    /**
     * @notice  See '_authorizeSigner()' in {OracleHouse}
     * @dev  Restricted to admin only.
     */
    function authorizeSigner(address newtrustedSigner)
        external
        override
        onlyOwner
    {
        _authorizeSigner(newtrustedSigner);
    }

    /**
     * @notice  See '_setChainlinkAddrs()' in {OracleHouse}
     * @dev  Restricted to admin only.
     */
    function setChainlinkAddrs(address addrUsdFiat_, address addrReserveAsset_)
        external
        override
        onlyOwner
    {
        _setChainlinkAddrs(addrUsdFiat_, addrReserveAsset_);
    }

    
}