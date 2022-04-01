// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IOracle {
    
    function getLastPrice() external view returns(uint);

    function oraclePriceDecimals() external view returns(uint);
}