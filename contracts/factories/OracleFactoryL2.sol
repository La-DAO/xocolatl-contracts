// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title OracleFactoryL2
 * @author Xocolatl.eth
 * @notice Same as OracleFactory but with computed pricefeed with sequencer checks.
 */
import {ComputedPriceFeedWithSequencer} from "../utils/ComputedPriceFeedWithSequencer.sol";
import {InversePriceFeed} from "../utils/InversePriceFeed.sol";
import {PriceFeedPythWrapper} from "../utils/PriceFeedPythWrapper.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract OracleFactoryL2 is Ownable {
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
        address indexed inversePriceFeed,
        string description,
        uint8 decimals,
        address feedAsset,
        uint256 allowedTimeout
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
    event SequencerFeedSet(address indexed sequencerFeed);

    /// Custom errors
    error OracleFactory_invalidInput();
    error OracleFactory_noImplementation();
    error OracleFactory_noSequencerFeed();

    address[] internal _computedFeeds;
    address[] internal _inverseFeeds;
    address[] internal _pythFeeds;

    address public computedPriceFeedImpl;
    address public inversePriceFeedImpl;
    address public priceFeedPythWrapperImpl;

    address public sequencerFeed;

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
        if (sequencerFeed == address(0)) revert OracleFactory_noSequencerFeed();
        computedPriceFeed = Clones.clone(computedPriceFeedImpl);
        ComputedPriceFeedWithSequencer(computedPriceFeed).initialize(
            description,
            decimals,
            feedAsset,
            feedInterAsset,
            allowedTimeout,
            sequencerFeed
        );
        _computedFeeds.push(computedPriceFeed);
        emit ComputedPriceFeedCreated(
            computedPriceFeed,
            description,
            decimals,
            feedAsset,
            feedInterAsset,
            allowedTimeout
        );
    }

    function createInversePriceFeed(
        string memory description,
        uint8 decimals,
        address feedAsset,
        uint256 allowedTimeout
    ) external onlyOwner returns (address inversePriceFeed) {
        if (inversePriceFeedImpl == address(0)) revert OracleFactory_noImplementation();
        inversePriceFeed = Clones.clone(inversePriceFeedImpl);
        InversePriceFeed(inversePriceFeed).initialize(description, decimals, feedAsset, allowedTimeout);
        _inverseFeeds.push(inversePriceFeed);
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
        priceFeedPythWrapper = Clones.clone(priceFeedPythWrapperImpl);
        PriceFeedPythWrapper(priceFeedPythWrapper).initialize(
            description,
            decimals,
            pyth,
            pythPriceFeedId,
            allowedTimeout
        );
        _pythFeeds.push(priceFeedPythWrapper);
        emit PriceFeedPythWrapperCreated(
            priceFeedPythWrapper,
            description,
            decimals,
            pyth,
            pythPriceFeedId,
            allowedTimeout
        );
    }

    function setComputedPriceFeedImpl(address computedPriceFeedImpl_) external onlyOwner {
        if (computedPriceFeedImpl_ == address(0)) revert OracleFactory_invalidInput();
        computedPriceFeedImpl = computedPriceFeedImpl_;
        emit ComputedPriceFeedImplSet(computedPriceFeedImpl);
    }

    function setInversePriceFeedImpl(address inversePriceFeedImpl_) external onlyOwner {
        if (inversePriceFeedImpl_ == address(0)) revert OracleFactory_invalidInput();
        inversePriceFeedImpl = inversePriceFeedImpl_;
        emit InversePriceFeedImplSet(inversePriceFeedImpl);
    }

    function setPriceFeedPythWrapperImpl(address priceFeedPythWrapperImpl_) external onlyOwner {
        if (priceFeedPythWrapperImpl_ == address(0)) revert OracleFactory_invalidInput();
        priceFeedPythWrapperImpl = priceFeedPythWrapperImpl_;
        emit PriceFeedPythWrapperImplSet(priceFeedPythWrapperImpl);
    }

    function setSequencerFeed(address sequencerFeed_) external onlyOwner {
        if (sequencerFeed_ == address(0)) revert OracleFactory_invalidInput();
        sequencerFeed = sequencerFeed_;
        emit SequencerFeedSet(sequencerFeed);
    }
}
