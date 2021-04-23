/**
 *  https://contributing.kleros.io/smart-contract-workflow
 *  @authors: [@fnanni-0]
 *  @reviewers: [@unknownunknown1]
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 */
pragma solidity ^0.4.24;

import "openzeppelin-eth/contracts/zos-lib/Initializable.sol";
import "openzeppelin-eth/contracts/math/SafeMath.sol";
import { TokenController } from "minimetoken/contracts/TokenController.sol";
import { ITokenBridge } from "../interfaces/ITokenBridge.sol";
import { IERC677 } from "../interfaces/IERC677.sol";

contract WrappedPinakion is Initializable {

    using SafeMath for uint256;

    /* Events */

    /**
    * @dev Emitted when `value` tokens are moved from one account (`from`) to another (`to`).
    *
    * Note that `value` may be zero.
    */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
    * @dev Emitted when the allowance of a `spender` for an `owner` is set by
    * a call to {approve}. `value` is the new allowance.
    */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /* Storage */

    mapping (address => uint256) private balances;
    mapping (address => mapping (address => uint256)) public allowance;

    /// @dev Total supply of the token. Equals the total xPinakion deposit into the contract.
    uint256 public totalSupply;

    /// @dev Name of the token.
    string public name;

    /// @dev Symbol of the token.
    string public symbol;

    /// @dev Number of decimals of the token.
    uint8 public decimals;

    /// @dev The token's controller.
    address public controller;

    /// @dev Pinakion on xDai to be wrapped. This token is upgradeable.
    IERC677 public xPinakion;

    /// @dev xDai Token Bridge. The Token Bridge is upgradeable.
    ITokenBridge public tokenBridge;

    /* Modifiers */

    /// @dev Verifies that the sender has ability to modify controlled parameters.
    modifier onlyController() {
        require(controller == msg.sender, "The caller is not the controller.");
        _;
    }

    /* Initializer */

    /** @dev Constructor.
     *  @param _name for the wrapped Pinakion on the home chain.
     *  @param _symbol for wrapped Pinakion ticker on the home chain.
     *  @param _xPinakion the home pinakion contract which is already bridged to the foreign pinakion contract.
     *  @param _tokenBridge the TokenBridge contract.
     */
    function initialize(
        string memory _name, 
        string memory _symbol, 
        IERC677 _xPinakion, 
        ITokenBridge _tokenBridge
    ) public initializer {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        xPinakion = _xPinakion;
        tokenBridge = _tokenBridge;

        controller = msg.sender;
    }

    /* External */

    /** @dev Changes `controller` to `_controller`.
     *  @param _controller The new controller of the contract
     */
    function changeController(address _controller) public onlyController {
        controller = _controller;
    }


    /** @dev Converts bridged pinakions into pinakions which can be staked in KlerosLiquid.
     *  @param _amount The amount of wrapped pinakions to mint.
     */
    function deposit(uint _amount) external {
        _mint(_amount);
        require(xPinakion.transferFrom(msg.sender, address(this), _amount), "Sender does not have enough approved funds.");
    }


    /** @dev Withdraws bridged pinakions.
     *  @param _amount The amount of bridged pinakions to withdraw.
     */
    function withdraw(uint _amount) external {
        _burn(_amount);
        require(xPinakion.transfer(msg.sender, _amount), "The `transfer` function must not fail.");
    }

    /** @dev This function is not strictly needed, but it provides a good UX to users who want to get their Mainnet's PNK back. 
     *  What normally takes 3 transactions, here is done in one go. 
     *  Notice that the PNK have to be claimed on mainnet's TokenBride by the receiver.
     *  @param _amount The amount of bridged pinakions to withdraw.
     *  @param _receiver The address which will receive the PNK back in the foreign chain.
     */ 
    function withdrawAndConvertToPNK(uint _amount, address _receiver) external {
        _burn(_amount);
        // Using approve is safe here, because this contract approves the bridge to spend the tokens and triggers the relay immediately.
        xPinakion.approve(address(tokenBridge), _amount);
        tokenBridge.relayTokens(xPinakion, _receiver, _amount);
    }

    /** @dev Moves `_amount` tokens from the caller's account to `_recipient`.
     *  @param _recipient The entity receiving the funds.
     *  @param _amount The amount to tranfer in base units.
     */
    function transfer(address _recipient, uint256 _amount) public returns (bool) {
        if (isContract(controller)) {
            require(TokenController(controller).onTransfer(msg.sender, _recipient, _amount));
        }
        balances[msg.sender] = balances[msg.sender].sub(_amount); // ERC20: transfer amount exceeds balance
        balances[_recipient] = balances[_recipient].add(_amount);
        emit Transfer(msg.sender, _recipient, _amount);
        return true;
    }

    /** @dev Moves `_amount` tokens from `_sender` to `_recipient` using the
     *  allowance mechanism. `_amount` is then deducted from the caller's allowance.
     *  @param _sender The entity to take the funds from.
     *  @param _recipient The entity receiving the funds.
     *  @param _amount The amount to tranfer in base units.
     */
    function transferFrom(address _sender, address _recipient, uint256 _amount) public returns (bool) {
        if (isContract(controller)) {
            require(TokenController(controller).onTransfer(_sender, _recipient, _amount));
        }

        /** The controller of this contract can move tokens around at will,
         *  this is important to recognize! Confirm that you trust the
         *  controller of this contract, which in most situations should be
         *  another open source smart contract or 0x0.
         */
        if (msg.sender != controller) {
            allowance[_sender][msg.sender] = allowance[_sender][msg.sender].sub(_amount); // ERC20: transfer amount exceeds allowance.
        }
        
        balances[_sender] = balances[_sender].sub(_amount); // ERC20: transfer amount exceeds balance
        balances[_recipient] = balances[_recipient].add(_amount);
        emit Transfer(_sender, _recipient, _amount);
        return true;
    }

    /** @dev Approves `_spender` to spend `_amount`.
     *  @param _spender The entity allowed to spend funds.
     *  @param _amount The amount of base units the entity will be allowed to spend.
     */
    function approve(address _spender, uint256 _amount) public returns (bool) {
        // Alerts the token controller of the approve function call
        if (isContract(controller)) {
            require(TokenController(controller).onApprove(msg.sender, _spender, _amount), "Token controller does not approve.");
        }

        allowance[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    /** @dev Increases the `_spender` allowance by `_addedValue`.
     *  @param _spender The entity allowed to spend funds.
     *  @param _addedValue The amount of extra base units the entity will be allowed to spend.
     */
    function increaseAllowance(address _spender, uint256 _addedValue) public returns (bool) {
        uint256 newAllowance = allowance[msg.sender][_spender].add(_addedValue);
        // Alerts the token controller of the approve function call
        if (isContract(controller)) {
            require(TokenController(controller).onApprove(msg.sender, _spender, newAllowance), "Token controller does not approve.");
        }

        allowance[msg.sender][_spender] = newAllowance;
        emit Approval(msg.sender, _spender, newAllowance);
        return true;
    }

    /** @dev Decreases the `_spender` allowance by `_subtractedValue`.
     *  @param _spender The entity whose spending allocation will be reduced.
     *  @param _subtractedValue The reduction of spending allocation in base units.
     */
    function decreaseAllowance(address _spender, uint256 _subtractedValue) public returns (bool) {
        uint256 newAllowance = allowance[msg.sender][_spender].sub(_subtractedValue); // ERC20: decreased allowance below zero
        // Alerts the token controller of the approve function call
        if (isContract(controller)) {
            require(TokenController(controller).onApprove(msg.sender, _spender, newAllowance), "Token controller does not approve.");
        }

        allowance[msg.sender][_spender] = newAllowance;
        emit Approval(msg.sender, _spender, newAllowance);
        return true;
    }

    /* Internal */

    /**
    * @dev Internal function that mints an amount of the token and assigns it to
    * an account. This encapsulates the modification of balances such that the
    * proper events are emitted.
    * @param _amount The amount that will be created.
    */
    function _mint(uint256 _amount) internal {
        totalSupply = totalSupply.add(_amount);
        balances[msg.sender] = balances[msg.sender].add(_amount);
        emit Transfer(address(0x0), msg.sender, _amount);
    }

    /** @dev Destroys `_amount` tokens from the caller. Cannot burn locked tokens.
     *  @param _amount The quantity of tokens to burn in base units.
     */
    function _burn(uint256 _amount) internal {
        if (isContract(controller)) {
            require(TokenController(controller).onTransfer(msg.sender, address(0x0), _amount));
        }
        balances[msg.sender] = balances[msg.sender].sub(_amount); // ERC20: burn amount exceeds balance
        totalSupply = totalSupply.sub(_amount);
        emit Transfer(msg.sender, address(0x0), _amount);
    }

    /** @dev Internal function to determine if an address is a contract.
     *  @param _addr The address being queried.
     *  @return True if `_addr` is a contract.
     */
    function isContract(address _addr) internal view returns(bool) {
        uint size;
        if (_addr == 0) return false;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    /* Getters */

    /**
    * @dev Gets the balance of the specified address.
    * @param _owner The address to query the balance of.
    * @return uint256 value representing the amount owned by the passed address.
    */
    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }
}