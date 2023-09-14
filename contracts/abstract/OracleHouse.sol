// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";

abstract contract OracleHouse is PriceAware {
    /**
     * @dev emitted after activeOracle is changed.
     * @param newOracleNumber uint256 oracle id.
     **/
    event ActiveOracleChanged(uint256 newOracleNumber);

    /// Custom errors

    /** Wrong or invalid input*/
    error OracleHouse_invalidInput();

    /** Not initialized*/
    error OracleHouse_notInitialized();

    /** No valid value returned*/
    error OracleHouse_noValue();

    enum OracleIds {
        redstone,
        uma,
        chainlink
    }

    /** @dev OracleIds: 0 = redstone, 1 = uma, 2 = chainlink */
    uint256 internal _activeOracle;

    /// redstone required state variables
    bytes32 private _tickerUsdFiat;
    bytes32 private _tickerReserveAsset;
    bytes32[] private _tickers;
    address private _trustedSigner;

    /// uma required state variables
    UMAOracleHelper private _umaOracleHelper;

    /// chainlink required state variables
    IAggregatorV3 private _addrUsdFiat;
    IAggregatorV3 private _addrReserveAsset;

    // solhint-disable-next-line func-name-mixedcase
    function _oracleHouse_init() internal {
        _oracle_redstone_init();
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
     * @dev Must be implemented with admin restriction and call _setChainlinkAddrs().
     */
    function setChainlinkAddrs(address addrUsdFiat_, address addrReserveAsset_)
        external
        virtual;

    /**
     * @notice  Sets the chainlink addresses required in '_getLatestPriceChainlink()'.
     * @param addrUsdFiat_ address from chainlink.
     * @param addrReserveAsset_ address from chainlink.
     * Emits a {ChainlinkAddressChange} event.
     */
    function _setChainlinkAddrs(address addrUsdFiat_, address addrReserveAsset_)
        internal
    {
        if (addrUsdFiat_ == address(0) || addrReserveAsset_ == address(0)) {
            revert OracleHouse_invalidInput();
        }
        _addrUsdFiat = IAggregatorV3(addrUsdFiat_);
        _addrReserveAsset = IAggregatorV3(addrReserveAsset_);
        emit ChainlinkAddressChange(addrUsdFiat_, addrReserveAsset_);
    }
}
