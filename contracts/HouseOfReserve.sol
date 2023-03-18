// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title The house of reserves contract.
 * @author xocolatl.eth
 * @notice Custodies all deposits, to allow minting of the backedAsset.
 * @notice Users can only deposit and withdraw from this contract.
 * @dev  Contracts are split into state and functionality.
 * @dev A HouseOfReserve is required to back a specific backedAsset.
 */

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20Extension} from "./interfaces/IERC20Extension.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IWETH} from "./interfaces/IWETH.sol";
import {IAssetsAccountant} from "./interfaces/IAssetsAccountant.sol";
import {OracleHouse} from "./abstract/OracleHouse.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract HouseOfReserveState {
    address public WRAPPED_NATIVE;

    address public reserveAsset;

    address public backedAsset;

    uint256 public reserveTokenID;

    uint256 public backedTokenID;

    // A factor through these contracts refer to a fixed-digit decimal number.
    // Specifically, a decimal number scaled by 1e18. These numbers should be
    // treated as real numbers scaled down by 1e18.
    // For example, the number 50% would be represented as 5*1e17.
    uint256 public maxLTVFactor;

    uint256 public liquidationFactor;

    uint256 public totalDeposits;

    uint256 public depositLimit;

    IAssetsAccountant public assetsAccountant;

    bytes32 public constant HOUSE_TYPE = keccak256("RESERVE_HOUSE");
}

contract HouseOfReserve is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    OracleHouse,
    HouseOfReserveState
{
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
     * @dev Emit when user DEFAULT_ADMIN changes the max Loan-To-Value factor of this HouseOfReserve.
     * @param newMaxLTV factor
     */
    event MaxLTVChanged(uint256 newMaxLTV);

    /**
     * @dev Emit when user DEFAULT_ADMIN changes the liquidation factor of this HouseOfReserve.
     * @param newLiqudation factor.
     */
    event LiquidationFactorChanged(uint256 newLiqudation);

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

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

        if(IERC20Extension(reserveAsset_).decimals() > 18) {
            revert HouseOfReserve_wrongReserveAsset();
        }

        maxLTVFactor = 0.85e18;
        liquidationFactor = 0.9e18;
        assetsAccountant = IAssetsAccountant(assetsAccountant_);

        _oracleHouse_init();
        _setTickers(tickerUsdFiat_, tickerReserveAsset_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        __AccessControl_init();
        __UUPSUpgradeable_init();

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
            amount > IERC20Extension(reserveAsset).allowance(msg.sender, address(this))
        ) {
            revert HouseOfReserve_notEnoughERC20Allowance();
        }
        // Check that deposit limit for this reserve has not been reached.
        if (amount + totalDeposits > depositLimit) {
            revert HouseOfReserve_depositLimitReached();
        }

        // Transfer reserveAsset amount to this contract.
        IERC20Extension(reserveAsset).transferFrom(msg.sender, address(this), amount);

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
     * @notice Function to set the max loan to value factor of this contract.
     * @dev `maxLTVFactor_` should be less than 1e18.
     * @param maxLTVFactor_ of new collateralization factor.
     * Emits a {maxLTVChanged} event.
     */
    function setMaxLTVFactor(uint256 maxLTVFactor_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // Check inputs
        if (maxLTVFactor_ == 0 || maxLTVFactor_ >= 1e18) {
            revert HouseOfReserve_invalidInput();
        }

        // Set new max loan to value
        maxLTVFactor = maxLTVFactor_;

        // Emit event
        emit MaxLTVChanged(maxLTVFactor_);
    }

    /**
     * @notice Function to set the liquidation factor of this contract.
     * @dev `liquidationFactor_` should be less than 1e18.
     * @param liquidationFactor_ of new collateralization factor.
     * Emits a {maxLTVChanged} event.
     */
    function setLiquidationFactor(uint256 liquidationFactor_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // Check inputs
        if (liquidationFactor_ == 0 || liquidationFactor_ > 1e18) {
            revert HouseOfReserve_invalidInput();
        }

        // Set new liquidation factor
        liquidationFactor = liquidationFactor_;

        // Emit event
        emit LiquidationFactorChanged(liquidationFactor_);
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

        // decrease totalDeposits
        totalDeposits -= amount;

        // Transfer Asset to msg.sender
        IERC20Extension(reserveAsset).transfer(msg.sender, amount);

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

        uint256 backedAssetDecimals = IERC20Extension(backedAsset).decimals();
        uint256 reserveDecimals = IERC20Extension(reserveAsset).decimals();

        uint256 decimalDiff = backedAssetDecimals >= reserveDecimals
            ? backedAssetDecimals - reserveDecimals
            : 0;

        uint256 minReqReserveBal = mintedCoinBal_ > 0
            ? (mintedCoinBal_ * 1e8) / (price * 10 ** (decimalDiff))
            : 0;

        // Apply max Loan-To-Value Factors to MinReqReserveBal
        minReqReserveBal = (minReqReserveBal * 1e18) / maxLTVFactor;

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
        reserveBal = assetsAccountant.balanceOf(
            user,
            reservesTokenID_
        );
        mintedCoinBal = assetsAccountant.balanceOf(
            user,
            bAssetRTokenID_
        );
    }

    /**
     * @dev  Handle direct sending of native-token.
     */
    receive() external payable {
        uint256 preBalance = IERC20Extension(WRAPPED_NATIVE).balanceOf(address(this));
        if (reserveAsset == WRAPPED_NATIVE) {
            // Check that deposit limit for this reserve has not been reached.
            if (msg.value + totalDeposits > depositLimit) {
                revert HouseOfReserve_depositLimitReached();
            }
            IWETH(WRAPPED_NATIVE).deposit{value: msg.value}();
            // Check WRAPPED_NATIVE amount was received.
            if (
                IERC20Extension(WRAPPED_NATIVE).balanceOf(address(this)) !=
                preBalance + msg.value
            ) {
                revert HouseOfReserve_depositFailed();
            }
            _deposit(msg.sender, msg.value);
        } else {
            revert HouseOfReserve_wrongReserveAsset();
        }
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
