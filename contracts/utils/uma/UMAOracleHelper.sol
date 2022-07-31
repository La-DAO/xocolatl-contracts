// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IUMAOracleHelper {

  struct Request {
    address requestor;
    bytes32 identifier;
    uint256 timestamp;
    bytes ancillaryData;
  }

}

contract UMAOracleHelper {

  function requestPrice() external {

  }
    
}