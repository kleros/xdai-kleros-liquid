/**
 *  https://contributing.kleros.io/smart-contract-workflow
 *  @authors: [@fnanni-0]
 *  @reviewers: [@shalzz]
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 */
pragma solidity ^0.4.24;

import { TokenController } from "minimetoken/contracts/TokenController.sol";
import { MiniMeTokenERC20 as Pinakion } from "@kleros/kleros-interaction/contracts/standard/arbitration/ArbitrableTokens/MiniMeTokenERC20.sol";
import { ITokenBridge } from "../interfaces/ITokenBridge.sol";
import { IERC677 } from "../interfaces/IERC677.sol";

contract WPNK is Pinakion {
    IERC677 public constant xPinakion = IERC677(0x37b60f4E9A31A64cCc0024dce7D0fD07eAA0F7B3); // Pinakion on xDai to be wrapped. This token is upgradeable.
    ITokenBridge public constant tokenBridge = ITokenBridge(0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d); // xDai Token Bridge. The Token Bridge is upgradeable.

    /** @dev Constructor to create a MiniMeTokenERC20
     *  @param _tokenFactory The address of the MiniMeTokenFactory contract that will
     *   create the Clone token contracts, the token factory needs to be deployed first
     *  @param _parentToken Address of the parent token, set to 0x0 if it is a new token
     *  @param _parentSnapShotBlock Block of the parent token that will determine the
     *   initial distribution of the clone token, set to 0 if it is a new token
     *  @param _tokenName Name of the new token
     *  @param _decimalUnits Number of decimals of the new token
     *  @param _tokenSymbol Token Symbol for the new token
     *  @param _transfersEnabled If true, tokens will be able to be transferred
     */
    constructor(
        address _tokenFactory,
        address _parentToken,
        uint _parentSnapShotBlock,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol,
        bool _transfersEnabled
    )  Pinakion(
        _tokenFactory,
        _parentToken,
        _parentSnapShotBlock,
        _tokenName,
        _decimalUnits,
        _tokenSymbol,
        _transfersEnabled
    ) public {}

    function deposit(uint _amount) external {
        _generateTokens(msg.sender, _amount);
        require(xPinakion.transferFrom(msg.sender, address(this), _amount), "Sender does not have enough approved funds.");
    }

    function withdraw(uint _amount) external {
        _destroyTokens(msg.sender, _amount);
        require(xPinakion.transfer(msg.sender, _amount), "The `transfer` function must not fail.");
    }

    /** @dev This function is not strictly needed, but provides a good UX to users who want to get their Mainnet's PNK back. 
     *  What normally takes 3 transactions, here is done in one go. 
     */ 
    function withdrawAndConvertToPNK(uint _amount, address _receiver) external {
        _destroyTokens(msg.sender, _amount);
        
        // Using approve is safe here, because this contract approves the bridge to spend the tokens and triggers the relay immediately.
        xPinakion.approve(address(tokenBridge), _amount);
        tokenBridge.relayTokens(xPinakion, _receiver, _amount);
    }

    /** @dev Generates `_amount` tokens that are assigned to `_owner`.
     *  See https://github.com/Giveth/minime/blob/ea04d950eea153a04c51fa510b068b9dded390cb/contracts/MiniMeToken.sol#L372-L386.
     *  @param _owner The address that will be assigned the new tokens.
     *  @param _amount The quantity of tokens generated.
     */
    function _generateTokens(address _owner, uint _amount) internal {
        uint curTotalSupply = totalSupply();
        require(curTotalSupply + _amount >= curTotalSupply); // Check for overflow
        uint previousBalanceTo = balanceOf(_owner);
        require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
        updateValueAtNow(totalSupplyHistory, curTotalSupply + _amount);
        updateValueAtNow(balances[_owner], previousBalanceTo + _amount);
        emit Transfer(0, _owner, _amount);
    }

    /** @dev Burns `_amount` tokens from `_owner`.
     *  See https://github.com/Giveth/minime/blob/ea04d950eea153a04c51fa510b068b9dded390cb/contracts/MiniMeToken.sol#L389-L403.
     *  @param _owner The address that will lose the tokens.
     *  @param _amount The quantity of tokens to burn.
     */
    function _destroyTokens(address _owner, uint _amount) internal {
        if (isContract(controller)) {
            require(TokenController(controller).onTransfer(_owner, address(0x0), _amount));
        }
        uint curTotalSupply = totalSupply();
        require(curTotalSupply >= _amount);
        uint previousBalanceFrom = balanceOf(_owner);
        require(previousBalanceFrom >= _amount);
        updateValueAtNow(totalSupplyHistory, curTotalSupply - _amount);
        updateValueAtNow(balances[_owner], previousBalanceFrom - _amount);
        emit Transfer(_owner, 0, _amount);
    }
}
