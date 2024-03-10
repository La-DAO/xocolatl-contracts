// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title Assets accountant contract.
 * @author xocolatl.eth
 * @notice Keeps records of all deposits, withdrawals, and minted assets by users using ERC1155 tokens.
 * @dev Contracts are split into state and functionality.
 * @dev At time of deployment, deployer is DEFAULT_ADMIN, however, this role should be transferred to a governance system.
 * @dev Users do not interact directly with this contract.
 */
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IHouseOfReserve} from "./interfaces/IHouseOfReserve.sol";
import {IHouseOfCoin} from "./interfaces/IHouseOfCoin.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AssetsAccountantState {
    // reserveTokenID => houseOfReserve
    mapping(uint256 => address) public houseOfReserves;

    // reserveAsset => backAsset => array of reserveTokenID
    mapping(address => mapping(address => uint256[])) internal _reservesIds;

    // backedAsset  => houseOfCoin
    mapping(address => address) public houseOfCoins;

    mapping(address => bool) public isARegisteredHouse;

    // Contract Token name
    string internal constant NAME = "AssetsAccountant";

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
}

contract AssetsAccountant is
    Initializable,
    AccessControlUpgradeable,
    AssetsAccountantState,
    ERC1155Upgradeable,
    ERC1155SupplyUpgradeable,
    UUPSUpgradeable
{
    // AssetsAccountant Events

    /**
     * @dev Emit when a HouseOfReserve is registered with AssetsAccountant
     * @param house Address of house registered.
     * @param typeOfHouse Either HouseOfReserve or HouseOfCoin.
     * @param asset ERC20 address of either reserve asset or backed asset.
     */
    event HouseRegistered(address house, bytes32 indexed typeOfHouse, address indexed asset);
    /**
     * @dev Emit when a Liquidator contract is `allow` or not as a liquidator.
     * @param liquidator Address of house registered.
     * @param allow boolean
     */
    event LiquidatorAllow(address liquidator, bool allow);

    // AssetsAccountant custom errors
    error AssetsAccountant_zeroAddress();
    error AssetsAccountant_NonTransferable();
    error AssetsAccountant_houseAddressAlreadyRegistered();
    error AssetsAccountant_reserveTokenIdAlreadyRegistered();
    error AssetsAccountant_backedAssetAlreadyRegistered();
    error AssetsAccountant_houseAddressTypeNotRecognized();
    error AssetsAccountant_callerAddressNotRecognizedAsValidHouse();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC1155_init("https://xocolatl.finance/");
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender);
    }

    /**
     * @dev Register a house address in this contract.
     * @dev Requires caller to have DEFAULT_ADMIN_ROLE.
     * @param houseAddress Address of house registered.
     */
    function registerHouse(address houseAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Check if `houseAddress` has been previously registered.
        if (isARegisteredHouse[houseAddress]) {
            revert AssetsAccountant_houseAddressAlreadyRegistered();
        }

        // Check type of House being registered and proceed accordingly

        if (IHouseOfReserve(houseAddress).HOUSE_TYPE() == keccak256("RESERVE_HOUSE")) {
            IHouseOfReserve hOfReserve = IHouseOfReserve(houseAddress);
            uint256 reserveTokenID = hOfReserve.reserveTokenID();
            address bAsset = hOfReserve.backedAsset();
            address rAsset = hOfReserve.reserveAsset();

            // Check that `reserveTokenID` has NOT a house address assigned
            if (houseOfReserves[reserveTokenID] != address(0)) {
                revert AssetsAccountant_reserveTokenIdAlreadyRegistered();
            }

            // Register mappings
            houseOfReserves[reserveTokenID] = houseAddress;
            isARegisteredHouse[houseAddress] = true;
            _reservesIds[rAsset][bAsset].push(reserveTokenID);

            // Assign Roles
            _grantRole(MINTER_ROLE, houseAddress);
            _grantRole(BURNER_ROLE, houseAddress);

            emit HouseRegistered(houseAddress, hOfReserve.HOUSE_TYPE(), rAsset);
        } else if (IHouseOfCoin(houseAddress).HOUSE_TYPE() == keccak256("COIN_HOUSE")) {
            IHouseOfCoin hOfCoin = IHouseOfCoin(houseAddress);
            address bAsset = hOfCoin.backedAsset();

            // Check that `bAsset` has NOT already a HouseOfCoin address assigned
            if (houseOfCoins[bAsset] != address(0)) {
                revert AssetsAccountant_backedAssetAlreadyRegistered();
            }

            // Register mappings
            houseOfCoins[bAsset] = houseAddress;
            isARegisteredHouse[houseAddress] = true;

            // Assign Roles
            _grantRole(MINTER_ROLE, houseAddress);
            _grantRole(BURNER_ROLE, houseAddress);

            emit HouseRegistered(houseAddress, hOfCoin.HOUSE_TYPE(), bAsset);
        } else {
            revert AssetsAccountant_houseAddressTypeNotRecognized();
        }
    }

    function allowLiquidator(address liquidator, bool allow) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (liquidator == address(0)) {
            revert AssetsAccountant_zeroAddress();
        }

        isARegisteredHouse[liquidator] = allow;

        if (allow == true) {
            _grantRole(LIQUIDATOR_ROLE, liquidator);
            _grantRole(BURNER_ROLE, liquidator);
        } else {
            _revokeRole(LIQUIDATOR_ROLE, liquidator);
            _revokeRole(BURNER_ROLE, liquidator);
        }
        emit LiquidatorAllow(liquidator, allow);
    }

    function getReserveIds(address reserveAsset, address backedAsset) public view returns (uint256[] memory) {
        return _reservesIds[reserveAsset][backedAsset];
    }

    /**
     * @dev Returns _name.
     */
    function name() public pure returns (string memory) {
        return NAME;
    }

    /**
     * @dev Sets the URI for this contract.
     * @dev Requires caller to have DEFAULT_ADMIN_ROLE.
     * @dev Since URI is not specified per Token Id this function does not emit {URI} event.
     * @param newuri String of the new URI.
     */
    function setURI(string memory newuri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    /**
     * @notice Mints 'amount' of token Id for specified 'account' address.
     * @dev Requires caller to have MINTER_ROLE.
     * @param account User address
     * @param id Token Id
     * @param amount to mint
     * @param data Not use in this implementation, pass empty string "".
     */
    function mint(address account, uint256 id, uint256 amount, bytes memory data) external onlyRole(MINTER_ROLE) {
        _mint(account, id, amount, data);
    }

    /**
     * @dev Batch implementation of {mint} function. Refer to {mint}.
     */
    // function mintBatch(
    //     address to,
    //     uint256[] memory ids,
    //     uint256[] memory amounts,
    //     bytes memory data
    // ) external onlyRole(MINTER_ROLE) {
    //     _mintBatch(to, ids, amounts, data);
    // }

    /**
     * @notice Burns 'amount' of token Id for specified 'account' address.
     * @dev Requires caller to have BURNER_ROLE.
     * @param account User address
     * @param id Token Id
     * @param amount to burn
     */
    function burn(address account, uint256 id, uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(account, id, amount);
    }

    /**
     * @dev Function override added to restrict transferability of tokens in this contract.
     * @dev Accounting assets are not meant to be transferable.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override onlyRole(LIQUIDATOR_ROLE) {
        _safeTransferFrom(from, to, id, amount, data);
    }

    /**
     * @dev See {safeTransferFrom}.
     */
    function safeBatchTransferFrom(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public pure override {
        revert AssetsAccountant_NonTransferable();
    }

    /**
     * @dev Function override required by Solidity.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}
