pragma solidity ^0.4.24;

import {IRandomAuRa} from "../interfaces/IRandomAuRa.sol";

contract MockRandomAuRa is IRandomAuRa {
    uint256 private constant COLLECT_ROUND_LENGTH = 4;
    uint256 public number;

    /** @dev Constructor.
     *  @param _number The constant number to always return.
     */
    constructor(uint256 _number) public {
        number = _number;
    }

    function currentSeed() external view returns (uint256) {
        return number;
    }

    function isCommitPhase() external view returns (bool) {
        uint256 commitPhaseLength = COLLECT_ROUND_LENGTH / 2;
        return (block.number - 1) % COLLECT_ROUND_LENGTH < commitPhaseLength;
    }

    function nextCommitPhaseStartBlock() external view returns (uint256) {
        uint256 remainingBlocksToNextRound =
            COLLECT_ROUND_LENGTH - ((block.number - 1) % COLLECT_ROUND_LENGTH);
        return remainingBlocksToNextRound + block.number;
    }

    function collectRoundLength() external view returns (uint256) {
        return COLLECT_ROUND_LENGTH;
    }
}
