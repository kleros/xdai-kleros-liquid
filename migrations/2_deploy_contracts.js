const { deployProxy } = require('@openzeppelin/truffle-upgrades');

var xWPinakion = artifacts.require("./WPNK.sol");
var xKlerosLiquid = artifacts.require("./xKlerosLiquid.sol");
var SortitionSumTreeFactory = artifacts.require("./SortitionSumTreeFactory.sol");

const pinakionParams = {
  "xdai": {
    tokenFactory: "0x0000000000000000000000000000000000000000",
    parentToken: "0x0000000000000000000000000000000000000000",
    parentSnapShotBlock: 0,
    tokenName: "Wrapped Pinakion on xDai",
    decimalUnits: 18,
    tokenSymbol: "xWPNK",
    transfersEnabled: true,
    xPinakion: "0x37b60f4E9A31A64cCc0024dce7D0fD07eAA0F7B3",
    tokenBridge: "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d"
  },
  "sokol-fork": {
    tokenFactory: "0x0000000000000000000000000000000000000000",
    parentToken: "0x0000000000000000000000000000000000000000",
    parentSnapShotBlock: 0,
    tokenName: "Wrapped Pinakion on Sokol",
    decimalUnits: 18,
    tokenSymbol: "SWPNK",
    transfersEnabled: true,
    xPinakion: "0x184A7Fc4fa965D18Af84C6d97dfed8C4561ff8c2",
    tokenBridge: "0x40cdff886715a4012fad0219d15c98bb149aef0e"
  }
}

let xKlerosLiquidParams = {
  "xdai": {
    governor: null,
    pinakion: null,
    RNGenerator: "0x67e90a54AeEA85f21949c645082FE95d77BC1E70",
    minStakingTime: 3600,
    maxDrawingTime: 7200,
    hiddenVotes: false,
    minStake: web3.utils.toWei('620','ether'),
    alpha: 10000,
    feeForJuror: web3.utils.toWei('40000000000000000','wei'),
    jurorsForCourtJump: 511,
    timesPerPeriod: [280800, 583200, 583200, 388800],
    sortitionSumTreeK: 2
  },
  "sokol-fork": {
    governor: null,
    pinakion: null,
    RNGenerator: "0x8f2b78169B0970F11a762e56659Db52B59CBCf1B",
    minStakingTime: 3600,
    maxDrawingTime: 7200,
    hiddenVotes: false,
    minStake: web3.utils.toWei('620','ether'),
    alpha: 10000,
    feeForJuror: web3.utils.toWei('40000000000000000','wei'),
    jurorsForCourtJump: 511,
    timesPerPeriod: [280800, 583200, 583200, 388800],
    sortitionSumTreeK: 2
  }
}

module.exports = async function(deployer, network) {

  if (network == "development") {
    return
  }

  const PNKInstance = await deployer.deploy(
    xWPinakion,
    pinakionParams[network].tokenFactory,
    pinakionParams[network].parentToken,
    pinakionParams[network].parentSnapShotBlock,
    pinakionParams[network].tokenName,
    pinakionParams[network].decimalUnits,
    pinakionParams[network].tokenSymbol,
    pinakionParams[network].transfersEnabled,
    pinakionParams[network].xPinakion,
    pinakionParams[network].tokenBridge
  );

  xKlerosLiquidParams[network].governor = deployer.networks[network].from; // deployer address
  xKlerosLiquidParams[network].pinakion = PNKInstance.address;
  await deployer.deploy(SortitionSumTreeFactory);
  await deployer.link(SortitionSumTreeFactory, xKlerosLiquid);
  const xKlerosLiquidInstance = await deployProxy(
    xKlerosLiquid, 
    [
      xKlerosLiquidParams[network].governor,
      xKlerosLiquidParams[network].pinakion,
      xKlerosLiquidParams[network].RNGenerator,
      xKlerosLiquidParams[network].minStakingTime,
      xKlerosLiquidParams[network].maxDrawingTime,
      xKlerosLiquidParams[network].hiddenVotes,
      xKlerosLiquidParams[network].minStake,
      xKlerosLiquidParams[network].alpha,
      xKlerosLiquidParams[network].feeForJuror,
      xKlerosLiquidParams[network].jurorsForCourtJump,
      xKlerosLiquidParams[network].timesPerPeriod,
      xKlerosLiquidParams[network].sortitionSumTreeK,
    ], 
    { deployer, unsafeAllowLinkedLibraries: true }
  );
  console.log('Deployed xKlerosLiquid: ', xKlerosLiquidInstance.address);

  await PNKInstance.changeController(xKlerosLiquidInstance.address)
  
};