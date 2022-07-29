// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../utils/redstone/PriceAware.sol";

abstract contract OracleHouse is PriceAware {
    /**
     * @dev emitted after activeOracle is changed.
     * @param newOracleNumber uint256 oracle id.
     **/
    event ActiveOracleChanged(uint256 newOracleNumber);

    enum OracleIds {
        redstone,
        uma,
        chainlink
    }

    /** @dev OracleIds: 0 = redstone, 1 = uma, 2 = chainlink */
    uint256 public activeOracle;

    /// redstone required state variables
    bytes32 public tickerUsdFiat;
    bytes32 public tickerReserveAsset;
    bytes32[] public tickers;
    address internal _trustedSigner;

    /// uma required state variables

    /// chainlink required state variables
    IAggregatorV3 internal _addrUsdFiat;
    IAggregatorV3 internal _addrReserveAsset;

    // solhint-disable-next-line func-name-mixedcase
    function _oracleHouse_init() internal {
      _oracle_redstone_init();
    }

    function _getLatestPrice() internal view virtual returns (uint256 price) {
        if (activeOracle == 0) {
            _getLatestPriceRedstone(tickers_);
        } else if (activeOracle == 1) {
            _getLatestPriceUMA();
        } else if (activeOracle == 2) {
            _getLatestPriceChainlink();
        }
    }

    /**
     * @dev Must be implemented with admin restriction and call _setActiveOracle().
     */
    function setActiveOracle(OracleIds id_) external virtual;

    /**
     * @notice  Sets the activeOracle.
     * @dev  Restricted to admin only.
     * @param id_ restricted to enum OracleIds
     * Emits a {ActiveOracleChanged} event.
     */

    function _setActiveOracle(OracleIds id_) internal {
        activeOracle = id_;
        emit ActiveOracleChanged(id_);
    }

    ///////////////////////////////
    /// Redstone oracle methods ///
    ///////////////////////////////

    /**
     * @dev emitted after the owner updates trusted signer
     * @param newSigner the address of the new signer
     **/
    event TrustedSignerChanged(address indexed newSigner);

    /**
     * @dev emitted after tickers for Redstone-evm-connector change.
     * @param newtickerUsdFiat short string
     * @param newtickerReserveAsset short string
     **/
    event TickersChanged(string newtickerUsdFiat, string newtickerReserveAsset);

    // solhint-disable-next-line func-name-mixedcase
    function _oracle_redstone_init() private {
        tickers.push(bytes32(0));
        tickers.push(bytes32(0));
    }

    function _getLatestPriceRedstone(bytes[] memory tickers_)
        internal
        view
        virtual
        returns (uint256 price)
    {
        uint256[] memory oraclePrices = _getPricesFromMsg(tickers_);
        uint256 usdfiat = oraclePrices[0];
        uint256 usdReserveAsset = oraclePrices[1];
        require(usdfiat != 0 && usdReserveAsset != 0, "oracle return invalid!");
        price = (usdReserveAsset * 1e8) / usdfiat;
    }

    /**
     * @notice  Checks that signer is authorized
     * @dev  Required by Redstone-evm-connector.
     * @param _receviedSigner address
     */
    function isSignerAuthorized(address _receviedSigner)
        public
        view
        override
        returns (bool)
    {
        return _receviedSigner == _trustedSigner;
    }

    /**
     * @dev Must be implemented with admin restriction and call _setTickers().
     */
    function setTickers(
        string calldata _tickerUsdFiat,
        string calldata _tickerReserveAsset
    ) external virtual;

    /**
     * @notice  Sets the tickers required in 'getLatestPrice'.
     * @dev  Restricted to admin only.
     * @param _tickerUsdFiat short string (less than 32 characters)
     * @param _tickerReserveAsset short string (less than 32 characters)
     * Emits a {TickersChanged} event.
     */
    function _setTickers(
        string memory _tickerUsdFiat,
        string memory _tickerReserveAsset
    ) internal {
        require(tickers.length == 2, "Not initialized!");
        bytes32 ticker1;
        bytes32 ticker2;
        assembly {
            ticker1 := mload(add(_tickerUsdFiat, 32))
            ticker2 := mload(add(_tickerReserveAsset, 32))
        }
        tickerUsdFiat = ticker1;
        tickerReserveAsset = ticker2;

        tickers[0] = tickerUsdFiat;
        tickers[1] = tickerReserveAsset;

        emit TickersChanged(_tickerUsdFiat, _tickerReserveAsset);
    }

    /**
     * @dev Must be implemented with admin restriction and call _authorizeSigner().
     */
    function authorizeSigner(address _trustedSigner) external virtual;

    /**
     * @notice  Authorize signer for price feed provider.
     * @dev  Restricted to admin only. Function required by Redstone-evm-connector.
     * @param newtrustedSigner address
     * Emits a {TrustedSignerChanged} event.
     */
    function _authorizeSigner(address newtrustedSigner) internal {
        require(newtrustedSigner != address(0), "Zero address!");
        _trustedSigner = newtrustedSigner;
        emit TrustedSignerChanged(_trustedSigner);
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

    function _getLatestPriceChainlink() private view returns (uint256 price) {
        require(
            address(_addrUsdFiat) != address(0) &&
                address(_addrReserveAsset) != address(0),
            "Not initialized!"
        );
        (, int256 usdfiat, , , ) = _addrUsdFiat.latestRoundData();
        (, int256 usdreserve, , , ) = _addrReserveAsset.latestRoundData();
        require(usdfiat > 0 && usdreserve > 0, "oracle return invalid!");
        price = (usdreserve * 1e8) / usdfiat;
    }

    function getChainlinkData()
        external
        view
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

    function _setChainlinkAddrs(address addrUsdFiat_, address addrReserveAsset_)
        internal
    {
        require(
            addrUsdFiat_ != address(0) && addrReserveAsset_ != address(0),
            "Zero address!"
        );
        _addrUsdFiat = IAggregatorV3(addrUsdFiat_);
        _addrReserveAsset = IAggregatorV3(addrReserveAsset_);
        emit ChainlinkAddressChange(addrUsdFiat_, _newAddrReserveAsset);
    }
}
