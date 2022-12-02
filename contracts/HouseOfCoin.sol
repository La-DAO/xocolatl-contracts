// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

/**
 * @title The house Of coin minting contract.
 * @author xocolatl.eth
 * @notice  Allows users with acceptable reserves to mint backedAsset.
 * @notice  Allows user to burn their minted asset to release their reserve.
 * @dev  Contracts are split into state and functionality.
 */

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./interfaces/IERC20Extension.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAssetsAccountant.sol";
import "./interfaces/IAssetsAccountantState.Sol";
import "./interfaces/IHouseOfReserve.sol";
import "./abstract/OracleHouse.sol";

contract HouseOfCoinState {
    // HouseOfCoinMinting Events

    /**
     * @dev Log when a user is mints coin.
     * @param user Address of user that minted coin.
     * @param backedTokenId Token Id number of asset in {AssetsAccountant}.
     * @param amount minted.
     */
    event CoinMinted(
        address indexed user,
        uint256 indexed backedTokenId,
        uint256 amount
    );

    /**
     * @dev Log when a user paybacks minted coin.
     * @param user Address of user that minted coin.
     * @param reservetokenID Token Id number of asset in {AssetsAccountant}.
     * @param amount payback.
     */
    event CoinPayback(
        address indexed user,
        uint256 indexed reservetokenID,
        uint256 amount
    );

    /**
     * @dev Log when a user is in the danger zone of being liquidated.
     * @param user Address of user that is on margin call.
     * @param mintedAsset ERC20 address of user's token debt on margin call.
     * @param reserveAsset ERC20 address of user's backing collateral.
     */
    event MarginCall(
        address indexed user,
        address indexed mintedAsset,
        address indexed reserveAsset
    );

    /**
     * @dev Log when a user is liquidated.
     * @param userLiquidated Address of user that is being liquidated.
     * @param liquidator Address of user that liquidates.
     * @param collateralAmount sold.
     */
    event Liquidation(
        address indexed userLiquidated,
        address indexed liquidator,
        uint256 collateralAmount,
        uint256 debtAmount
    );

    /**
     * @dev Log when liquidation params change
     * @param marginCallThreshold value.
     * @param liquidationThreshold value.
     * @param liquidationPricePenaltyDiscount value.
     * @param collateralPenalty value.
     */
    event LiquidationParamsChanges(
        uint256 globalBase,
        uint256 marginCallThreshold,
        uint256 liquidationThreshold,
        uint256 liquidationPricePenaltyDiscount,
        uint256 collateralPenalty
    );

    /// Custom errors

    /** Function is disabled by implementation*/
    error HouseOfCoin_notApplicable();

    /** Wrong or invalid input*/
    error HouseOfCoin_invalidInput();

    /** Not authorized*/
    error HouseOfCoin_notAuthorized();

    /** Not enough reserves, or minted coin*/
    error HouseOfCoin_noBalances();

    struct LiquidationParameters {
        uint256 globalBase;
        uint256 marginCallThreshold;
        uint256 liquidationThreshold;
        uint256 liquidationPricePenaltyDiscount;
        uint256 collateralPenalty;
    }

    bytes32 public constant HOUSE_TYPE = keccak256("COIN_HOUSE");

    address public backedAsset;

    uint256 internal backedAssetDecimals;

    address public assetsAccountant;

    LiquidationParameters internal _liqParam;
}

