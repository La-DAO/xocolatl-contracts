// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../utils/redstone/PriceAware.sol";
import "hardhat/console.sol";

abstract contract OracleHouse is PriceAware {
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

    bytes32 public tickerUsdFiat;
    bytes32 public tickerReserveAsset;
    bytes32[] internal tickers;

    address internal _trustedSigner;

    function _oracleHouse_initialize() internal {
      tickers.push(bytes32(0));
      tickers.push(bytes32(0));
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

    function _getLatestPrice() internal view virtual returns (uint256 price) {
      uint256[] memory oraclePrices = _getPricesFromMsg(tickers);
      uint256 usdfiat = oraclePrices[0];
      uint256 usdReserveAsset = oraclePrices[1];
      console.log("usdfiat", usdfiat);
      console.log("usdReserveAsset", usdReserveAsset);
      require(usdfiat != 0 && usdReserveAsset != 0, "oracle return zero!");
      price = (usdReserveAsset * 1e8) / usdfiat;
    }

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
      assembly{
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
     * @notice  Authorize signer for price feed provider.
     * @dev  Restricted to admin only. Function required by Redstone-evm-connector.
     * @param newtrustedSigner address
     * Emits a {TrustedSignerChanged} event.
     */
    function _authorizeSigner(address newtrustedSigner)
        internal
    {
        require(newtrustedSigner != address(0));
        _trustedSigner = newtrustedSigner;
        emit TrustedSignerChanged(_trustedSigner);
    }

    /**
     * @dev Must be implemented with admin restriction.
     */
    function setTickers(
        string calldata _tickerUsdFiat,
        string calldata _tickerReserveAsset
    ) external virtual;

    /**
     * @dev Must be implemented with admin restriction.
     */
    function authorizeSigner(address _trustedSigner) external virtual;
}
