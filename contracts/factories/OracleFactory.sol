// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title OracleFactory
 * @author Xocolatl.eth
 * @notice Contract that creates specially purposed oracles.
 */
import {ComputedPriceFeed} from "../utils/ComputedPriceFeed.sol";
import {InversePriceFeed} from "../utils/InversePriceFeed.sol";
import {PriceFeedPythWrapper} from "../utils/PriceFeedPythWrapper.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract OracleFactory is Ownable {
    /// Events
    event ComputedPriceFeedCreated(
        address indexed computedPriceFeed,
        string description,
        uint8 decimals,
        address feedAsset,
        address feedInterAsset,
        uint256 allowedTimeout
    );

    event InversePriceFeedCreated(
        address indexed inversePriceFeed, string description, uint8 decimals, address feedAsset, uint256 allowedTimeout
    );

    event PriceFeedPythWrapperCreated(
        address indexed priceFeedPythWrapper,
        string description,
        uint8 decimals,
        address pyth,
        bytes32 pythPriceFeedId,
        uint256 allowedTimeout
    );

    event ComputedPriceFeedImplSet(address indexed computedPriceFeedImpl);
    event InversePriceFeedImplSet(address indexed inversePriceFeedImpl);
    event PriceFeedPythWrapperImplSet(address indexed priceFeedPythWrapperImpl);

    /// Custom errors
    error OracleFactory_invalidInput();
    error OracleFactory_noImplementation();

    address[] internal _computedFeeds;
    address[] internal _inverseFeeds;
    address[] internal _pythFeeds;

    address public computedPriceFeedImpl;
    address public inversePriceFeedImpl;
    address public priceFeedPythWrapperImpl;

    function getComputedFeeds() external view returns (address[] memory) {
        return _computedFeeds;
    }

    function getInverseFeeds() external view returns (address[] memory) {
        return _inverseFeeds;
    }

    function getPythFeeds() external view returns (address[] memory) {
        return _pythFeeds;
    }

    function createComputedPriceFeed(
        string memory description,
        uint8 decimals,
        address feedAsset,
        address feedInterAsset,
        uint256 allowedTimeout
    ) external onlyOwner returns (address computedPriceFeed) {
        if (computedPriceFeedImpl == address(0)) revert OracleFactory_noImplementation();
        address feed = Clones.clone(computedPriceFeedImpl);
        ComputedPriceFeed(feed).initialize(description, decimals, feedAsset, feedInterAsset, allowedTimeout);
        _computedFeeds.push(feed);
        emit ComputedPriceFeedCreated(
            computedPriceFeed, description, decimals, feedAsset, feedInterAsset, allowedTimeout
        );
    }

    function createInversePriceFeed(
        string memory description,
        uint8 decimals,
        address feedAsset,
        uint256 allowedTimeout
    ) external onlyOwner returns (address inversePriceFeed) {
        if (inversePriceFeedImpl == address(0)) revert OracleFactory_noImplementation();
        address feed = Clones.clone(inversePriceFeedImpl);
        InversePriceFeed(feed).initialize(description, decimals, feedAsset, allowedTimeout);
        _inverseFeeds.push(feed);
        emit InversePriceFeedCreated(inversePriceFeed, description, decimals, feedAsset, allowedTimeout);
    }

    function createPriceFeedPythWrapper(
        string memory description,
        uint8 decimals,
        address pyth,
        bytes32 pythPriceFeedId,
        uint256 allowedTimeout
    ) external onlyOwner returns (address priceFeedPythWrapper) {
        if (priceFeedPythWrapperImpl == address(0)) revert OracleFactory_noImplementation();
        address feed = Clones.clone(priceFeedPythWrapperImpl);
        PriceFeedPythWrapper(feed).initialize(description, decimals, pyth, pythPriceFeedId, allowedTimeout);
        _pythFeeds.push(feed);
        emit PriceFeedPythWrapperCreated(
            priceFeedPythWrapper, description, decimals, pyth, pythPriceFeedId, allowedTimeout
        );
    }

    function setComputedPriceFeedImpl(address computedPriceFeedImpl_) external onlyOwner {
        if (computedPriceFeedImpl_ != address(0)) revert OracleFactory_invalidInput();
        computedPriceFeedImpl = computedPriceFeedImpl_;
        emit ComputedPriceFeedImplSet(computedPriceFeedImpl);
    }

    function setInversePriceFeedImpl(address inversePriceFeedImpl_) external onlyOwner {
        if (inversePriceFeedImpl_ != address(0)) revert OracleFactory_invalidInput();
        inversePriceFeedImpl = inversePriceFeedImpl_;
        emit InversePriceFeedImplSet(inversePriceFeedImpl);
    }

    function setPriceFeedPythWrapperImpl(address priceFeedPythWrapperImpl_) external onlyOwner {
        if (priceFeedPythWrapperImpl_ != address(0)) revert OracleFactory_invalidInput();
        priceFeedPythWrapperImpl = priceFeedPythWrapperImpl_;
        emit PriceFeedPythWrapperImplSet(priceFeedPythWrapperImpl);
    }
}
