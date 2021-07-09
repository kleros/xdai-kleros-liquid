/**
 *  https://contributing.kleros.io/smart-contract-workflow
 *  @reviewers: [@hbarcelos]
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 */
pragma solidity ^0.4.24;

import { xKlerosLiquid } from "./xKlerosLiquid.sol";

/**
 *  @title xKlerosLiquidExtraViews
 *  @dev This contract is an adaption of Mainnet's KlerosLiquidExtraViews (https://github.com/kleros/kleros/blob/69cfbfb2128c29f1625b3a99a3183540772fda08/contracts/kleros/KlerosLiquidExtraViews.sol)
 *  for xDai chain.
 */
contract xKlerosLiquidExtraViews {
    /* Storage */

    xKlerosLiquid public klerosLiquid;

    /* Constructor */

    /** @dev Constructs the xKlerosLiquidExtraViews contract.
     *  @param _klerosLiquid The address of KlerosLiquid on xDai.
     */
    constructor(xKlerosLiquid _klerosLiquid) public {
        klerosLiquid = _klerosLiquid;
    }

    /* External Views */

    /** @dev Gets the stake of a specified juror in a specified subcourt, taking into account delayed set stakes.
     *  @param _account The address of the juror.
     *  @param _subcourtID The ID of the subcourt.
     *  @return The stake.
     */
    function stakeOf(address _account, uint96 _subcourtID) external view returns(uint stake) {
        (
            uint96[] memory subcourtIDs,
            ,
            ,
            uint[] memory subcourtStakes
        ) = getJuror(_account);
        for (uint i = 0; i < subcourtIDs.length; i++) {
            if (_subcourtID + 1 == subcourtIDs[i]) {
                stake = subcourtStakes[i];
            }
        }
    }

    /* Public Views */

    /** @dev Gets a specified juror's properties, taking into account delayed set stakes. Note that subcourt IDs are shifted by 1 so that 0 can be "empty".
     *  @param _account The address of the juror.
     *  @return The juror's properties, taking into account delayed set stakes.
     */
    function getJuror(address _account) public view returns(
        uint96[] subcourtIDs,
        uint stakedTokens,
        uint lockedTokens,
        uint[] subcourtStakes
    ) {
        subcourtIDs = new uint96[](klerosLiquid.MAX_STAKE_PATHS());
        (stakedTokens, lockedTokens) = klerosLiquid.jurors(_account);
        subcourtStakes = new uint[](klerosLiquid.MAX_STAKE_PATHS());

        uint96[] memory actualSubcourtIDs = klerosLiquid.getJuror(_account);
        for (uint i = 0; i < actualSubcourtIDs.length; i++) {
            subcourtIDs[i] = actualSubcourtIDs[i] + 1;
            subcourtStakes[i] = klerosLiquid.stakeOf(_account, actualSubcourtIDs[i]);
        }

        for (i = klerosLiquid.nextDelayedSetStake(); i <= klerosLiquid.lastDelayedSetStake(); i++) {
            (address account, uint96 subcourtID, uint128 stake) = klerosLiquid.delayedSetStakes(i);
            if (_account != account) continue;

            (,, uint courtMinStake,,,) = klerosLiquid.courts(subcourtID);

            if (stake == 0) {
                for (uint j = 0; j < subcourtIDs.length; j++) {
                    if (subcourtID + 1 == subcourtIDs[j]) {
                        subcourtIDs[j] = 0;
                        subcourtStakes[j] = 0;
                        break;
                    }
                }
            } else if (stake >= courtMinStake) {
                bool subcourtFound = false;
                // First, look for the subcourt among the subcourts the user has already staked in.
                for (j = 0; j < subcourtIDs.length; j++) {
                    if (subcourtID + 1 != subcourtIDs[j]) continue; // Keep looking

                    if (klerosLiquid.pinakion().balanceOf(_account) >= stakedTokens - subcourtStakes[j] + stake) {
                        stakedTokens = stakedTokens - subcourtStakes[j] + stake;
                        subcourtStakes[j] = stake;
                    }
                    subcourtFound = true;
                    break;
                }
                if (!subcourtFound) {
                    // The user's stake in the subcourt is 0 at the moment. 
                    // If there is space, add the subcourt ID and the new stake to the list.
                    for (j = 0; j < subcourtIDs.length; j++) {
                        if (subcourtIDs[j] != 0) continue; // subcourt already set.

                        if (klerosLiquid.pinakion().balanceOf(_account) >= stakedTokens - subcourtStakes[j] + stake) {
                            subcourtIDs[j] = subcourtID + 1;
                            stakedTokens = stakedTokens - subcourtStakes[j] + stake;
                            subcourtStakes[j] = stake;
                        }
                        break; // Stake assigned to subcourt.
                    }
                }
            }
        }
    }
}
