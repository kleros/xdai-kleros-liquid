pragma solidity ^0.4.24;


///@dev See https://blockscout.com/poa/core/address/0x67e90a54AeEA85f21949c645082FE95d77BC1E70/contracts
///@dev Sokol testnet: https://blockscout.com/poa/sokol/address/0x8f2b78169B0970F11a762e56659Db52B59CBCf1B/contracts
interface IRandomAuRa {
    function currentSeed() external view returns(uint256);
    function isCommitPhase() external view returns(bool);
    function nextCommitPhaseStartBlock() external view returns(uint256);
    function collectRoundLength() external view returns(uint256); // 40
}