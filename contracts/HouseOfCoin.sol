// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

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
import "./interfaces/IAssetsAccountantState.Sol";
import "./interfaces/IHouseOfReserveState.sol";
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
        uint256 collateralAmount
    );

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
     * @param _backedAsset ERC20 address of the asset type of coin to be minted in this contract.
     * @param _assetsAccountant Address of the {AssetsAccountant} contract.
     */
    function initialize(address _backedAsset, address _assetsAccountant)
        public
        initializer
    {
        backedAsset = _backedAsset;
        backedAssetDecimals = IERC20Extension(backedAsset).decimals();
        assetsAccountant = _assetsAccountant;

        // Defines all LiquidationParameters as base 100 decimal numbers.
        _liqParam.globalBase = 100;
        // Margin call when health ratio = 1 or below. This means maxMintPower = mintedDebt, accounting the collateralization factors.
        _liqParam.marginCallThreshold = 100;
        // Liquidation starts health ratio = 0.95 or below.
        _liqParam.liquidationThreshold = 95;
        // User's unhealthy position sells collateral at penalty discount of 10%, bring them back to a good HealthRatio.
        _liqParam.liquidationPricePenaltyDiscount = 10;
        // Percentage amount of unhealthy user's collateral that will be sold to bring user's to good HealthRatio.
        _liqParam.collateralPenalty = 75;

        // Internal function that will transform _liqParam, compatible with backedAsset decimals
        _transformToBackAssetDecimalBase();

        _oracleHouse_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /** @dev See {OracleHouse-activeOracle}. */
    function activeOracle() external pure override returns (uint256) {
        revert("N/A to HouseOfCoin");
    }

    /** @dev See {OracleHouse-setActiveOracle} */
    function setActiveOracle(OracleIds) external pure override {
        revert("N/A to HouseOfCoin");
    }

    /** @dev See {OracleHouse-setTickers} */
    function setTickers(string memory, string memory) external pure override {
        revert("N/A to HouseOfCoin");
    }

    /** @dev See {OracleHouse-getRedstoneData} */
    function getRedstoneData()
        external
        override
        pure
        returns (
            bytes32,
            bytes32,
            bytes32[] memory,
            address
        )
    {
        revert("N/A to HouseOfCoin");
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

    /** @dev See {OracleHouse-getChainlinkData} */
    function getChainlinkData()
        external
        pure
        override
        returns (address, address)
    {
        revert("N/A to HouseOfCoin");
    }

    /** @dev See {OracleHouse-setChainlinkAddrs} */
    function setChainlinkAddrs(address, address) external pure override {
        revert("N/A to HouseOfCoin");
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
        IHouseOfReserveState hOfReserve = IHouseOfReserveState(hOfReserve_);
        uint256 activeOracle_ = hOfReserve.activeOracle();
        if (activeOracle_ == 0) {
            (, , bytes32[] memory tickers_, ) = hOfReserve.getRedstoneData();
            price = _getLatestPriceRedstone(tickers_);
        } else if (activeOracle_ == 1) {
            price = _getLatestPriceUMA();
        } else if (activeOracle_ == 2) {
            (address addrUsdFiat_, address addrReserveAsset_) = hOfReserve
                .getChainlinkData();
            price = _getLatestPriceChainlink(IAggregatorV3(addrUsdFiat_), IAggregatorV3(addrReserveAsset_));
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
        IHouseOfReserveState hOfReserve = IHouseOfReserveState(houseOfReserve);
        IERC20Extension bAsset = IERC20Extension(backedAsset);

        uint256 reserveTokenID = hOfReserve.reserveTokenID();
        uint256 backedTokenID = getBackedTokenID(reserveAsset);

        // Validate reserveAsset is active with {AssetsAccountant} and check houseOfReserve inputs.
        require(
            IAssetsAccountantState(assetsAccountant).houseOfReserves(
                reserveTokenID
            ) !=
                address(0) &&
                hOfReserve.reserveAsset() == reserveAsset,
            "Not valid reserveAsset!"
        );

        // Validate this HouseOfCoin is active with {AssetsAccountant} and can mint backedAsset.
        require(
            bAsset.hasRole(keccak256("MINTER_ROLE"), address(this)),
            "Not Authorized!"
        );

        // Get inputs for checking minting power, collateralization factor and oracle price
        IHouseOfReserveState.Factor memory collatRatio = hOfReserve
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
        require(
            mintingPower > 0 && mintingPower >= amount,
            "No reserves to mint amount!"
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
        success = true;
    }

    /**
     * @notice  Function to payback ERC20 'backedAsset' of this HouseOfCoin.
     * @dev Requires knowledge of the reserve asset used to back the minted coins.
     * @param _backedTokenID Token Id in {AssetsAccountant}, releases the reserve asset used in 'getTokenID'.
     * @param amount To payback.
     * Emits a {CoinPayback} event.
     */
    function paybackCoin(uint256 _backedTokenID, uint256 amount) public {
        IAssetsAccountant accountant = IAssetsAccountant(assetsAccountant);
        IERC20Extension bAsset = IERC20Extension(backedAsset);

        uint256 userTokenIDBal = accountant.balanceOf(
            msg.sender,
            _backedTokenID
        );

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
        require(mintedCoinBal > 0 && reserveBal > 0, "No balance!");

        address hOfReserveAddr = accountant.houseOfReserves(
            accountant.reservesIds(reserveAsset, backedAsset)
        );
        IHouseOfReserveState hOfReserve = IHouseOfReserveState(hOfReserveAddr);

        IHouseOfReserveState.Factor memory collatRatio = hOfReserve
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
        require(mintedCoinBal > 0 && reserveBal > 0, "No balance!");

        address hOfReserveAddr = accountant.houseOfReserves(reserveTokenID);
        IHouseOfReserveState hOfReserve = IHouseOfReserveState(hOfReserveAddr);

        IHouseOfReserveState.Factor memory collatRatio = hOfReserve
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

        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(
            user,
            reserveTokenID,
            backedTokenID
        );

        require(mintedCoinBal > 0 && reserveBal > 0, "No balance!");

        uint256 latestPrice = getLatestPrice(accountant.houseOfReserves(reserveTokenID));

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
     * @param _reserveAsset ERC20 address of the reserve asset used to back coin.
     */
    function getBackedTokenID(address _reserveAsset)
        public
        view
        returns (uint256)
    {
        return
            uint256(
                keccak256(
                    abi.encodePacked(_reserveAsset, backedAsset, "backedAsset")
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

        IHouseOfReserveState hOfReserve = IHouseOfReserveState(hOfReserveAddr);

        IHouseOfReserveState.Factor memory collatRatio = hOfReserve
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
        uint256 _reservesTokenID,
        uint256 _bAssetRTokenID
    ) internal view returns (uint256 reserveBal, uint256 mintedCoinBal) {
        reserveBal = IERC1155(assetsAccountant).balanceOf(
            user,
            _reservesTokenID
        );
        mintedCoinBal = IERC1155(assetsAccountant).balanceOf(
            user,
            _bAssetRTokenID
        );
    }

    /**
     * @dev  Internal function to check user's remaining minting power.
     */
    function _checkRemainingMintingPower(
        address user,
        uint256 reserveTokenID,
        uint256 backedTokenID,
        IHouseOfReserveState.Factor memory collatRatio,
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
        IHouseOfReserveState.Factor memory collatRatio,
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
        require(backedAssetDecimals > 0, "No backedAsset decimals!");
        require(
            _liqParam.globalBase > 0 &&
                _liqParam.marginCallThreshold > 0 &&
                _liqParam.liquidationThreshold > 0 &&
                _liqParam.liquidationPricePenaltyDiscount > 0 &&
                _liqParam.collateralPenalty > 0,
            "Empty _liqParam!"
        );

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
        IHouseOfReserveState.Factor memory collatRatio,
        uint256 price
    ) internal view returns (uint256 healthRatio) {
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
        emit Liquidation(user, msg.sender, collatPenaltyBal);
    }
}
