// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";

abstract contract OracleHouse {
    /**
     * @dev emitted after `ComputedPriceFeed` addresses change.
     * @param _newComputedPriceFeedAddrChange from Tlatlalia-ni
     **/
    event ComputedPriceFeedAddrChange(address _newComputedPriceFeedAddrChange);

    /// Custom errors
    /** Wrong or invalid input*/
    error OracleHouse_invalidInput();
    /** Not initialized*/
    error OracleHouse_notInitialized();
    /** No valid value returned*/
    error OracleHouse_noValue();

    /// @dev Unused state variable; previously as `_activeOracle`.
    uint256 internal _unused_uint256_1;
    /// @dev Unused state variable; previously as `_tickerUsdFiat`.
    bytes32 private _unused_bytes32_1;
    /// @dev Unused state variable; previously as `_tickerReserveAsset`.
    bytes32 private _unused_bytes32_2;
    /// @dev Unused state variable; previously as `_tickers[]`.
    bytes32[] private _unused_bytes32Array_1;
    /// @dev Unused state variable; previously as `_trustedSigner`.
    address private _unused_address_1;
    /// @dev Unused state variable; previously as `_umaOracleHelper`.
    address private _unused_address_2;
    /// @dev Unused state variable; previously as `_addrReserveAsset`.
    address private _unused_address_3;

    /// @dev PriceBulletin Address, previously as `_addrReserveAsset`.
    IPriceBulletin private _computedPriceFeedAddr;

    function __OracleHouse_init(address computedPriceFeedAddr_) internal {
        _setComputedPriceFeedAddr(computedPriceFeedAddr_);
    }

    /**
     * @notice Returns the active oracle from House of Reserve.
     * @dev Must be implemented in House Of Reserve ONLY.
     */
    function activeOracle() external view virtual returns (uint256);

    /** @dev Override for House of Coin with called inputs from House Of Reserve. */
    function _getLatestPrice(address)
        internal
        view
        virtual
        returns (uint256 price)
    {
        if (_activeOracle == 0) {
            price = _getLatestPriceRedstone(_tickers);
        } else if (_activeOracle == 1) {
            price = _getLatestPriceUMA();
        } else if (_activeOracle == 2) {
            price = _getLatestPriceChainlink(_addrUsdFiat, _addrReserveAsset);
        }
    }

    ////////////////////////////////
    /// Chainlink oracle methods ///
    ////////////////////////////////

    /**
     * @dev emitted after chainlink addresses change.
     * @param _newAddrUsdFiat from chainlink.
     * @param _newAddrReserveAsset from chainlink.
     **/
    event ChainlinkAddressChange(
        address _newAddrUsdFiat,
        address _newAddrReserveAsset
    );

    /**
     * Returns price in 8 decimal places.
     */
    function _getLatestPriceChainlink(
        IAggregatorV3 addrUsdFiat_,
        IAggregatorV3 addrReserveAsset_
    ) internal view returns (uint256 price) {
        if (
            address(addrUsdFiat_) == address(0) ||
            address(addrReserveAsset_) == address(0)
        ) {
            revert OracleHouse_notInitialized();
        }
        (, int256 usdfiat, , , ) = addrUsdFiat_.latestRoundData();
        (, int256 usdreserve, , , ) = addrReserveAsset_.latestRoundData();
        if (usdfiat <= 0 || usdreserve <= 0) {
            revert OracleHouse_noValue();
        }
        price = (uint256(usdreserve) * 1e8) / uint256(usdfiat);
    }

    /**
     * @notice Returns the state data of Chainlink oracle.
     */
    function getChainlinkData()
        external
        view
        virtual
        returns (address addrUsdFiat_, address addrReserveAsset_)
    {
        addrUsdFiat_ = address(_addrUsdFiat);
        addrReserveAsset_ = address(_addrReserveAsset);
    }

    /**
     * @dev Must be implemented with admin restriction and call `_setComputedPriceFeedAddr()`.
     */
    function setComputedPriceFeedAddr(
        address computedPriceFeedAddr_
    ) external virtual;

    /**
     * @notice  Sets the `ComputedPriceFeedAddr` required in '_getLatestPrice()'.
     * @param computedPriceFeedAddr_ deployed
     * Emits a {ComputedPriceFeedAddrChange} event.
     */
    function _setComputedPriceFeedAddr(
        address computedPriceFeedAddr_
    ) internal {
        if (computedPriceFeedAddr_ == address(0)) {
            revert OracleHouse_invalidInput();
        }
        _computedPriceFeedAddr = IPriceBulletin(computedPriceFeedAddr_);
        emit ComputedPriceFeedAddrChange(computedPriceFeedAddr_);
    }
}
