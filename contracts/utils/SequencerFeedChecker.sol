// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import {IPriceBulletin} from "../interfaces/tlatlalia/IPriceBulletin.sol";

contract SequencerFeedChecker {
    /// @dev Custom errors
    error SequencerFeedChecker__zeroAddress();
    error SequencerFeedChecker__sequencerDown();
    error SequencerFeedChecker__gracePeriodNotOver();

    uint256 public constant GRACE_PERIOD_TIME = 3600;
    uint256 public constant UPDATE_PERIOD = 86400;

    IPriceBulletin public sequencerFeed;

    function __SequencerFeed_init(address feed) internal {
        if (feed == address(0)) {
            revert SequencerFeedChecker__zeroAddress();
        }
        sequencerFeed = IPriceBulletin(feed);
    }

    /**
     * @notice Check the sequencer status for the Arbitrum mainnet.
     */
    function checkSequencerFeed() public view {
        (, int256 answer, uint256 startedAt, , ) = sequencerFeed.latestRoundData();
        // Answer == 0: Sequencer is up
        // Answer == 1: Sequencer is down
        bool isSequencerUp = answer == 0;
        if (!isSequencerUp) {
            revert SequencerFeedChecker__sequencerDown();
        }

        // Make sure the grace period has passed after the sequencer is back up.
        uint256 timeSinceUp = block.timestamp - startedAt;
        if (timeSinceUp <= GRACE_PERIOD_TIME) {
            revert SequencerFeedChecker__gracePeriodNotOver();
        }
    }
}
