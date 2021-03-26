pragma solidity ^0.4.24;


///@dev See https://blockscout.com/poa/core/address/0x67e90a54AeEA85f21949c645082FE95d77BC1E70/contracts
interface IRandomAuRa {
    function currentSeed() external view returns(uint256);
    function isCommitPhase() external view returns(bool);
    function nextCommitPhaseStartBlock() public view returns(uint256);
    function collectRoundLength() public view returns(uint256);

}