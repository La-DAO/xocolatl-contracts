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

    /** @dev Returns price in 8 decimals from `_computedPriceFeedAddr`
     * Override for House of Coin with called inputs from House Of Reserve. */
    function _getLatestPrice() internal view virtual returns (uint256 price) {
        // NOTE: All other oracle checks are done at {ComputedPriceFeedAddr.sol}
        (, int256 price_, , , ) = _computedPriceFeedAddr.latestRoundData();
        if (price_ <= 0) {
            revert OracleHouse_noValue();
        }
        return uint256(price_);
    }

    /**
     * @notice Returns the state data of Chainlink oracle.
     */
    function getComputedPriceFeedAddr() public view virtual returns (address) {
        return address(_computedPriceFeedAddr);
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
