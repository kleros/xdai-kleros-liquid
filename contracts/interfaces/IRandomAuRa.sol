pragma solidity ^0.4.24;

///@dev See https://blockscout.com/poa/xdai/address/0x5870b0527DeDB1cFBD9534343Feda1a41Ce47766/contracts
///@dev Sokol testnet: https://blockscout.com/poa/sokol/address/0x8f2b78169B0970F11a762e56659Db52B59CBCf1B/contracts
interface IRandomAuRa {
    function currentSeed() external view returns (uint256);

    function isCommitPhase() external view returns (bool);

    function nextCommitPhaseStartBlock() external view returns (uint256);

    function collectRoundLength() external view returns (uint256);
}
