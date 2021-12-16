// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/**
* @title The house Of coin minting contract.
* @author daigaro.eth
* @notice  Allows users with acceptable reserves to mint backedAsset.
* @notice  Allows user to burn their minted asset to release their reserve.
* @dev  Contracts are split into state and functionality.
*/

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./interfaces/IERC20Extension.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAssetsAccountant.sol";
import "contracts/interfaces/IAssetsAccountantState.Sol";
import "./interfaces/IHouseOfReserveState.sol";
import "redstone-evm-connector/lib/contracts/message-based/PriceAware.sol";

import "hardhat/console.sol";

contract HouseOfCoinState {

    // HouseOfCoinMinting Events
    /**
    * @dev Log when a user is mints coin.
    * @param user Address of user that minted coin.
    * @param backedtokenID Token Id number of asset in {AssetsAccountant}.
    * @param amount minted.
    */
    event CoinMinted(address indexed user, uint indexed backedtokenID, uint amount);

    /**
    * @dev Log when a user paybacks minted coin.
    * @param user Address of user that minted coin.
    * @param backedtokenID Token Id number of asset in {AssetsAccountant}.
    * @param amount payback.
    */
    event CoinPayback(address indexed user, uint indexed backedtokenID, uint amount);

    bytes32 public constant HOUSE_TYPE = keccak256("COIN_HOUSE");

    address public backedAsset;

    address public assetsAccountant;
}

