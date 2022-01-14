// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/** 
* @title Liquidator Contract.
* @author daigaro.eth
* @notice  Allows any users to call methods to liquidate an unhealthy user.
* @dev  Contracts are split into state and functionality.
*/

import "contracts/interfaces/IAssetsAccountantState.sol";
import "./interfaces/IHouseOfReserveState.sol";
import "redstone-evm-connector/lib/contracts/message-based/PriceAware.sol";

contract LiquidatorState {

    /**
    * @dev Log when a user is liquidated.
    * @param userLiquidated Address of user that is being liquidated.
    * @param liquidator Address of user that liquidates.
    * @param amount payback.
    */
    event liquidation(address indexed userLiquidated, adddress indexed liquidator, uint amount);

}

contract Liquidator is LiquidatorState{

    /**
    * @dev Called to liquidate an array of users.
    * @param usersToLiquidate Array of the address to liquidate.
    */
    function liquidateUsers(address[] calldata usersToLiquidate) external {

    }

    function checkIfLiquidatable(
        uint reserveBal,
        uint mintedCoinBal,
        IHouseOfReserveState.Factor memory collatRatio,
        uint price
    ) public pure returns (bool liquidatable, ) {

        uint reserveBalreducedByFactor =
            ( reserveBal * collatRatio.denominator) / collatRatio.numerator;
            
        uint maxMintableAmount =
            (reserveBalreducedByFactor * price) / 1e8;

        liquidatable = mintedCoinBal > maxMintableAmount? true : false;
    }

}