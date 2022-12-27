// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

/**
 * @title The house of reserves contract.
 * @author xocolatl.eth
 * @notice Custodies all deposits, to allow minting of the backedAsset.
 * @notice Users can only deposit and withdraw from this contract.
 * @dev  Contracts are split into state and functionality.
 * @dev A HouseOfReserve is required to back a specific backedAsset.
 */

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IWETH} from "./interfaces/IWETH.sol";
import {IAssetsAccountant} from "./interfaces/IAssetsAccountant.sol";
import {OracleHouse} from "./abstract/OracleHouse.sol";

contract HouseOfReserveState {
    struct Factor {
        uint256 numerator;
        uint256 denominator;
    }

    // HouseOfReserve Events

    /**
     * @dev Emit when user makes an asset deposit in this contract.
     * @param user Address of depositor.
     * @param asset ERC20 address of the reserve asset.
     * @param amount deposited.
     */
    event UserDeposit(
        address indexed user,
        address indexed asset,
        uint256 amount
    );
    /**
     * @dev Emit when user makes an asset withdrawal from this HouseOfReserve
     * @param user Address of user withdrawing.
     * @param asset ERC20 address of the reserve asset.
     * @param amount withraw.
     */
    event UserWithdraw(
        address indexed user,
        address indexed asset,
        uint256 amount
    );
    /**
     * @dev Emit during initialization
     * @param TokenID_ number of `reserveTokenID` used in `assetsAccountant`.
     */
    event ReserveTokenIdSet(uint256 TokenID_);
    /**
     * @dev Emit during initialization
     * @param TokenID_ number of `backedTokenID` used in `assetsAccountant`.
     */
    event BackedTokenIdSet(uint256 TokenID_);

    /**
     * @dev Emit when user DEFAULT_ADMIN changes the collateralization factor of this HouseOfReserve
     * @param newFactor New struct indicating the factor values.
     */
    event CollateralRatioChanged(Factor newFactor);
    /**
     * @dev Emit when user DEFAULT_ADMIN changes the 'depositLimit' of HouseOfReserve
     * @param newLimit uint256
     */
    event DepositLimitChanged(uint256 newLimit);
    /**
     * @dev Emit when `assetsAccountant` changes.
     * @param newAccountant address.
     */
    event AssetsAccountantChanged(address newAccountant);

    /// Custom errors
    error HouseOfReserve_invalidInput();
    error HouseOfReserve_notEnoughERC20Allowance();
    error HouseOfReserve_depositLimitReached();
    error HouseOfReserve_invalidWithdrawMoreThanMax();
    error HouseOfReserve_wrongReserveAsset();
    error HouseOfReserve_depositFailed();

    address public WRAPPED_NATIVE;

    address public reserveAsset;

    address public backedAsset;

    uint256 public reserveTokenID;

    uint256 public backedTokenID;

    Factor public collateralRatio;

    uint256 public totalDeposits;

    uint256 public depositLimit;

    IAssetsAccountant public assetsAccountant;

    bytes32 public constant HOUSE_TYPE = keccak256("RESERVE_HOUSE");
}

