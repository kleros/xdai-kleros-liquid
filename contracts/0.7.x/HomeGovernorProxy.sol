/**
 * @authors: [@fnanni-0]
 * @reviewers: []
 * @auditors: []
 * @bounties: []
 * @deployments: []
 *
 * SPDX-License-Identifier: MIT
 */
pragma solidity ^0.7.2;

import "./dependencies/IAMB.sol";

contract HomeGovernorProxy {

    /// @dev The contract governor. TRUSTED.
    address public foreignGovernor;

    /// @dev ArbitraryMessageBridge contract address. TRUSTED.
    IAMB public amb;

    /// @dev The chain ID where the foreign proxy is deployed.
    uint256 public foreignChainId;

    /* Modifiers */

    modifier onlyGovernor() {
        require(msg.sender == address(amb), "Only AMB allowed");
        require(amb.messageSourceChainId() == bytes32(foreignChainId), "Only foreign chain allowed");
        require(amb.messageSender() == foreignGovernor, "Only foreign governor allowed");
        _;
    }

    /* Constructor */

    /**
     * @dev Creates a governance proxy on the home chain.  
     * @param _amb ArbitraryMessageBridge contract address.
     * @param _foreignGovernor The governor's address in the foreign chain.
     * @param _foreignChainId The ID of the chain where the foreign governor is deployed.
     */
    constructor(IAMB _amb, address _foreignGovernor, uint256 _foreignChainId) {
        amb = _amb;
        foreignGovernor = _foreignGovernor;
        foreignChainId = _foreignChainId;
    }

    /* External */

    /**
     * @notice Sets the address of a new governor.
     * @param _foreignGovernor The address of the new governor in the foreign chain.
     */
    function changeGovernor(address _foreignGovernor) external onlyGovernor {
        foreignGovernor = _foreignGovernor;
    }

    /**
     * @notice Sets the address of the ArbitraryMessageBridge.
     * @param _amb The address of the new ArbitraryMessageBridge.
     */
    function changeAmb(IAMB _amb) external onlyGovernor {
        amb = _amb;
    }

    /**
     * @notice Sets the chain Id of the new governor.
     * @param _foreignChainId The ID of the chain where the foreign governor is deployed.
     */
    function changeChainId(uint256 _foreignChainId) external onlyGovernor {
        foreignChainId = _foreignChainId;
    }

    /** @dev Lets the governor call anything on behalf of the contract.
     *  @param _destination The destination of the call.
     *  @param _amount The value sent with the call.
     *  @param _data The data sent with the call.
     */
    function executeGovernorProposal(address _destination, uint256 _amount, bytes calldata _data) external onlyGovernor {
        (bool success,) = _destination.call{value: _amount}(_data); // solium-disable-line security/no-call-value
        require(success, "Governor's proposal not executed.");
    }

    /// @dev this contract will probably receive xDai from xKlerosLiquid and the AMB.
    receive() external payable {}
}