contract HouseOfCoin is
    Initializable,
    AccessControl,
    OracleHouse,
    HouseOfCoinState
{
    /**
     * @dev Initializes this contract by setting:
     * @param backedAsset_ ERC20 address of the asset type of coin to be minted in this contract.
     * @param assetsAccountant_ Address of the {AssetsAccountant} contract.
     */
    function initialize(address backedAsset_, address assetsAccountant_)
        public
        initializer
    {
        if (backedAsset_ == address(0) || assetsAccountant_ == address(0)) {
            revert HouseOfCoin_invalidInput();
        }
        backedAsset = backedAsset_;
        backedAssetDecimals = IERC20Extension(backedAsset).decimals();
        assetsAccountant = assetsAccountant_;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _oracleHouse_init();
        setLiqParams(
            100, // define all liquidation parameters as base 100 decimal numbers.
            100, // margin call when health ratio is 1 or below. This means maxMintPower = mintedDebt, accounting the collateralization factors.
            95, // liquidation starts when health ratio drops to 0.95 or below.
            10, // 10% price discount for liquidated user collateral.
            75 // 75% collateral of liquidated will be sold to bring user's to good HealthRatio.
        );
    }

    /** @dev See {OracleHouse-activeOracle}. */
    function activeOracle() external pure override returns (uint256) {
        revert HouseOfCoin_notApplicable();
    }

    /** @dev See {OracleHouse-setActiveOracle} */
    function setActiveOracle(OracleIds) external pure override {
        revert HouseOfCoin_notApplicable();
    }

    /** @dev See {OracleHouse-setTickers} */
    function setTickers(string memory, string memory) external pure override {
        revert HouseOfCoin_notApplicable();
    }

    /** @dev See {OracleHouse-getRedstoneData} */
    function getRedstoneData()
        external
        pure
        override
        returns (
            bytes32,
            bytes32,
            bytes32[] memory,
            address
        )
    {
        revert HouseOfCoin_notApplicable();
    }

    /**
     * @notice  See '_authorizeSigner()' in {OracleHouse}
     * @dev  Restricted to admin only.
     */
    function authorizeSigner(address newtrustedSigner)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _authorizeSigner(newtrustedSigner);
    }

    /**
     * @notice  See '_setUMAOracleHelper()' in {OracleHouse}
     * @dev  Should revert.
     */
    function setUMAOracleHelper(address) external pure override {
        revert HouseOfCoin_notApplicable();
    }

    /** @dev See {OracleHouse-getChainlinkData} */
    function getChainlinkData()
        external
        pure
        override
        returns (address, address)
    {
        revert HouseOfCoin_notApplicable();
    }

    /** @dev See {OracleHouse-setChainlinkAddrs} */
    function setChainlinkAddrs(address, address) external pure override {
        revert HouseOfCoin_notApplicable();
    }

    /**
     * @dev Call latest price according to activeOracle
     * @param hOfReserve_ address to get data for price feed.
     */
    function getLatestPrice(address hOfReserve_)
        public
        view
        returns (uint256 price)
    {
        price = _getLatestPrice(hOfReserve_);
    }

    /** @dev  Overriden See '_getLatestPrice()' in {OracleHouse} */
    function _getLatestPrice(address hOfReserve_)
        internal
        view
        override
        returns (uint256 price)
    {
        if (
            hOfReserve_ == address(0) ||
            !IAssetsAccountantState(assetsAccountant).isARegisteredHouse(
                hOfReserve_
            )
        ) {
            revert HouseOfCoin_invalidInput();
        }
        IHouseOfReserve hOfReserve = IHouseOfReserve(hOfReserve_);
        uint256 activeOracle_ = hOfReserve.activeOracle();
        if (activeOracle_ == 0) {
            (, , bytes32[] memory tickers_, ) = hOfReserve.getRedstoneData();
            price = _getLatestPriceRedstone(tickers_);
        } else if (activeOracle_ == 1) {
            price = hOfReserve.getLatestPrice();
        } else if (activeOracle_ == 2) {
            (address addrUsdFiat_, address addrReserveAsset_) = hOfReserve
                .getChainlinkData();
            price = _getLatestPriceChainlink(
                IAggregatorV3(addrUsdFiat_),
                IAggregatorV3(addrReserveAsset_)
            );
        }
    }

    /**
     * @notice  Function to mint ERC20 'backedAsset' of this HouseOfCoin.
     * @dev  Requires user to have reserves for this backed asset at HouseOfReserves.
     * @param reserveAsset ERC20 address of asset to be used to back the minted coins.
     * @param houseOfReserve Address of the {HouseOfReserves} contract that manages the 'reserveAsset'.
     * @param amount To mint.
     * Emits a {CoinMinted} event.
     */
    function mintCoin(
        address reserveAsset,
        address houseOfReserve,
        uint256 amount
    ) public returns (bool success) {
        IHouseOfReserve hOfReserve = IHouseOfReserve(houseOfReserve);
        IERC20Extension bAsset = IERC20Extension(backedAsset);

        uint256 reserveTokenID = hOfReserve.reserveTokenID();
        uint256 backedTokenID = getBackedTokenID(reserveAsset);

        // Validate reserveAsset and houseOfReserve are active with {AssetsAccountant}.
        if (
            !IAssetsAccountantState(assetsAccountant).isARegisteredHouse(
                houseOfReserve
            ) ||
            IAssetsAccountantState(assetsAccountant).houseOfReserves(
                reserveTokenID
            ) ==
            address(0) ||
            hOfReserve.reserveAsset() != reserveAsset
        ) {
            revert HouseOfCoin_invalidInput();
        }

        // Validate this HouseOfCoin is active in {AssetsAccountant} and can mint backedAsset.
        if (!bAsset.hasRole(keccak256("MINTER_ROLE"), address(this))) {
            revert HouseOfCoin_notAuthorized();
        }

        // Get inputs for checking minting power, collateralization factor and oracle price
        IHouseOfReserve.Factor memory collatRatio = hOfReserve
            .collateralRatio();
        uint256 price = getLatestPrice(houseOfReserve);

        // Checks minting power of msg.sender.
        uint256 mintingPower = _checkRemainingMintingPower(
            msg.sender,
            reserveTokenID,
            backedTokenID,
            collatRatio,
            price
        );
        if (mintingPower == 0 || amount > mintingPower) {
            revert HouseOfCoin_noBalances();
        }

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

        uint256 userTokenIDBal = accountant.balanceOf(
            msg.sender,
            backedTokenID_
        );

        // Check in {AssetsAccountant} that msg.sender backedAsset was created with assets 'backedTokenID_' and
        // that amount is less than 'backedTokenID_' balance in {Assetsaccountant} and
        // Check that msg.sender has the intended backed ERC20 asset to be burned.
        if (
            userTokenIDBal == 0 ||
            amount > userTokenIDBal ||
            amount > bAsset.balanceOf(msg.sender)
        ) {
            revert HouseOfCoin_invalidInput();
        }

        // Burn amount of ERC20 tokens paybacked.
        bAsset.burn(msg.sender, amount);

        // Burn amount of backedTokenID_ in {AssetsAccountant}
        accountant.burn(msg.sender, backedTokenID_, amount);

        emit CoinPayback(msg.sender, backedTokenID_, amount);
    }

    /**
     * @dev Called to liquidate a user or publish margin call event.
     * @param userToLiquidate address to liquidate.
     * @param reserveAsset the reserve asset address user is using to back debt.
     */
    function liquidateUser(address userToLiquidate, address reserveAsset)
        external
    {
        // Get all the required inputs.
        IAssetsAccountantState accountant = IAssetsAccountantState(
            assetsAccountant
        );

        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(
            userToLiquidate,
            accountant.reservesIds(reserveAsset, backedAsset),
            getBackedTokenID(reserveAsset)
        );

        address hOfReserveAddr = accountant.houseOfReserves(
            accountant.reservesIds(reserveAsset, backedAsset)
        );
        IHouseOfReserve hOfReserve = IHouseOfReserve(hOfReserveAddr);

        IHouseOfReserve.Factor memory collatRatio = hOfReserve
            .collateralRatio();

        uint256 latestPrice = getLatestPrice(hOfReserveAddr);

        uint256 reserveAssetDecimals = IERC20Extension(reserveAsset).decimals();

        // Get health ratio
        uint256 healthRatio = _computeUserHealthRatio(
            reserveBal,
            mintedCoinBal,
            collatRatio,
            latestPrice
        );

        // User on marginCall
        if (healthRatio <= _liqParam.marginCallThreshold) {
            emit MarginCall(userToLiquidate, backedAsset, reserveAsset);
            // User at liquidation level
            if (healthRatio <= _liqParam.liquidationThreshold) {
                // check liquidator ERC20 approval
                (
                    uint256 costofLiquidation,
                    uint256 collatPenaltyBal
                ) = _computeCostOfLiquidation(
                        reserveBal,
                        latestPrice,
                        reserveAssetDecimals
                    );
                require(
                    IERC20Extension(backedAsset).allowance(
                        msg.sender,
                        address(this)
                    ) >= costofLiquidation,
                    "No allowance!"
                );

                _executeLiquidation(
                    userToLiquidate,
                    accountant.reservesIds(reserveAsset, backedAsset),
                    getBackedTokenID(reserveAsset),
                    costofLiquidation,
                    collatPenaltyBal
                );
            }
        } else {
            revert("Not liquidatable!");
        }
    }

    /**
     * @notice  Function to get the health ratio of user.
     * @param user address.
     * @param reserveAsset address being used as collateral.
     */
    function computeUserHealthRatio(address user, address reserveAsset)
        public
        view
        returns (uint256)
    {
        // Get all the required inputs.
        IAssetsAccountantState accountant = IAssetsAccountantState(
            assetsAccountant
        );
        uint256 reserveTokenID = accountant.reservesIds(
            reserveAsset,
            backedAsset
        );
        uint256 backedTokenID = getBackedTokenID(reserveAsset);

        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(
            user,
            reserveTokenID,
            backedTokenID
        );

        address hOfReserveAddr = accountant.houseOfReserves(reserveTokenID);
        IHouseOfReserve hOfReserve = IHouseOfReserve(hOfReserveAddr);

        IHouseOfReserve.Factor memory collatRatio = hOfReserve
            .collateralRatio();

        uint256 latestPrice = getLatestPrice(hOfReserveAddr);

        return
            _computeUserHealthRatio(
                reserveBal,
                mintedCoinBal,
                collatRatio,
                latestPrice
            );
    }

    /**
     * @notice  Function to get the theoretical cost of liquidating a user.
     * @param user address.
     * @param reserveAsset address being used as collateral.
     */
    function computeCostOfLiquidation(address user, address reserveAsset)
        public
        view
        returns (uint256 costAmount, uint256 collateralAtPenalty)
    {
        // Get all the required inputs.
        IAssetsAccountantState accountant = IAssetsAccountantState(
            assetsAccountant
        );
        uint256 reserveTokenID = accountant.reservesIds(
            reserveAsset,
            backedAsset
        );
        uint256 backedTokenID = getBackedTokenID(reserveAsset);

        (uint256 reserveBal, ) = _checkBalances(
            user,
            reserveTokenID,
            backedTokenID
        );
        if (reserveBal == 0) {
            revert HouseOfCoin_noBalances();
        }

        uint256 latestPrice = getLatestPrice(
            accountant.houseOfReserves(reserveTokenID)
        );

        uint256 reserveAssetDecimals = IERC20Extension(reserveAsset).decimals();

        (costAmount, collateralAtPenalty) = _computeCostOfLiquidation(
            reserveBal,
            latestPrice,
            reserveAssetDecimals
        );

        return (costAmount, collateralAtPenalty);
    }

    /**
     *
     * @dev  Get backedTokenID to be used in {AssetsAccountant}
     * @param reserveAsset_ ERC20 address of the reserve asset used to back coin.
     */
    function getBackedTokenID(address reserveAsset_)
        public
        view
        returns (uint256)
    {
        return
            uint256(
                keccak256(
                    abi.encodePacked(reserveAsset_, backedAsset, "backedAsset")
                )
            );
    }

    /**
     * @dev Returns the _liqParams as a struct
     */
    function getLiqParams() public view returns (LiquidationParameters memory) {
        return _liqParam;
    }

    /**
     * @dev Sets the liquidation parameters.
     * @param globalBase_ defines the base number of all liquidation parameters.
     * @param marginCallThreshold_ defines the health ratio at which margin call is triggered.
     * @param liquidationThreshold_ defines the health ratio at which liquidation can be triggered.
     * @param liquidationPricePenaltyDiscount_ price discount at which liquidated user collateral is sold.
     * @param collateralPenalty_ percent of liquidated user's reserves that are sold during a liquidation event.
     * Requirements:
     *  - function Should be admin restricted.
     *  - no inputs can be zero.
     *  - globalBase_ modulo 10 should be zero.
     *  - marginCallThreshold_  should be greater than liquidationThreshold_.
     *  - liquidationThreshold_ should be less than globalBase_.
     *  - liquidationPricePenaltyDiscount_ should be less than globalBase_.
     *  - collateralPenalty_ should be less than globalBase_.
     */
    function setLiqParams(
        uint256 globalBase_,
        uint256 marginCallThreshold_,
        uint256 liquidationThreshold_,
        uint256 liquidationPricePenaltyDiscount_,
        uint256 collateralPenalty_
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (
            globalBase_ == 0 ||
            marginCallThreshold_ == 0 ||
            liquidationThreshold_ == 0 ||
            liquidationPricePenaltyDiscount_ == 0 ||
            collateralPenalty_ == 0 ||
            globalBase_ % 10 != 0 ||
            liquidationThreshold_ >= marginCallThreshold_ ||
            liquidationThreshold_ >= globalBase_ ||
            liquidationPricePenaltyDiscount_ >= globalBase_ ||
            collateralPenalty_ >= globalBase_
        ) {
            revert HouseOfCoin_invalidInput();
        }
        _liqParam.globalBase = globalBase_;
        _liqParam.marginCallThreshold = marginCallThreshold_;
        _liqParam.liquidationThreshold = liquidationThreshold_;
        _liqParam
            .liquidationPricePenaltyDiscount = liquidationPricePenaltyDiscount_;
        _liqParam.collateralPenalty = collateralPenalty_;
        _transformToBackAssetDecimalBase();
        emit LiquidationParamsChanges(
            _liqParam.globalBase,
            _liqParam.marginCallThreshold,
            _liqParam.liquidationThreshold,
            _liqParam.liquidationPricePenaltyDiscount,
            _liqParam.collateralPenalty
        );
    }

    /**
     * @notice  External function that returns the amount of backed asset coins user can mint with unused reserve asset.
     * @param user to check minting power.
     * @param reserveAsset Address of reserve asset.
     */
    function checkRemainingMintingPower(address user, address reserveAsset)
        public
        view
        returns (uint256)
    {
        // Get all required inputs
        IAssetsAccountantState accountant = IAssetsAccountantState(
            assetsAccountant
        );

        uint256 reserveTokenID = accountant.reservesIds(
            reserveAsset,
            backedAsset
        );

        uint256 backedTokenID = getBackedTokenID(reserveAsset);

        address hOfReserveAddr = accountant.houseOfReserves(reserveTokenID);

        IHouseOfReserve hOfReserve = IHouseOfReserve(hOfReserveAddr);

        IHouseOfReserve.Factor memory collatRatio = hOfReserve
            .collateralRatio();

        uint256 latestPrice = getLatestPrice(hOfReserveAddr);

        return
            _checkRemainingMintingPower(
                user,
                reserveTokenID,
                backedTokenID,
                collatRatio,
                latestPrice
            );
    }

    /// Internal Functions

    /**
     * @dev  Internal function to query balances in {AssetsAccountant}
     */
    function _checkBalances(
        address user,
        uint256 reservesTokenID_,
        uint256 bAssetRTokenID_
    ) internal view returns (uint256 reserveBal, uint256 mintedCoinBal) {
        reserveBal = IERC1155(assetsAccountant).balanceOf(
            user,
            reservesTokenID_
        );
        mintedCoinBal = IERC1155(assetsAccountant).balanceOf(
            user,
            bAssetRTokenID_
        );
    }

    /**
     * @dev  Internal function to check user's remaining minting power.
     */
    function _checkRemainingMintingPower(
        address user,
        uint256 reserveTokenID,
        uint256 backedTokenID,
        IHouseOfReserve.Factor memory collatRatio,
        uint256 price
    ) internal view returns (uint256) {
        // Need balances for tokenIDs of both reserves and backed asset in {AssetsAccountant}
        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(
            user,
            reserveTokenID,
            backedTokenID
        );

        // Check if msg.sender has reserves
        if (reserveBal == 0) {
            // If msg.sender has NO reserves, minting power = 0.
            return 0;
        } else {
            // Check if user can mint more
            (
                bool canMintMore,
                uint256 remainingMintingPower
            ) = _checkIfUserCanMintMore(
                    reserveBal,
                    mintedCoinBal,
                    collatRatio,
                    price
                );
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
        uint256 mintedCoinBal,
        IHouseOfReserve.Factor memory collatRatio,
        uint256 price
    ) internal pure returns (bool canMintMore, uint256 remainingMintingPower) {
        uint256 reserveBalreducedByFactor = (reserveBal *
            collatRatio.denominator) / collatRatio.numerator;

        uint256 maxMintableAmount = (reserveBalreducedByFactor * price) / 1e8;

        canMintMore = mintedCoinBal > maxMintableAmount ? false : true;

        remainingMintingPower = canMintMore
            ? (maxMintableAmount - mintedCoinBal)
            : 0;
    }

    /**
     * @dev  Internal function that transforms _liqParams to backedAsset decimal base.
     */
    function _transformToBackAssetDecimalBase() internal {
        LiquidationParameters memory ltemp;

        ltemp.globalBase = 10**backedAssetDecimals;
        ltemp.marginCallThreshold =
            (_liqParam.marginCallThreshold * ltemp.globalBase) /
            _liqParam.globalBase;
        ltemp.liquidationThreshold =
            (_liqParam.liquidationThreshold * ltemp.globalBase) /
            _liqParam.globalBase;
        ltemp.liquidationPricePenaltyDiscount =
            (_liqParam.liquidationPricePenaltyDiscount * ltemp.globalBase) /
            _liqParam.globalBase;
        ltemp.collateralPenalty =
            (_liqParam.collateralPenalty * ltemp.globalBase) /
            _liqParam.globalBase;

        _liqParam = ltemp;
    }

    function _computeUserHealthRatio(
        uint256 reserveBal,
        uint256 mintedCoinBal,
        IHouseOfReserve.Factor memory collatRatio,
        uint256 price
    ) internal view returns (uint256 healthRatio) {
        if (mintedCoinBal == 0 || reserveBal == 0) {
            revert HouseOfCoin_noBalances();
        }
        // Check current maxMintableAmount with current price
        uint256 reserveBalreducedByFactor = (reserveBal *
            collatRatio.denominator) / collatRatio.numerator;

        uint256 maxMintableAmount = (reserveBalreducedByFactor * price) / 1e8;

        // Compute health ratio
        healthRatio =
            (maxMintableAmount * _liqParam.globalBase) /
            mintedCoinBal;
    }

    function _computeCostOfLiquidation(
        uint256 reserveBal,
        uint256 price,
        uint256 reserveAssetDecimals
    )
        internal
        view
        returns (uint256 costofLiquidation, uint256 collatPenaltyBal)
    {
        uint256 discount = _liqParam.globalBase -
            _liqParam.liquidationPricePenaltyDiscount;
        uint256 liqDiscountedPrice = (price * discount) / _liqParam.globalBase;

        collatPenaltyBal =
            (reserveBal * _liqParam.collateralPenalty) /
            _liqParam.globalBase;

        uint256 amountTemp = (collatPenaltyBal * liqDiscountedPrice) / 10**8;

        uint256 decimalDiff;

        if (reserveAssetDecimals > backedAssetDecimals) {
            decimalDiff = reserveAssetDecimals - backedAssetDecimals;
            amountTemp = amountTemp / 10**decimalDiff;
        } else {
            decimalDiff = backedAssetDecimals - reserveAssetDecimals;
            amountTemp = amountTemp * 10**decimalDiff;
        }

        costofLiquidation = amountTemp;
    }

    function _executeLiquidation(
        address user,
        uint256 reserveTokenID,
        uint256 backedTokenID,
        uint256 costofLiquidation,
        uint256 collatPenaltyBal
    ) internal {
        // Transfer of Assets.

        // BackedAsset to this contract.
        IERC20Extension(backedAsset).transferFrom(
            msg.sender,
            address(this),
            costofLiquidation
        );
        // Penalty collateral from liquidated user to liquidator.
        IAssetsAccountant accountant = IAssetsAccountant(assetsAccountant);
        accountant.safeTransferFrom(
            user,
            msg.sender,
            reserveTokenID,
            collatPenaltyBal,
            ""
        );

        // Burning tokens and debt.
        // Burn 'costofLiquidation' debt amount from liquidated user in {AssetsAccountant}
        accountant.burn(user, backedTokenID, costofLiquidation);

        // Burn the received backedAsset tokens.
        IERC20Extension bAsset = IERC20Extension(backedAsset);
        bAsset.burn(address(this), costofLiquidation);

        // Emit event
        emit Liquidation(user, msg.sender, collatPenaltyBal, costofLiquidation);
    }
}
