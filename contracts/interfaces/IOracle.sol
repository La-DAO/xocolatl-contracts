// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IOracle {
    function activeOracle() external view returns (uint256);
    
    function getRedstoneData()
        external
        view
        returns (
            bytes32 tickerUsdFiat_,
            bytes32 tickerReserveAsset_,
            bytes32[] memory tickers_,
            address trustedSigner_
        );

    function getChainlinkData()
        external
        view
        returns (address addrUsdFiat_, address addrReserveAsset_);
}
