// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
 * @title The house of reserves contract.
 * @author daigaro.eth
 * @notice Custodies all deposits, to allow minting of the backedAsset.
 * @notice Users can only deposit and withdraw from this contract.
 * @dev  Contracts are split into state and functionality.
 * @dev A HouseOfReserve is required to back a specific backedAsset.
 */

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IAssetsAccountant.sol";
import "./abstract/OracleHouse.sol";

contract HouseOfReserveState {
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
     * @dev Emit when user DEFAULT_ADMIN changes the collateralization factor of this HouseOfReserve
     * @param newFactor New struct indicating the factor values.
     */
    event CollateralRatioChanged(Factor newFactor);
    /**
     * @dev Emit when user DEFAULT_ADMIN changes the 'depositLimit' of HouseOfReserve
     * @param newLimit uint256
     */
    event DepositLimitChanged(uint256 newLimit);

    struct Factor {
        uint256 numerator;
        uint256 denominator;
    }

    address public WETH;

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
     * @param _reserveAsset ERC20 address of reserve asset handled in this contract.
     * @param _backedAsset ERC20 address of the asset type of coin that can be backed with this reserves.
     * @param _assetsAccountant Address of the {AssetsAccountant} contract.
     */
    function initialize(
        address _reserveAsset,
        address _backedAsset,
        address _assetsAccountant,
        string memory tickerUsdFiat_,
        string memory tickerReserveAsset_,
        address _WETH
    ) public initializer {
        reserveAsset = _reserveAsset;
        backedAsset = _backedAsset;
        WETH = _WETH;
        reserveTokenID = uint256(
            keccak256(abi.encodePacked(reserveAsset, backedAsset, "collateral"))
        );
        backedTokenID = uint256(
            keccak256(
                abi.encodePacked(reserveAsset, backedAsset, "backedAsset")
            )
        );
        collateralRatio.numerator = 150;
        collateralRatio.denominator = 100;
        assetsAccountant = IAssetsAccountant(_assetsAccountant);
        _oracleHouse_init();
        _setTickers(tickerUsdFiat_, tickerReserveAsset_);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /** see {OracleHouse-activeOracle}*/
    function activeOracle() external override view returns (uint256) {
        return _activeOracle;
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
        require(amount > 0, "Zero input amount!");

        // Check ERC20 approval of msg.sender.
        require(
            IERC20(reserveAsset).allowance(msg.sender, address(this)) >= amount,
            "Not enough ERC20 allowance!"
        );
        // Check that deposit limit for this reserve has not been reached.
        require(
            amount + totalDeposits <= depositLimit,
            "Deposit limit reached!"
        );

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
        require(
            numerator > 0 && denominator > 0 && numerator > denominator,
            "Invalid inputs!"
        );

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
        require(newLimit > 0, "Invalid inputs!");
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

        // Validate user has reserveBal, and input amount is greater than zero, and less than msg.sender reserves deposits.
        require(
            reserveBal > 0 && amount > 0 && amount <= reserveBal,
            "Invalid input amount!"
        );

        // Get max withdrawal amount
        uint256 maxWithdrawal = _checkMaxWithdrawal(
            reserveBal,
            mintedCoinBal,
            price
        );

        // Check maxWithdrawal is greater than or equal to the withdraw amount.
        require(maxWithdrawal >= amount, "Invalid input amount!");

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
        uint256 _reserveBal,
        uint256 _mintedCoinBal,
        uint256 price
    ) internal view returns (uint256) {
        // Check if msg.sender has minted backedAsset, if yes compute:
        // The minimum required balance to back 100% all minted coins of backedAsset.
        // Else, return 0.
        uint256 minReqReserveBal = _mintedCoinBal > 0
            ? (_mintedCoinBal * 1e8) / price
            : 0;

        // Apply Collateralization Factors to MinReqReserveBal
        minReqReserveBal =
            (minReqReserveBal * collateralRatio.numerator) /
            collateralRatio.denominator;

        if (minReqReserveBal > _reserveBal) {
            // Return zero if undercollateralized or insolvent
            return 0;
        } else if (minReqReserveBal > 0 && minReqReserveBal <= _reserveBal) {
            // Return the max withrawal amount, if msg.sender has mintedCoin balance and in healthy collateralized
            return (_reserveBal - minReqReserveBal);
        } else {
            // Return _reserveBal if msg.sender has no minted coin.
            return _reserveBal;
        }
    }

    /**
     * @dev  Internal function to query balances in {AssetsAccountant}
     */
    function _checkBalances(
        address user,
        uint256 _reservesTokenID,
        uint256 _bAssetRTokenID
    ) internal view returns (uint256 reserveBal, uint256 mintedCoinBal) {
        reserveBal = IERC1155(address(assetsAccountant)).balanceOf(
            user,
            _reservesTokenID
        );
        mintedCoinBal = IERC1155(address(assetsAccountant)).balanceOf(
            user,
            _bAssetRTokenID
        );
    }

    /**
     * @dev  Handle direct sending of native-token.
     */
    receive() external payable {
        uint256 preBalance = IERC20(WETH).balanceOf(address(this));
        if (reserveAsset == WETH) {
            // Check that deposit limit for this reserve has not been reached.
            require(
                msg.value + totalDeposits <= depositLimit,
                "Deposit limit reached!"
            );
            IWETH(WETH).deposit{value: msg.value}();
            require(
                IERC20(WETH).balanceOf(address(this)) == preBalance + msg.value,
                "deposit failed!"
            );
            _deposit(msg.sender, msg.value);
        } else {
            revert("Wrong reserveAsset!");
        }
    }
}
