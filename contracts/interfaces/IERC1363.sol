// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/**
 * @dev Interface of the ERC1363 standard as defined in the EIP.
 * Implementing contracts MUST implement the ERC-1363 interface as well as the ERC-20 and ERC-165 interfaces.
 * See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1363.md.
 */
interface IERC1363 {
  /*
   * Note: the ERC-165 identifier for this interface is 0xb0202a11.
   * 0xb0202a11 ===
   *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
   *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
   *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
   *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
   *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
   *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
   */

  /**
   * @notice Transfer tokens from `msg.sender` to another address and then call `onTransferReceived` on receiver
   * @param to address The address which you want to transfer to
   * @param value uint256 The amount of tokens to be transferred
   * @return true unless throwing
   */
  function transferAndCall(address to, uint256 value) external returns (bool);

  /**
   * @notice Transfer tokens from `msg.sender` to another address and then call `onTransferReceived` on receiver
   * @param to address The address which you want to transfer to
   * @param value uint256 The amount of tokens to be transferred
   * @param data bytes Additional data with no specified format, sent in call to `to`
   * @return true unless throwing
   */
  function transferAndCall(address to, uint256 value, bytes memory data) external returns (bool);

  /**
   * @notice Transfer tokens from one address to another and then call `onTransferReceived` on receiver
   * @param from address The address which you want to send tokens from
   * @param to address The address which you want to transfer to
   * @param value uint256 The amount of tokens to be transferred
   * @return true unless throwing
   */
  function transferFromAndCall(address from, address to, uint256 value) external returns (bool);


  /**
   * @notice Transfer tokens from one address to another and then call `onTransferReceived` on receiver
   * @param from address The address which you want to send tokens from
   * @param to address The address which you want to transfer to
   * @param value uint256 The amount of tokens to be transferred
   * @param data bytes Additional data with no specified format, sent in call to `to`
   * @return true unless throwing
   */
  function transferFromAndCall(address from, address to, uint256 value, bytes memory data) external returns (bool);

  /**
   * @notice Approve the passed address to spend the specified amount of tokens on behalf of msg.sender
   * and then call `onApprovalReceived` on spender.
   * @param spender address The address which will spend the funds
   * @param value uint256 The amount of tokens to be spent
   */
  function approveAndCall(address spender, uint256 value) external returns (bool);

  /**
   * @notice Approve the passed address to spend the specified amount of tokens on behalf of msg.sender
   * and then call `onApprovalReceived` on spender.
   * @param spender address The address which will spend the funds
   * @param value uint256 The amount of tokens to be spent
   * @param data bytes Additional data with no specified format, sent in call to `spender`
   */
  function approveAndCall(address spender, uint256 value, bytes memory data) external returns (bool);
}