contract HouseOfReserve is
    Initializable,
    AccessControl,
    OracleHouse,
    HouseOfReserveState
{
    /**
     * @dev Initializes this contract by setting:
     * @param reserveAsset_ ERC20 address of reserve asset handled in this contract.
     * @param backedAsset_ ERC20 address of the asset type of coin that can be backed with this reserves.
     * @param assetsAccountant_ Address of the {AssetsAccountant} contract.
     * @param tickerUsdFiat_ used in Redstone oracle
     * @param tickerReserveAsset_ used in Redstone oracle
     * @param wrappedNative address (WETH equivalent)
     */
    function initialize(
        address reserveAsset_,
        address backedAsset_,
        address assetsAccountant_,
        string memory tickerUsdFiat_,
        string memory tickerReserveAsset_,
        address wrappedNative
    ) public initializer {
        if (
            reserveAsset_ == address(0) ||
            backedAsset_ == address(0) ||
            assetsAccountant_ == address(0)
        ) {
            revert HouseOfReserve_invalidInput();
        }
        reserveAsset = reserveAsset_;
        backedAsset = backedAsset_;
        WRAPPED_NATIVE = wrappedNative; // WETH

        collateralRatio.numerator = 150;
        collateralRatio.denominator = 100;
        assetsAccountant = IAssetsAccountant(assetsAccountant_);

        _oracleHouse_init();
        _setTickers(tickerUsdFiat_, tickerReserveAsset_);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        reserveTokenID = uint256(
            keccak256(
                abi.encodePacked(
                    reserveAsset,
                    backedAsset,
                    "collateral",
                    block.number
                )
            )
        );
        emit ReserveTokenIdSet(reserveTokenID);

        backedTokenID = uint256(
            keccak256(
                abi.encodePacked(reserveTokenID, backedAsset, "backedAsset")
            )
        );
        emit BackedTokenIdSet(backedTokenID);
    }

    /** see {OracleHouse-activeOracle}*/
    function activeOracle() external view override returns (uint256) {
        return _activeOracle;
    }

    /**
     * @notice Sets the `assetsAccountant` for this HouseOfReserve.
     * @dev restricted to admin only.
     * Emits a
     */
    function setAssetsAccountant(address accountant)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (accountant == address(0)) {
            revert HouseOfReserve_invalidInput();
        }
        assetsAccountant = IAssetsAccountant(accountant);
        emit AssetsAccountantChanged(accountant);
    }

    /**
     * @notice  See '_setActiveOracle()' in {OracleHouse}.
     * @dev restricted to admin only.
     */
    function setActiveOracle(OracleIds id_)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setActiveOracle(id_);
    }

    /**
     * @notice  See '_setTickers()' in {OracleHouse}.
     * @dev restricted to admin only.
     */
    function setTickers(
        string memory tickerUsdFiat_,
        string memory tickerReserveAsset_
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTickers(tickerUsdFiat_, tickerReserveAsset_);
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
     * @dev  Restricted to admin only.
     */
    function setUMAOracleHelper(address newAddress)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setUMAOracleHelper(newAddress);
    }

    /**
     * @notice  See '_setChainlinkAddrs()' in {OracleHouse}
     * @dev  Restricted to admin only.
     */
    function setChainlinkAddrs(address addrUsdFiat_, address addrReserveAsset_)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setChainlinkAddrs(addrUsdFiat_, addrReserveAsset_);
    }

    /**
     * @dev Call latest price according to activeOracle
     * @dev See _getLatestPrice() in {OracleHouse}.
     * @dev override _getLatestPrice() as required.
     */
    function getLatestPrice() public view returns (uint256 price) {
        price = _getLatestPrice(address(0));
    }

    /**
     * @notice Function to deposit reserves in this contract.
     * @notice DO NOT!! send direct ERC20 transfers to this contract.
     * @dev Requires user's ERC20 approval prior to calling.
     * @param amount To deposit.
     * Emits a {UserDeposit} event.
     */
    function deposit(uint256 amount) public {
        // Validate input amount.
        if (amount == 0) {
            revert HouseOfReserve_invalidInput();
        }

        // Check ERC20 approval of msg.sender.
        if (
            amount > IERC20(reserveAsset).allowance(msg.sender, address(this))
        ) {
            revert HouseOfReserve_notEnoughERC20Allowance();
        }
        // Check that deposit limit for this reserve has not been reached.
        if (amount + totalDeposits > depositLimit) {
            revert HouseOfReserve_depositLimitReached();
        }

        // Transfer reserveAsset amount to this contract.
        IERC20(reserveAsset).transferFrom(msg.sender, address(this), amount);

        // Continue deposit in internal function
        _deposit(msg.sender, amount);
    }

    /**
     * @notice Function to withdraw reserves in this contract.
     * @dev Function checks if user can withdraw specified amount.
     * @param amount To withdraw.
     * Emits a {UserWitdhraw} event.
     */
    function withdraw(uint256 amount) public {
        uint256 price = getLatestPrice();
        _withdraw(amount, price);
    }

    /**
     * @notice Function to set the collateralization ration of this contract.
     * @dev Numerator and denominator should be > 0, and numerator > denominator
     * @param numerator of new collateralization factor.
     * @param denominator of new collateralization factor.
     * Emits a {CollateralRatioChanged} event.
     */
    function setCollateralRatio(uint256 numerator, uint256 denominator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // Check inputs
        if (numerator == 0 || denominator == 0 || denominator > numerator) {
            revert HouseOfReserve_invalidInput();
        }

        // Set new collateralization ratio
        collateralRatio.numerator = numerator;
        collateralRatio.denominator = denominator;

        // Emit event
        emit CollateralRatioChanged(collateralRatio);
    }

    /**
     * @notice Function to set the limit of deposits in this HouseOfReserve.
     * @param newLimit uint256, must be greater than zero.
     * Emits a {DepositLimitChanged} event.
     */
    function setDepositLimit(uint256 newLimit)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // Check `newLimit` is not zero
        if (newLimit == 0) {
            revert HouseOfReserve_invalidInput();
        }
        depositLimit = newLimit;
        emit DepositLimitChanged(newLimit);
    }

    /**
     * @notice Function to calculate the max reserves user can withdraw from contract.
     * @param user Address to check.
     */
    function checkMaxWithdrawal(address user)
        external
        view
        returns (uint256 max)
    {
        if (user == address(0)) {
            revert HouseOfReserve_invalidInput();
        }
        uint256 price = getLatestPrice();
        // Need balances for tokenIDs of both reserves and backed asset in {AssetsAccountant}
        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(
            user,
            reserveTokenID,
            backedTokenID
        );
        max = reserveBal == 0
            ? 0
            : _checkMaxWithdrawal(reserveBal, mintedCoinBal, price);
    }

    /**
     * @dev  Internal function to withdrawal an amount given oracle price.
     */
    function _withdraw(uint256 amount, uint256 price) internal {
        // Need balances for tokenIDs of both reserves and backed asset in {AssetsAccountant}
        (uint256 reserveBal, uint256 mintedCoinBal) = _checkBalances(
            msg.sender,
            reserveTokenID,
            backedTokenID
        );

        // Validate user has reserveBal, and input `amount` is not zero, and
        // intended withdraw `amount` is less than msg.sender deposits.
        if (reserveBal == 0 || amount == 0 || amount > reserveBal) {
            revert HouseOfReserve_invalidInput();
        }

        // Get max withdrawal amount
        uint256 maxWithdrawal = _checkMaxWithdrawal(
            reserveBal,
            mintedCoinBal,
            price
        );

        // Check intended withdraw `amount` is less than user's maxWithdrawal.
        if (amount > maxWithdrawal) {
            revert HouseOfReserve_invalidWithdrawMoreThanMax();
        }

        // Burn at AssetAccountant withdrawal amount.
        assetsAccountant.burn(msg.sender, reserveTokenID, amount);

        // Transfer Asset to msg.sender
        IERC20(reserveAsset).transfer(msg.sender, amount);

        // Emit withdraw event.
        emit UserWithdraw(msg.sender, reserveAsset, amount);
    }

    // Internal Functions

    /**
     * @dev Internal function that completes the 'deposit' function.
     */
    function _deposit(address user, uint256 amount) internal {
        // Mint in AssetsAccountant received amount.
        assetsAccountant.mint(user, reserveTokenID, amount, "");

        // Increase totalDeposits
        totalDeposits += amount;

        // Emit deposit event.
        emit UserDeposit(user, reserveAsset, amount);
    }

    /**
     * @dev  Internal function to check max withdrawal amount.
     */
    function _checkMaxWithdrawal(
        uint256 reserveBal_,
        uint256 mintedCoinBal_,
        uint256 price
    ) internal view returns (uint256) {
        // Check if msg.sender has minted backedAsset, if yes compute:
        // The minimum required balance to back 100% all minted coins of backedAsset.
        // Else, return 0.
        uint256 minReqReserveBal = mintedCoinBal_ > 0
            ? (mintedCoinBal_ * 1e8) / price
            : 0;

        // Apply Collateralization Factors to MinReqReserveBal
        minReqReserveBal =
            (minReqReserveBal * collateralRatio.numerator) /
            collateralRatio.denominator;

        if (minReqReserveBal > reserveBal_) {
            // Return zero if undercollateralized or insolvent
            return 0;
        } else if (minReqReserveBal > 0 && minReqReserveBal <= reserveBal_) {
            // Return the max withrawal amount, if msg.sender has mintedCoin balance and in healthy collateralized
            return (reserveBal_ - minReqReserveBal);
        } else {
            // Return reserveBal_ if msg.sender has no minted coin.
            return reserveBal_;
        }
    }

    /**
     * @dev  Internal function to query balances in {AssetsAccountant}
     */
    function _checkBalances(
        address user,
        uint256 reservesTokenID_,
        uint256 bAssetRTokenID_
    ) internal view returns (uint256 reserveBal, uint256 mintedCoinBal) {
        reserveBal = IERC1155(address(assetsAccountant)).balanceOf(
            user,
            reservesTokenID_
        );
        mintedCoinBal = IERC1155(address(assetsAccountant)).balanceOf(
            user,
            bAssetRTokenID_
        );
    }

    /**
     * @dev  Handle direct sending of native-token.
     */
    receive() external payable {
        uint256 preBalance = IERC20(WRAPPED_NATIVE).balanceOf(address(this));
        if (reserveAsset == WRAPPED_NATIVE) {
            // Check that deposit limit for this reserve has not been reached.
            if (msg.value + totalDeposits > depositLimit) {
                revert HouseOfReserve_depositLimitReached();
            }
            IWETH(WRAPPED_NATIVE).deposit{value: msg.value}();
            // Check WRAPPED_NATIVE amount was received.
            if (
                IERC20(WRAPPED_NATIVE).balanceOf(address(this)) !=
                preBalance + msg.value
            ) {
                revert HouseOfReserve_depositFailed();
            }
            _deposit(msg.sender, msg.value);
        } else {
            revert HouseOfReserve_wrongReserveAsset();
        }
    }
}
