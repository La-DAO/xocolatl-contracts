// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title ReserveBeaconFactory
 * @author Xocolatl.eth
 * @notice Contract that creates HouseOfReserve clones in a Beacon pattern.
 */
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import {HouseOfReserve} from "../HouseOfReserve.sol";
import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";
import {AssetsAccountant} from "../AssetsAccountant.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

contract ReserveBeaconFactory is IBeacon, Ownable {
    using Address for address;

    /// Events
    event HouseOfReserveCreated(
        address indexed newReserveAddr,
        address indexed reserveAsset,
        uint256 reserveTokenId,
        uint256 backedTokenId
    );
    event Upgraded(address indexed implementation);

    /// Custom Errors
    error ReserveBeaconFactory__checkAddress_zeroAddress();
    error ReserveBeaconFactory__setImplementation_notContract();
    error ReserveBeaconFactory__noAdminRoleAtAccountant();

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    address private _implementation;
    address[] internal _reserveAssets;
    // ERC20 reserveAsset => HouseOfReserve[]
    mapping(address => HouseOfReserve[]) internal _reservesByAsset;

    address public immutable weth9;
    address public immutable xocolatl;
    address public immutable accountant;
    mapping(address => bool) public isAcceptedReserveAsset;

    /**
     * @notice Constructor of a new {BorrowingVaultFactory}.
     * @param implAddr address of the master BorrowingVault.sol
     * @param xocAddr address of the Xocolatl contract
     * @param accountAddr address of the AssetsAccountant contract
     * @param weth9Addr address of the WETH9 contract
     * @dev Requirements:
     * - Must comply with {VaultDeployer} requirements.
     */
    constructor(address implAddr, address xocAddr, address accountAddr, address weth9Addr) {
        _setImplementation(implAddr);
        _checkAddress(xocAddr);
        _checkAddress(weth9Addr);
        _checkAddress(accountAddr);
        xocolatl = xocAddr;
        weth9 = weth9Addr;
        accountant = accountAddr;
    }

    /**
     * @notice Returns the list of accepted reserve assets.
     */
    function getReserveAssets() public view returns (address[] memory) {
        return _reserveAssets;
    }

    /**
     * @notice Returns the current implementation address.
     */
    function implementation() public view virtual override returns (address) {
        return _implementation;
    }

    /**
     * @notice Upgrades the beacon to a new implementation.
     * @dev Requirements:
     * - Emits an {Upgraded} event.
     * - msg.sender must be the timelock.
     * - `newImplementation` must be a contract.
     */
    function upgradeTo(address newImplementation) public onlyOwner {
        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }

    /**
     * @notice Deploys a new HouseOfReserve proxy.
     * @dev Requirements:
     * - Emits a {HouseOfReserveCreated} event.
     */
    function deployHouseOfReserve(
        address reserveAsset,
        IPriceBulletin priceFeed,
        uint256 maxLTVFactor,
        uint256 liquidationFactor,
        uint256 depositLimit,
        uint256 reserveMintFee
    ) public onlyOwner returns (address reserve) {
        _checkAdminRoleAtAccountant();
        bytes memory initCallData = abi.encodeWithSelector(
            HouseOfReserve.initialize.selector,
            reserveAsset,
            xocolatl,
            accountant,
            address(priceFeed),
            weth9,
            address(this)
        );
        bytes memory bytecode = abi.encodePacked(
            type(BeaconProxy).creationCode,
            abi.encode(address(this), initCallData)
        );
        bytes32 salt = keccak256(abi.encode(reserveAsset, _reservesByAsset[reserveAsset].length));
        reserve = Create2.deploy(0, salt, bytecode);

        _configureDeployedReserve(
            HouseOfReserve(payable(reserve)),
            maxLTVFactor,
            liquidationFactor,
            depositLimit,
            reserveMintFee
        );
        _addAssetToReserves(reserveAsset);
        emit HouseOfReserveCreated(
            reserve,
            reserveAsset,
            HouseOfReserve(payable(reserve)).reserveTokenID(),
            HouseOfReserve(payable(reserve)).backedTokenID()
        );
    }

    function _configureDeployedReserve(
        HouseOfReserve reserve,
        uint256 maxLTVFactor,
        uint256 liquidationFactor,
        uint256 depositLimit,
        uint256 reserveMintFee
    ) internal {
        reserve.setMaxLTVFactor(maxLTVFactor);
        reserve.setLiquidationFactor(liquidationFactor);
        reserve.setDepositLimit(depositLimit);
        reserve.setReserveMintFee(reserveMintFee);
        reserve.transferOwnership(owner());
        AssetsAccountant(accountant).registerHouse(address(reserve));
    }

    /**
     * @notice Adds a new reserve asset to the list of accepted reserve assets.
     * @dev Requirements:
     * - `reserveAsset` must not be in the list of accepted reserve assets.
     */
    function _addAssetToReserves(address reserveAsset) internal {
        if (!isAcceptedReserveAsset[reserveAsset]) {
            _reserveAssets.push(reserveAsset);
            isAcceptedReserveAsset[reserveAsset] = true;
        }
    }

    /**
     * @notice Sets the implementation contract address for this beacon
     * @param newImplementation The new implementtion for the further proxy contracts
     * @dev Requirements:
     * - `newImplementation` must be a contract.
     */
    function _setImplementation(address newImplementation) private {
        if (!Address.isContract(newImplementation)) {
            revert ReserveBeaconFactory__setImplementation_notContract();
        }
        _implementation = newImplementation;
    }

    function _checkAddress(address addr) internal pure {
        if (addr == address(0)) {
            revert ReserveBeaconFactory__checkAddress_zeroAddress();
        }
    }

    function _checkAdminRoleAtAccountant() internal view {
        if (!AssetsAccountant(accountant).hasRole(DEFAULT_ADMIN_ROLE, address(this))) {
            revert ReserveBeaconFactory__noAdminRoleAtAccountant();
        }
    }
}
