// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

interface IERC20Extension is IERC20, IAccessControl {
    function decimals() external view returns (uint);

    function mint(address to, uint256 amount) external;

    function burn(address to, uint256 amount) external;
}
