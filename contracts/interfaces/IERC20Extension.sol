// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IERC20Extension is IERC20, IAccessControl {

    function decimals() external view returns(uint);

    function mint(address to, uint256 amount) external;

    function burn(address to, uint256 amount) external;

}