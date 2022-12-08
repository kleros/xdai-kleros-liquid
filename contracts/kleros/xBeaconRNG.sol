/**
 *  @authors: [@unknownunknown1]
 *  @reviewers: [@jaybuidl]
 *  @auditors: []
 *  @bounties: []
 *  @deployments: [24f03e4@0x52a2a2cD6775f35E53ea757Dd2F7E96ee81d7DD7]
 */

pragma solidity ^0.4.24;

import "../interfaces/IRandomAuRa.sol";

interface IKlerosLiquid {

    function RNBlock() external returns (uint256);

}

/**
 *  @title xBeaconRNG
 *  @dev RNG for Kleros Court on xDai that uses RandomAura pre-Merge and EIP-4399 randomness post-Merge.
 */
contract xBeaconRNG is IRandomAuRa {

    uint256 public constant LOOKAHEAD = 68; // Number of blocks that has to pass before obtaining the random number. 4 epochs (16 slots each for xDai) + 4 slots, according to EIP-4399.
    uint256 public constant ERROR = 77; // Number of blocks after which the lookahead gets reset, so eligible blocks after lookahead don't go long distance, to avoid a possiblity for manipulation.

    IRandomAuRa public RNGFallback; // Address of RNG to use pre-Merge. Check IRandomAura.sol for reference.
    IKlerosLiquid public klerosLiquid; // Address of KlerosLiquid on xDai.

    /** @dev Constructor.
     * @param _RNGFallback Gnosis chain RandomAura contract to use pre-Merge.
     * @param _klerosLiquid KlerosLiquid address
     */
    constructor(IRandomAuRa _RNGFallback, IKlerosLiquid _klerosLiquid) public {
        RNGFallback = _RNGFallback;
        klerosLiquid = _klerosLiquid;
    }

    function currentSeed() external view returns (uint256) {
        // Pre-Merge.
        if (block.difficulty <= 2**64) {
            return RNGFallback.currentSeed();
        // Post-Merge.
        } else {
            return block.difficulty;
        }
    }

    function isCommitPhase() external view returns (bool) {
        // Pre-Merge.
        if (block.difficulty <= 2**64) {
            return RNGFallback.isCommitPhase();
        // Post-Merge.
        } else {
            // Validity of block.number is checked directly in the court contract.
            return (block.number - klerosLiquid.RNBlock()) % (LOOKAHEAD + ERROR) >= LOOKAHEAD;
        }
    }

    function nextCommitPhaseStartBlock() external view returns (uint256) {
        // Pre-Merge.
        if (block.difficulty <= 2**64) {
            return RNGFallback.nextCommitPhaseStartBlock();
        // Post-Merge.
        } else {
            return block.number;
        }
    }

    function collectRoundLength() external view returns (uint256) {
        // Pre-Merge.
        if (block.difficulty <= 2**64) {
            return RNGFallback.collectRoundLength();
        // Post-Merge.
        } else {
            return 0;
        }
    }
}
