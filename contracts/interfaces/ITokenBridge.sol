pragma solidity ^0.4.24;

import {IERC677} from "../interfaces/IERC677.sol";

interface ITokenBridge {
    function relayTokens(
        IERC677 token,
        address _receiver,
        uint256 _value
    ) external;
}
