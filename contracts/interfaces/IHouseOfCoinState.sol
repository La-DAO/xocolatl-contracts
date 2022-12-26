// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

interface IHouseOfCoinState {
    /**
     * @dev Returns the type of House Contract.
     */
    function HOUSE_TYPE() external returns (bytes32);

    /**
     * @dev Returns the backedAsset that is minted by this HouseOfCoin.
     */
    function backedAsset() external view returns (address);
}
