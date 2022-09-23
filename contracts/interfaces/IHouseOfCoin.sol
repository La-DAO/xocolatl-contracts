// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

interface IHouseOfCoin  {
    
    /**
    * @notice  Function to mint ERC20 'backedAsset' of this HouseOfCoin.
    * @dev  Requires user to have reserves for this backed asset at HouseOfReserves.
    * @param reserveAsset ERC20 address of asset to be used to back the minted coins.
    * @param houseOfReserve Address of the {HouseOfReserves} contract that manages the 'reserveAsset'.
    * @param amount To mint. 
    * Emits a {CoinMinted} event.
    */
    function mintCoin(address reserveAsset, address houseOfReserve, uint amount) external;

    /**
    * @notice  Function to payback ERC20 'backedAsset' of this HouseOfCoin.
    * @dev Requires knowledge of the reserve asset used to back the minted coins.
    * @param _backedTokenID Token Id in {AssetsAccountant}, releases the reserve asset used in 'getTokenID'.
    * @param amount To payback. 
    * Emits a {CoinPayback} event.
    */
    function paybackCoin(uint _backedTokenID, uint amount) external;

    /**
    * @notice  External function that returns the amount of backed asset coins user can mint with unused reserve asset.
    * @param user to check minting power.
    * @param reserveAsset Address of reserve asset.
    */
    function checkMintingPower(address user, address reserveAsset) external view returns(uint);
    
}