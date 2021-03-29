pragma solidity ^0.4.24;

import { IRandomAuRa } from "../interfaces/IRandomAuRa.sol";

contract MockRandomAuRa is IRandomAuRa {
    uint256 public number;
    uint256 public collectRoundLength = 40;

    /** @dev Constructor.
    *  @param _number The constant number to always return.
    */
    constructor(uint256 _number) public {
        number = _number;
    }


    function currentSeed() external view returns(uint256) {
        return number;
    }

    function isCommitPhase() external view returns(bool) {
        if (block.number / (collectRoundLength * 2) < collectRoundLength)
            return true;
        else
            return false;
    }

    function nextCommitPhaseStartBlock() external view returns(uint256) {
        uint256 blocksUntilCommitPhase = collectRoundLength - block.number / (collectRoundLength * 2);
        return blocksUntilCommitPhase + block.number;
    }
}