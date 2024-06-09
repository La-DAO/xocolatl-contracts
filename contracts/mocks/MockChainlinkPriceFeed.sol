// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockChainlinkPriceFeed is IPriceBulletin, Ownable {
    event RoundAnswered(uint80 roundId, int256 answer, uint256 updatedAt);
    event PriceRequest(uint80 roundId, uint256 startedAt);

    struct Round {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    struct Request {
        uint80 roundId;
        uint256 startedAt;
    }

    string private _description;
    uint8 private _decimals;

    Round private _latestAnswerRound;
    Request private _latestRequest;

    constructor(string memory description_, uint8 decimals_) {
        _description = description_;
        _decimals = decimals_;
    }

    function setPriceFeedData(int256 newPrice_) external onlyOwner {
        Round memory recordRound = Round(
            _latestRequest.roundId,
            newPrice_,
            _latestRequest.startedAt,
            block.timestamp,
            _latestRequest.roundId
        );
        _latestAnswerRound = recordRound;

        emit RoundAnswered(recordRound.roundId, recordRound.answer, recordRound.updatedAt);
    }

    function requestPriceFeedData() external {
        Request memory recordRequest = Request(_latestAnswerRound.roundId + 1, block.timestamp);

        _latestRequest = recordRequest;

        emit PriceRequest(recordRequest.roundId, recordRequest.startedAt);
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function latestAnswer() external view returns (int256) {
        return _latestAnswerRound.answer;
    }

    function latestRound() external view returns (uint256) {
        return _latestAnswerRound.roundId;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        roundId = _latestAnswerRound.roundId;
        answer = _latestAnswerRound.answer;
        startedAt = _latestAnswerRound.startedAt;
        updatedAt = _latestAnswerRound.updatedAt;
        answeredInRound = _latestAnswerRound.answeredInRound;
    }
}
