// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/** 
* @title Liquidator Contract.
* @author daigaro.eth
* @notice  Allows any users to call methods to liquidate an unhealthy user.
* @dev  Contracts are split into state and functionality.
*/

import "contracts/interfaces/IAssetsAccountantState.sol";
import "contracts/interfaces/IHouseOfCoin.sol";
import "./interfaces/IHouseOfReserveState.sol";
import "redstone-evm-connector/lib/contracts/message-based/PriceAware.sol";

contract LiquidatorState {

    /**
    * @dev Log when a user is in the danger zone of being liquidated.
    * @param user Address of user that is on margin call. 
    * @param mintedAsset ERC20 address of user's token debt on margin call.
    * @param reserveAsset ERC20 address of user's backing collateral.
    */
    event MarginCall (address indexed user, adddress indexed mintedAsset, address indexed reserveAsset);

    /**
    * @dev Log when a user is liquidated.
    * @param userLiquidated Address of user that is being liquidated.
    * @param liquidator Address of user that liquidates.
    * @param amount payback.
    */
    event Liquidation (address indexed userLiquidated, adddress indexed liquidator, uint amount);

    uint256 public marginCallThreshold;

    uint256 public liquidationThreshold;

}

contract Liquidator is LiquidatorState{

    /**
    * @dev Called to liquidate a user.
    * @param userToLiquidate Array of the address to liquidate.
    * @param houseOfReserve the house of reserve where user will be liquidated. 
    */
    function liquidateUser(address userToLiquidate, address houseOfReserve) external {

        // Need to break steps into subfunctions. Process.
        // 0.- Get latest price.
        // 1.- Check mintpower
        // 2.- Check user minted debt
        // 3.- Compute health ratio 
        // 3.1- Conditionals

    }

    /**
    * @dev Function to call redstone oracle price.
    * @dev Must be called according to 'redstone-evm-connector' documentation.
    */
    function redstoneGetLastPrice() public view returns(uint) {
        uint usdfiat = getPriceFromMsg(bytes32("MXNUSD=X"));
        uint usdeth = getPriceFromMsg(bytes32("ETH"));
        uint fiateth = (usdeth * 1e8) / usdfiat;
        return fiateth;
    }

}