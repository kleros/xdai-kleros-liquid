// SPDX-License-Identifier: MIT
pragma solidity ^0.4.24;

/**
 * @dev Arbitrable interface for cross-chain arbitration.
 */
interface ICrossChainArbitrable {
    /**
     * @notice Notifies that a dispute has been requested for an arbitrable item.
     * @param _arbitrableItemID The ID of the arbitration item.
     * @param _extraData Additional information to be used when raising the dispute on the foreign chain.
     */
    function notifyDisputeRequest(uint256 _arbitrableItemID, bytes _extraData) external;

    /**
     * @notice Cancels a dispute previously requested for an arbitrable item.
     * @param _arbitrableItemID The ID of the arbitration item.
     */
    function cancelDispute(uint256 _arbitrableItemID) external;

    /**
     * @notice Give a ruling for a dispute. Must be called by the arbitrator.
     * @param _arbitrableItemID The ID of the arbitration item.
     * @param _ruling Ruling given by the arbitrator. Note that 0 is reserved for "Not able/wanting to make a decision".
     */
    function rule(uint256 _arbitrableItemID, uint256 _ruling) external override;
}