// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title ComputedPriceFeed
 * @author Xocolatl.eth
 * @notice Contract that combines two IPriceBulletin-like price feeds or
 * chainlink compatible into one resulting feed denominated in another currency asset.
 * @dev For example: [wsteth/eth]-feed and [eth/usd]-feed to return a [wsteth/usd]-feed.
 * Note: Ensure units work, this contract multiplies the feeds.
 */

import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";

contract ComputedPriceFeed {
    struct PriceFeedResponse {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    ///@dev custom errors
    error ComputedPriceFeed_invalidInput();
    error ComputedPriceFeed_fetchFeedAssetFailed();
    error ComputedPriceFeed_fetchFeedInterFailed();
    error ComputedPriceFeed_lessThanOrZeroAnswer();
    error ComputedPriceFeed_noRoundId();
    error ComputedPriceFeed_noValidUpdateAt();
    error ComputedPriceFeed_staleFeed();

    string private _description;

    uint8 private immutable _decimals;
    uint8 private immutable _feedAssetDecimals;
    uint8 private immutable _feedInterAssetDecimals;

    IPriceBulletin public immutable feedAsset;
    IPriceBulletin public immutable feedInterAsset;

    uint256 public immutable allowedTimeout;

    constructor(
        string memory description_,
        uint8 decimals_,
        address feedAsset_,
        address feedInterAsset_,
        uint256 allowedTimeout_
    ) {
        _description = description_;
        _decimals = decimals_;

        if (
            feedAsset_ == address(0) ||
            feedInterAsset_ == address(0) ||
            allowedTimeout_ == 0
        ) {
            revert ComputedPriceFeed_invalidInput();
        }

        feedAsset = IPriceBulletin(feedAsset_);
        feedInterAsset = IPriceBulletin(feedInterAsset_);

        _feedAssetDecimals = IPriceBulletin(feedAsset_).decimals();
        _feedInterAssetDecimals = IPriceBulletin(feedInterAsset_).decimals();

        allowedTimeout = allowedTimeout_;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function latestAnswer() external view returns (int256) {
        PriceFeedResponse memory clComputed = _computeLatestRoundData();
        return clComputed.answer;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        PriceFeedResponse memory clComputed = _computeLatestRoundData();
        roundId = clComputed.roundId;
        answer = clComputed.answer;
        startedAt = clComputed.startedAt;
        updatedAt = clComputed.updatedAt;
        answeredInRound = roundId;
    }

    function _computeLatestRoundData()
        private
        view
        returns (PriceFeedResponse memory clComputed)
    {
        (
            PriceFeedResponse memory clFeed,
            PriceFeedResponse memory clInter
        ) = _callandCheckFeeds();

        clComputed.answer = _computeAnswer(clFeed.answer, clInter.answer);
        clComputed.roundId = clFeed.roundId > clInter.roundId
            ? clFeed.roundId
            : clInter.roundId;
        clComputed.startedAt = clFeed.startedAt < clInter.startedAt
            ? clFeed.startedAt
            : clInter.startedAt;
        clComputed.updatedAt = clFeed.updatedAt > clInter.updatedAt
            ? clFeed.updatedAt
            : clInter.updatedAt;
        clComputed.answeredInRound = clComputed.roundId;
    }

    function _computeAnswer(
        int256 assetAnswer,
        int256 interAssetAnswer
    ) private view returns (int256) {
        uint256 price = (uint256(assetAnswer) *
            uint256(interAssetAnswer) *
            10 ** (uint256(_decimals))) /
            10 ** (uint256(_feedAssetDecimals + _feedInterAssetDecimals));
        return int256(price);
    }

    function _callandCheckFeeds()
        private
        view
        returns (
            PriceFeedResponse memory clFeed,
            PriceFeedResponse memory clInter
        )
    {
        // Call the aggregator feeds with try-catch method to identify failure
        try feedAsset.latestRoundData() returns (
            uint80 roundIdFeedAsset,
            int256 answerFeedAsset,
            uint256 startedAtFeedAsset,
            uint256 updatedAtFeedAsset,
            uint80 answeredInRoundFeedAsset
        ) {
            clFeed.roundId = roundIdFeedAsset;
            clFeed.answer = answerFeedAsset;
            clFeed.startedAt = startedAtFeedAsset;
            clFeed.updatedAt = updatedAtFeedAsset;
            clFeed.answeredInRound = answeredInRoundFeedAsset;
        } catch {
            revert ComputedPriceFeed_fetchFeedAssetFailed();
        }

        try feedInterAsset.latestRoundData() returns (
            uint80 roundIdFeedInterAsset,
            int256 answerFeedInterAsset,
            uint256 startedAtFeedInterAsset,
            uint256 updatedAtInterFeedInterAsset,
            uint80 answeredInRoundFeedInterAsset

        ) {
            clInter.roundId = roundIdFeedInterAsset;
            clInter.answer =answerFeedInterAsset;
            clInter.startedAt =startedAtFeedInterAsset;
            clInter.updatedAt = updatedAtInterFeedInterAsset;
            clInter.answeredInRound = answeredInRoundFeedInterAsset;
        } catch  {
            revert ComputedPriceFeed_fetchFeedInterFailed();
        }

        // Perform checks to the returned responses
        if (clFeed.answer <= 0 || clInter.answer <= 0) {
            revert ComputedPriceFeed_lessThanOrZeroAnswer();
        } else if (clFeed.roundId == 0 || clInter.roundId == 0) {
            revert ComputedPriceFeed_noRoundId();
        } else if (
            clFeed.updatedAt > block.timestamp ||
            clFeed.updatedAt == 0 ||
            clInter.updatedAt > block.timestamp ||
            clInter.updatedAt == 0
        ) {
            revert ComputedPriceFeed_noValidUpdateAt();
        } else if (
            block.timestamp - clFeed.updatedAt > allowedTimeout ||
            block.timestamp - clInter.updatedAt > allowedTimeout
        ) {
            revert ComputedPriceFeed_staleFeed();
        }
    }
}
