// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title ReserveBeaconFactory
 * @author Xocolatl.eth
 * @notice Contract that creates HouseOfReserve clones in a Beacon pattern.
 */
import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";
import {HouseOfReserve} from "../HouseOfReserve.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

contract ReserveBeaconFactory is IBeacon, Ownable {
    using Address for address;

    /// Events
    event HouseOfReserveCreated(
        address indexed computedPriceFeed,
        string description,
        uint8 decimals,
        address feedAsset,
        address feedInterAsset,
        uint256 allowedTimeout
    );
    event Upgraded(address indexed implementation);

    /// Custom Errors
    error ReserveBeaconFactory__checkAddress_zeroAddress();
    error ReserveBeaconFactory__setImplementation_notContract();

    address public wrappedAsset;
    address public accountant;
    uint256 public currentNonce;

    address private _implementation;

    /**
     * @notice Constructor of a new {BorrowingVaultFactory}.
     * @param weth9 address of the WETH9 contract
     * @param impl address of the master BorrowingVault.sol
     * @dev Requirements:
     * - Must comply with {VaultDeployer} requirements.
     */
    constructor(address weth9, address impl) {
        _setImplementation(impl);
        _checkAddress(weth9);
        wrappedAsset = weth9;
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

    function setAssetsAccountant(address newAccountant) public onlyOwner {
        _checkAddress(newAccountant);
        accountant = newAccountant;
        emit Upgraded(newAccountant);
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
}
