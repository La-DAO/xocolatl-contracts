// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title The house Of coin minting contract.
 * @author xocolatl.eth
 * @notice  Allows users with acceptable reserves to mint backedAsset.
 * @notice  Allows user to burn their minted asset to release their reserve.
 * @dev  Contracts are split into state and functionality.
 */
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {IERC20Extension} from "./interfaces/IERC20Extension.sol";
import {IAssetsAccountant} from "./interfaces/IAssetsAccountant.sol";
import {IHouseOfReserve} from "./interfaces/IHouseOfReserve.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract HouseOfCoinState {
    struct LiquidationParam {
        uint256 marginCallThreshold;
        uint256 liquidationThreshold;
        uint256 liquidationPricePenaltyDiscount;
        uint256 collateralPenalty;
    }

    bytes32 public constant HOUSE_TYPE = keccak256("COIN_HOUSE");

    address public backedAsset;

    uint256 internal backedAssetDecimals;

    address public assetsAccountant;

    LiquidationParam internal _liqParam;

    uint256 internal constant _ALL_BPS = 1e6;

    address public treasury;
}

contract HouseOfCoin is Initializable, OwnableUpgradeable, UUPSUpgradeable, HouseOfCoinState {
    // HouseOfCoinMinting Events

    /**
     * @dev Log when a user is mints coin.
     * @param user Address of user that minted coin.
     * @param backedTokenId Token Id number of asset in {AssetsAccountant}.
     * @param amount minted.
     */
    event CoinMinted(address indexed user, uint256 indexed backedTokenId, uint256 amount);

    /**
     * @dev Log when a user paybacks minted coin.
     * @param user Address of user that minted coin.
     * @param reservetokenID Token Id number of asset in {AssetsAccountant}.
     * @param amount payback.
     */
    event CoinPayback(address indexed user, uint256 indexed reservetokenID, uint256 amount);

    /**
     * @dev Log when fee is collected.
     * @param treasury address.
     * @param amount of fee collected.
     */
    event FeeCollected(address indexed treasury, uint256 amount);

    /**
     * @dev Log when liquidation params change
     * @param marginCallThreshold value.
     * @param liquidationThreshold value.
     * @param liquidationPricePenaltyDiscount value.
     * @param collateralPenalty value.
     */
    event LiquidationParamsChanges(
        uint256 marginCallThreshold,
        uint256 liquidationThreshold,
        uint256 liquidationPricePenaltyDiscount,
        uint256 collateralPenalty
    );

    /**
     * @dev Log when treasury address is changed.
     * @param newTreasury  address.
     */
    event TreasuryChanged(address indexed newTreasury);

    /// Custom errors
    error HouseOfCoin_notApplicable();
    error HouseOfCoin_invalidInput();
    error HouseOfCoin_notAuthorized();
    error HouseOfCoin_noBalances();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes this contract by setting:
     * @param backedAsset_ ERC20 address of the asset type of coin to be minted in this contract.
     * @param assetsAccountant_ Address of the {AssetsAccountant} contract.
     */
    function initialize(address backedAsset_, address assetsAccountant_, address treasury_) public initializer {
        if (backedAsset_ == address(0) || assetsAccountant_ == address(0) || treasury_ == address(0)) {
            revert HouseOfCoin_invalidInput();
        }
        backedAsset = backedAsset_;
        // Decimals from the backedAsset are stored to optimize gas
        // and avoid multiple external calls during execution of some functions.
        backedAssetDecimals = IERC20Extension(backedAsset).decimals();
        assetsAccountant = assetsAccountant_;
        treasury = treasury_;

        __Ownable_init();
        __UUPSUpgradeable_init();

        setLiqParams(
            1e18, // margin call when health ratio is 1 or below.
            0.95e18, // liquidation starts when health ratio drops to 0.95 or below.
            0.1e18, // 10% price discount for liquidated user collateral.
            0.75e18 // 75% collateral of liquidated will be sold to bring user's to good HealthRatio.
        );
    }

    /**
     * @dev Call latest price from applicable HouseOfReserve
     * @param hOfReserve_ address to get applicable price feed
     */
    function getLatestPrice(address hOfReserve_) public view returns (uint256 price) {
        price = IHouseOfReserve(hOfReserve_).getLatestPrice();
    }

    /**
     * @notice  Function to mint ERC20 'backedAsset' of this HouseOfCoin.
     * @dev  Requires user to have reserves for this backed asset at HouseOfReserves.
     * @param reserveAsset ERC20 address of asset to be used to back the minted coins.
     * @param houseOfReserve Address of the {HouseOfReserves} contract that manages the 'reserveAsset'.
     * @param amount To mint.
     * Emits a {CoinMinted} event.
     */
    function mintCoin(address reserveAsset, address houseOfReserve, uint256 amount) public returns (bool success) {
        IHouseOfReserve hOfReserve = IHouseOfReserve(houseOfReserve);
        IERC20Extension bAsset = IERC20Extension(backedAsset);

        uint256 reserveTokenID = hOfReserve.reserveTokenID();
        uint256 backedTokenID = hOfReserve.backedTokenID();

        // Validate reserveAsset and houseOfReserve are active with {AssetsAccountant}.
        if (
            !IAssetsAccountant(assetsAccountant).isARegisteredHouse(houseOfReserve)
                || IAssetsAccountant(assetsAccountant).houseOfReserves(reserveTokenID) == address(0)
                || hOfReserve.reserveAsset() != reserveAsset
        ) {
            revert HouseOfCoin_invalidInput();
        }

        // Validate this HouseOfCoin is active in {AssetsAccountant} and can mint backedAsset.
        if (!bAsset.hasRole(keccak256("MINTER_ROLE"), address(this))) {
            revert HouseOfCoin_notAuthorized();
        }

        uint256 reserveDecimals = IERC20Extension(hOfReserve.reserveAsset()).decimals();
        uint256 fee = (amount * hOfReserve.reserveMintFee()) / _ALL_BPS;

        // Get inputs for checking minting power, max loant to value factor and oracle price
        uint256 maxLTV = hOfReserve.maxLTVFactor();
        uint256 price = getLatestPrice(houseOfReserve);

        // Checks minting power of msg.sender.
        uint256 mintingPower =
            _checkRemainingMintingPower(msg.sender, reserveTokenID, reserveDecimals, backedTokenID, maxLTV, price);
        if (mintingPower == 0 || amount + fee > mintingPower) {
            revert HouseOfCoin_noBalances();
        }

        // Update state in AssetAccountant
        IAssetsAccountant(assetsAccountant).mint(msg.sender, backedTokenID, amount + fee, "");

        // Mint backedAsset Coins
        bAsset.mint(msg.sender, amount);
        if (fee > 0) {
            // Mint fee to treasury
            bAsset.mint(treasury, fee);
        }

        // Emit Event
        emit CoinMinted(msg.sender, backedTokenID, amount);
        emit FeeCollected(treasury, fee);
        success = true;
    }

    /**
     * @notice  Function to payback ERC20 'backedAsset' of this HouseOfCoin.
     * @dev Requires knowledge of the reserve asset used to back the minted coins.
     * @param backedTokenID_ Token Id in {AssetsAccountant}, releases the reserve asset used in 'getTokenID'.
     * @param amount To payback.
     * Emits a {CoinPayback} event.
     */
    function paybackCoin(uint256 backedTokenID_, uint256 amount) public {
        IAssetsAccountant accountant = IAssetsAccountant(assetsAccountant);
        IERC20Extension bAsset = IERC20Extension(backedAsset);

        uint256 userTokenIDBal = accountant.balanceOf(msg.sender, backedTokenID_);

        // Check in {AssetsAccountant} that msg.sender backedAsset was created with assets 'backedTokenID_' and
        // that amount is less than 'backedTokenID_' balance in {Assetsaccountant} and
        // Check that msg.sender has the intended backed ERC20 asset to be burned.
        if (userTokenIDBal == 0 || amount > userTokenIDBal || amount > bAsset.balanceOf(msg.sender)) {
            revert HouseOfCoin_invalidInput();
        }

        // Burn amount of ERC20 tokens paybacked.
        bAsset.burn(msg.sender, amount);

        // Burn amount of backedTokenID_ in {AssetsAccountant}
        accountant.burn(msg.sender, backedTokenID_, amount);

        emit CoinPayback(msg.sender, backedTokenID_, amount);
    }

    /**
     * @notice  Function to get the health ratio of user.
     * @param user address.
     * @param houseOfReserve address in where user has collateral backing debt.
     */
    function computeUserHealthRatio(address user, address houseOfReserve) public view returns (uint256) {
        // Get all the required inputs.
        IHouseOfReserve hOfReserve = IHouseOfReserve(houseOfReserve);
        uint256 reserveDecimals = IERC20Extension(hOfReserve.reserveAsset()).decimals();

        uint256 reserveTokenID_ = hOfReserve.reserveTokenID();
        uint256 backedTokenID_ = hOfReserve.backedTokenID();

        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(user, reserveTokenID_, backedTokenID_);

        uint256 liqFactor = hOfReserve.liquidationFactor();

        uint256 latestPrice = getLatestPrice(houseOfReserve);

        return _computeUserHealthRatio(reserveBal, reserveDecimals, mintedCoinBal, liqFactor, latestPrice);
    }

    /**
     * @dev Returns the _liqParams as a struct
     */
    function getLiqParams() public view returns (LiquidationParam memory) {
        return _liqParam;
    }

    /**
     * @dev Sets the treasury address.
     * @param newTreasury address.
     * Requirements:
     * - function should be admin restricted.
     */
    function setTreasury(address newTreasury) public onlyOwner {
        if (newTreasury == address(0)) revert HouseOfCoin_invalidInput();
        treasury = newTreasury;
        emit TreasuryChanged(newTreasury);
    }

    /**
     * @dev Sets the liquidation parameters.
     * @param marginCallThreshold_ defines the health ratio at which margin call is triggered.
     * @param liquidationThreshold_ defines the health ratio at which liquidation can be triggered.
     * @param liquidationPricePenaltyDiscount_ price discount at which liquidated user collateral is sold.
     * @param collateralPenalty_ percent of liquidated user's reserves that are sold during a liquidation event.
     * Requirements:
     *  - function Should be admin restricted.
     *  - no inputs can be zero all numbers are wei based (1e18).
     *  - marginCallThreshold_  should be greater than liquidationThreshold_.
     *  - liquidationThreshold_ should be less than 1e18.
     *  - liquidationPricePenaltyDiscount_ should be less than 1e18.
     *  - collateralPenalty_ should be less than 1e18.
     */
    function setLiqParams(
        uint256 marginCallThreshold_,
        uint256 liquidationThreshold_,
        uint256 liquidationPricePenaltyDiscount_,
        uint256 collateralPenalty_
    ) public onlyOwner {
        if (
            marginCallThreshold_ == 0 || liquidationThreshold_ == 0 || liquidationPricePenaltyDiscount_ == 0
                || collateralPenalty_ == 0 || liquidationThreshold_ >= marginCallThreshold_ || liquidationThreshold_ >= 1e18
                || liquidationPricePenaltyDiscount_ >= 1e18 || collateralPenalty_ >= 1e18
        ) {
            revert HouseOfCoin_invalidInput();
        }
        _liqParam.marginCallThreshold = marginCallThreshold_;
        _liqParam.liquidationThreshold = liquidationThreshold_;
        _liqParam.liquidationPricePenaltyDiscount = liquidationPricePenaltyDiscount_;
        _liqParam.collateralPenalty = collateralPenalty_;
        emit LiquidationParamsChanges(
            _liqParam.marginCallThreshold,
            _liqParam.liquidationThreshold,
            _liqParam.liquidationPricePenaltyDiscount,
            _liqParam.collateralPenalty
        );
    }

    /**
     * @notice  External function that returns the amount of backed asset coins user can mint with unused reserve asset.
     * @param user to check minting power.
     * @param hOfReserveAddr Address of house of reserve which assets will be used as collateral.
     */
    function checkRemainingMintingPower(address user, address hOfReserveAddr) public view returns (uint256) {
        // Get all required inputs
        IHouseOfReserve hOfReserve = IHouseOfReserve(hOfReserveAddr);
        uint256 reserveDecimals = IERC20Extension(hOfReserve.reserveAsset()).decimals();

        uint256 reserveTokenID = hOfReserve.reserveTokenID();
        uint256 backedTokenID = hOfReserve.backedTokenID();

        uint256 maxLTV = hOfReserve.maxLTVFactor();

        uint256 latestPrice = getLatestPrice(hOfReserveAddr);

        return _checkRemainingMintingPower(user, reserveTokenID, reserveDecimals, backedTokenID, maxLTV, latestPrice);
    }

    /// Internal Functions

    /**
     * @dev  Internal function to query balances in {AssetsAccountant}
     */
    function _checkBalances(address user, uint256 reservesTokenID_, uint256 bAssetRTokenID_)
        internal
        view
        returns (uint256 reserveBal, uint256 mintedCoinBal)
    {
        reserveBal = IERC1155Upgradeable(assetsAccountant).balanceOf(user, reservesTokenID_);
        mintedCoinBal = IERC1155Upgradeable(assetsAccountant).balanceOf(user, bAssetRTokenID_);
    }

    /**
     * @dev  Internal function to check user's remaining minting power.
     */
    function _checkRemainingMintingPower(
        address user,
        uint256 reserveTokenID,
        uint256 reserveDecimals,
        uint256 backedTokenID,
        uint256 maxLTV,
        uint256 price
    ) internal view returns (uint256) {
        // Need balances for tokenIDs of both reserves and backed asset in {AssetsAccountant}
        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(user, reserveTokenID, backedTokenID);

        // Check if msg.sender has reserves
        if (reserveBal == 0) {
            // If msg.sender has NO reserves, minting power = 0.
            return 0;
        } else {
            // Check if user can mint more
            (bool canMintMore, uint256 remainingMintingPower) =
                _checkIfUserCanMintMore(reserveBal, reserveDecimals, mintedCoinBal, maxLTV, price);
            if (canMintMore) {
                // If msg.sender canMintMore, how much
                return remainingMintingPower;
            } else {
                return 0;
            }
        }
    }

    /**
     * @dev  Internal function to check if user can mint more coin.
     */
    function _checkIfUserCanMintMore(
        uint256 reserveBal,
        uint256 reserveDecimals,
        uint256 mintedCoinBal,
        uint256 maxLTV,
        uint256 price
    ) internal view returns (bool canMintMore, uint256 remainingMintingPower) {
        uint256 reserveBalreducedByFactor = (reserveBal * maxLTV) / 1e18;

        uint256 decimalDiff = _getDecimalDiff(reserveDecimals, backedAssetDecimals);

        uint256 maxMintableAmount = (reserveBalreducedByFactor * price * (10 ** decimalDiff)) / 1e8;

        canMintMore = mintedCoinBal > maxMintableAmount ? false : true;

        remainingMintingPower = canMintMore ? (maxMintableAmount - mintedCoinBal) : 0;
    }

    /**
     * @dev returns difference in decimals
     * Requirements:
     *  - reserveDecimals must be =< than backedAssetDecimals_, otherwise return 0.
     */
    function _getDecimalDiff(uint256 reserveDecimals, uint256 backedAssetDecimals_) internal pure returns (uint256) {
        return backedAssetDecimals_ >= reserveDecimals ? backedAssetDecimals_ - reserveDecimals : 0;
    }

    function _computeUserHealthRatio(
        uint256 reserveBal,
        uint256 reserveDecimals,
        uint256 mintedCoinBal,
        uint256 liquidationFactor,
        uint256 price
    ) internal view returns (uint256 healthRatio) {
        if (mintedCoinBal == 0 || reserveBal == 0) {
            healthRatio = 0;
        } else {
            uint256 decimalDiff = _getDecimalDiff(reserveDecimals, backedAssetDecimals);

            uint256 reserveBalreducedByFactor = (reserveBal * liquidationFactor) / 1e18;

            // Check current maxMintableAmount with current price
            uint256 maxMintableAmount = (reserveBalreducedByFactor * price * (10 ** decimalDiff)) / 1e8;

            // Compute health ratio
            healthRatio = (maxMintableAmount * 1e18) / mintedCoinBal;
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
