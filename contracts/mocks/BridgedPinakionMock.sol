pragma solidity ^0.4.24;

import "openzeppelin-eth/contracts/token/ERC20/ERC20.sol";

// mock class using ERC20
contract BridgedPinakionMock is ERC20 {
    function initialize(address _initialAccount, uint256 _initialSupply)
        public
        initializer
    {
        _mint(_initialAccount, _initialSupply);
    }
}
