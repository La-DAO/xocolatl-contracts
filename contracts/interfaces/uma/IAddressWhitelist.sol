// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

interface IAddressWhitelist {
    function addToWhitelist(address newElement) external;

    function removeFromWhitelist(address newElement) external;

    function isOnWhitelist(address newElement) external view returns (bool);

    function getWhitelist() external view returns (address[] memory);
}