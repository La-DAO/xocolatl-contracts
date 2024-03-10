// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

/**
 * @title PriceFeedPythWrapper
 * @author Xocolatl.eth
 * @notice Contract that wraps the IPyth price feed contract and formats the
 * response to be compatible with the IPriceBulletin interface.
 * @dev Refer to the IPyth.sol interface for more details:
 * https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/ethereum/sdk/solidity/IPyth.sol
 * Reference for MXN/USD feed:
 * PythId: 0xe13b1c1ffb32f34e1be9545583f01ef385fde7f42ee66049d30570dc866b77ca
 */
import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IPyth {
    struct Price {
        // Price
        int64 price;
        // Confidence interval around the price
        uint64 conf;
        // Price exponent
        int32 expo;
        // Unix timestamp describing when the price was published
        uint256 publishTime;
    }

    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
    function priceFeedExists(bytes32 id) external view returns (bool);
}

contract PriceFeedPythWrapper is Initializable {
    struct PriceFeedResponse {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    ///@dev custom errors
    error PriceFeedPythWrapper_invalidInput();
    error PriceFeedPythWrapper_fetchPythFeedFailed();
    error PriceFeedPythWrapper_fetchFeedInterFailed();
    error PriceFeedPythWrapper_lessThanOrZeroAnswer();
    error PriceFeedPythWrapper_noRoundId();
    error PriceFeedPythWrapper_noValidUpdateAt();
    error PriceFeedPythWrapper_staleFeed();
    error PriceFeedPythWrapper_invalidPriceFeedId();
    error PriceFeedPythWrapper_safeCast_overflow();

    string public constant VERSION = "v1.0.0";

    string private _description;
    uint8 private _decimals;
    uint8 private _pythPriceDecimals;

    uint256 public allowedTimeout;
    bytes32 public pythPriceFeedId;
    IPyth public pyth;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory description_,
        uint8 decimals_,
        address pyth_,
        bytes32 pythPriceFeedId_,
        uint256 allowedTimeout_
    ) external initializer {
        _description = description_;
        _decimals = decimals_;

        if (pyth_ == address(0) || allowedTimeout_ == 0) {
            revert PriceFeedPythWrapper_invalidInput();
        }
        if (IPyth(pyth_).priceFeedExists(pythPriceFeedId_) == false) {
            revert PriceFeedPythWrapper_invalidPriceFeedId();
        }
        pythPriceFeedId = pythPriceFeedId_;

        IPyth.Price memory response = IPyth(pyth_).getPriceUnsafe(pythPriceFeedId_);
        _pythPriceDecimals = uint8(int8(-response.expo));

        pyth = IPyth(pyth_);
        allowedTimeout = allowedTimeout_;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function latestAnswer() external view returns (int256) {
        PriceFeedResponse memory pythRound = _computeLatestRoundData();
        return pythRound.answer;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        PriceFeedResponse memory pythRound = _computeLatestRoundData();
        roundId = pythRound.roundId;
        answer = pythRound.answer;
        startedAt = pythRound.startedAt;
        updatedAt = pythRound.updatedAt;
        answeredInRound = roundId;
    }

    function _computeLatestRoundData() private view returns (PriceFeedResponse memory pythLatestRound) {
        return _callandCheckFeeds();
    }

    function _computeAnswer(int64 pythAnswer) private view returns (int256) {
        if (_pythPriceDecimals > _decimals) {
            return int256(pythAnswer / int256(10 ** (_pythPriceDecimals - _decimals)));
        } else {
            return int256(pythAnswer * int256(10 ** (_decimals - _pythPriceDecimals)));
        }
    }

    function _callandCheckFeeds() private view returns (PriceFeedResponse memory pythRound) {
        // Call the pyth address with try-catch method to identify failure
        try pyth.getPriceUnsafe(pythPriceFeedId) returns (IPyth.Price memory response) {
            uint80 roundIdPyth = _safeCastToARoundIdPerDay(response.publishTime);
            pythRound.roundId = roundIdPyth;
            pythRound.answer = _computeAnswer(response.price);
            pythRound.startedAt = response.publishTime;
            pythRound.updatedAt = response.publishTime;
            pythRound.answeredInRound = roundIdPyth;
        } catch {
            revert PriceFeedPythWrapper_fetchPythFeedFailed();
        }

        // Perform checks to the returned responses
        if (pythRound.answer <= 0) {
            revert PriceFeedPythWrapper_lessThanOrZeroAnswer();
        } else if (pythRound.roundId == 0) {
            revert PriceFeedPythWrapper_noRoundId();
        } else if (pythRound.updatedAt > block.timestamp || pythRound.updatedAt == 0) {
            revert PriceFeedPythWrapper_noValidUpdateAt();
        } else if (block.timestamp - pythRound.updatedAt > allowedTimeout) {
            revert PriceFeedPythWrapper_staleFeed();
        }
    }

    function _safeCastToARoundIdPerDay(uint256 pythPublisTimestamp) private pure returns (uint80) {
        uint256 value = pythPublisTimestamp / 86400;
        if (value > type(uint80).max) {
            revert PriceFeedPythWrapper_safeCast_overflow();
        }
        return uint80(value);
    }
}