contract HouseOfCoin is Initializable, AccessControl, PriceAware, HouseOfCoinState {
    
    /**
    * @dev Initializes this contract by setting:
    * @param _backedAsset ERC20 address of the asset type of coin to be minted in this contract.
    * @param _assetsAccountant Address of the {AssetsAccountant} contract.
    */
    function initialize(
        address _backedAsset,
        address _assetsAccountant
    ) public initializer() 
    {
        backedAsset = _backedAsset;
        assetsAccountant = _assetsAccountant;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
    * @notice  Function to mint ERC20 'backedAsset' of this HouseOfCoin.
    * @dev  Requires user to have reserves for this backed asset at HouseOfReserves.
    * @param reserveAsset ERC20 address of asset to be used to back the minted coins.
    * @param houseOfReserve Address of the {HouseOfReserves} contract that manages the 'reserveAsset'.
    * @param amount To mint. 
    * Emits a {CoinMinted} event.
    */
    function mintCoin(address reserveAsset, address houseOfReserve, uint amount) public {

        IHouseOfReserveState hOfReserve = IHouseOfReserveState(houseOfReserve);
        IERC20Extension bAsset = IERC20Extension(backedAsset);

        uint reserveTokenID = hOfReserve.reserveTokenID();
        uint backedTokenID = getBackedTokenID(reserveAsset);

        // Validate reserveAsset is active with {AssetsAccountant} and check houseOfReserve inputs.
        require(
            IAssetsAccountantState(assetsAccountant).houseOfReserves(reserveTokenID) != address(0) &&
            hOfReserve.reserveAsset() == reserveAsset,
            "Not valid reserveAsset!"
        );

        // Validate this HouseOfCoin is active with {AssetsAccountant} and can mint backedAsset.
        require(bAsset.hasRole(keccak256("MINTER_ROLE"), address(this)), "houseOfCoin not authorized to mint backedAsset!" );

        // Get inputs for checking minting power, collateralization factor and oracle price
        IHouseOfReserveState.Factor memory collatRatio = hOfReserve.collateralRatio();
        uint price = redstoneGetLastPrice();

        // Checks minting power of msg.sender.
        uint mintingPower = _checkMintingPower(
            msg.sender,
            reserveTokenID,
            backedTokenID,
            collatRatio,
            price
        );
        require(
            mintingPower > 0 &&
            mintingPower >= amount,
             "Not enough reserves to mint amount!"
        );

        // Update state in AssetAccountant
        IAssetsAccountant(assetsAccountant).mint(
            msg.sender,
            backedTokenID,
            amount,
            ""
        );

        // Mint backedAsset Coins
        bAsset.mint(msg.sender, amount);

        // Emit Event
        emit CoinMinted(msg.sender, backedTokenID, amount);
    }

    /**
    * @notice  Function to payback ERC20 'backedAsset' of this HouseOfCoin.
    * @dev Requires knowledge of the reserve asset used to back the minted coins.
    * @param _backedTokenID Token Id in {AssetsAccountant}, releases the reserve asset used in 'getTokenID'.
    * @param amount To payback. 
    * Emits a {CoinPayback} event.
    */
    function paybackCoin(uint _backedTokenID, uint amount) public {

        IAssetsAccountant accountant = IAssetsAccountant(assetsAccountant);
        IERC20Extension bAsset = IERC20Extension(backedAsset);

        uint userTokenIDBal = accountant.balanceOf(msg.sender, _backedTokenID);

        // Check in {AssetsAccountant} that msg.sender backedAsset was created with assets '_backedTokenID'
        require(userTokenIDBal >= 0, "No _backedTokenID balance!");

        // Check that amount is less than '_backedTokenID' in {Assetsaccountant}
        require(userTokenIDBal >= amount, "amount >  _backedTokenID balance!");

        // Check that msg.sender has the intended backed ERC20 asset.
        require(bAsset.balanceOf(msg.sender) >= amount, "No ERC20 allowance!");

        // Burn amount of ERC20 tokens paybacked.
        bAsset.burn(msg.sender, amount);

        // Burn amount of _backedTokenID in {AssetsAccountant}
        accountant.burn(msg.sender, _backedTokenID, amount);

        emit CoinPayback(msg.sender, _backedTokenID, amount);
    }

    /**
    *
    * @dev  Get backedTokenID to be used in {AssetsAccountant}
    * @param _reserveAsset ERC20 address of the reserve asset used to back coin.
    */
    function getBackedTokenID(address _reserveAsset) public view returns(uint) {
        return uint(keccak256(abi.encodePacked(_reserveAsset, backedAsset, "backedAsset")));
    }

    /**
    * @dev  Internal function to query balances in {AssetsAccountant}
    */
    function _checkBalances(
        address user,
        uint _reservesTokenID,
        uint _bAssetRTokenID
    ) internal view returns (uint reserveBal, uint mintedCoinBal) {
        reserveBal = IERC1155(assetsAccountant).balanceOf(user, _reservesTokenID);
        mintedCoinBal = IERC1155(assetsAccountant).balanceOf(user, _bAssetRTokenID);
    }

    /**
    * @dev  Internal function to query balances in {AssetsAccountant}
    */
    function redstoneGetLastPrice() public view returns (uint) {
        uint usdfiat = getPriceFromMsg(bytes32("MXNUSD=X"));
        uint usdeth = getPriceFromMsg(bytes32("ETH"));
        uint fiateth = (usdeth * 1e8) / usdfiat;
        return fiateth;
    }

    /**
    * @notice  External function that returns the amount of backed asset coins user can mint with unused reserve asset.
    * @param user to check minting power.
    * @param reserveAsset Address of reserve asset.
    */
    function checkMintingPower(address user, address reserveAsset) external view returns(uint) {

        // Get all required inputs
        IAssetsAccountantState accountant = IAssetsAccountantState(assetsAccountant);

        uint reserveTokenID = accountant.reservesIds(reserveAsset, backedAsset);

        uint backedTokenID = getBackedTokenID(reserveAsset);

        address hOfReserveAddr = accountant.houseOfReserves(reserveTokenID);

        IHouseOfReserveState hOfReserve = IHouseOfReserveState(hOfReserveAddr);

        IHouseOfReserveState.Factor memory collatRatio = hOfReserve.collateralRatio();

        uint price = redstoneGetLastPrice();

        return _checkMintingPower(
            user,
            reserveTokenID,
            backedTokenID,
            collatRatio,
            price
        );
    }

    /**
    * @dev  Internal function to check if user is liquidatable
    */
    function _checkMintingPower(
        address user,
        uint reserveTokenID,
        uint backedTokenID,
        IHouseOfReserveState.Factor memory collatRatio,
        uint price
    ) public view returns(uint) {

        // Need balances for tokenIDs of both reserves and backed asset in {AssetsAccountant}
        (uint reserveBal, uint mintedCoinBal) =  _checkBalances(
            user,
            reserveTokenID,
            backedTokenID
        );

        // Check if msg.sender has reserves
        if (reserveBal == 0) {
            // If msg.sender has NO reserves, minting power = 0.
            return 0;
        } else {
            // Check that user is not Liquidatable
            (bool liquidatable, uint mintingPower) = _checkIfLiquidatable(
                reserveBal,
                mintedCoinBal,
                collatRatio,
                price
            );
            if(liquidatable) {
                // If msg.sender is liquidatable, minting power = 0.
                return 0;
            } else {
                return mintingPower;
            }
        }
    }

    /**
    * @dev  Internal function to check if user is liquidatable
    */
    function _checkIfLiquidatable(
        uint reserveBal,
        uint mintedCoinBal,
        IHouseOfReserveState.Factor memory collatRatio,
        uint price
    ) internal pure returns (bool liquidatable, uint mintingPower) {

        uint reserveBalreducedByFactor =
            ( reserveBal * collatRatio.denominator) / collatRatio.numerator;
            
        uint maxMintableAmount =
            (reserveBalreducedByFactor * price) / 1e8;

        liquidatable = mintedCoinBal > maxMintableAmount? true : false;

        mintingPower = !liquidatable ? (maxMintableAmount - mintedCoinBal) : 0;
    }
}