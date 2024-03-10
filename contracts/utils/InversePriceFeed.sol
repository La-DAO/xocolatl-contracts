// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title InversePriceFeed
 * @author Xocolatl.eth
 * @notice Contract that takes a IPriceBulletin-like price feed or
 * chainlink compatible feed and returns the inverse price.
 * @dev For example:
 * [eth/usd]-feed (dollars per one unit of eth) will be flipped to a
 * [usd/eth]-feed (eth per one unit of dollar).
 */
import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract InversePriceFeed is Initializable {
    struct PriceFeedResponse {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    ///@dev custom errors
    error InversePriceFeed_invalidInput();
    error InversePriceFeed_fetchFeedAssetFailed();
    error InversePriceFeed_fetchFeedInterFailed();
    error InversePriceFeed_lessThanOrZeroAnswer();
    error InversePriceFeed_noRoundId();
    error InversePriceFeed_noValidUpdateAt();
    error InversePriceFeed_staleFeed();

    string public constant VERSION = "v1.0.0";

    string private _description;
    uint8 private _decimals;
    uint8 private _feedAssetDecimals;

    IPriceBulletin public feedAsset;
    uint256 public allowedTimeout;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory description_,
        uint8 decimals_,
        address feedAsset_,
        uint256 allowedTimeout_
    ) external initializer {
        _description = description_;
        _decimals = decimals_;

        if (feedAsset_ == address(0) || allowedTimeout_ == 0) {
            revert InversePriceFeed_invalidInput();
        }

        feedAsset = IPriceBulletin(feedAsset_);
        _feedAssetDecimals = IPriceBulletin(feedAsset_).decimals();
        allowedTimeout = allowedTimeout_;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function latestAnswer() external view returns (int256) {
        PriceFeedResponse memory feedLatestRound = _callandCheckFeed();
        return _computeInverseAnswer(feedLatestRound.answer);
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        PriceFeedResponse memory feedLatestRound = _callandCheckFeed();
        int256 invPrice = _computeInverseAnswer(feedLatestRound.answer);

        roundId = feedLatestRound.roundId;
        answer = invPrice;
        startedAt = feedLatestRound.startedAt;
        updatedAt = feedLatestRound.updatedAt;
        answeredInRound = feedLatestRound.roundId;
    }

    function _computeInverseAnswer(int256 assetAnswer) private view returns (int256) {
        uint256 inverse = 10 ** (uint256(2 * _decimals)) / uint256(assetAnswer);
        return int256(inverse);
    }

    function _callandCheckFeed() private view returns (PriceFeedResponse memory clFeed) {
        // Call the aggregator feed with try-catch method to identify failure
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
            revert InversePriceFeed_fetchFeedAssetFailed();
        }

        // Perform checks to the returned response
        if (clFeed.answer <= 0) {
            revert InversePriceFeed_lessThanOrZeroAnswer();
        } else if (clFeed.roundId == 0) {
            revert InversePriceFeed_noRoundId();
        } else if (clFeed.updatedAt > block.timestamp || clFeed.updatedAt == 0) {
            revert InversePriceFeed_noValidUpdateAt();
        } else if (block.timestamp - clFeed.updatedAt > allowedTimeout) {
            revert InversePriceFeed_staleFeed();
        }
    }
}
