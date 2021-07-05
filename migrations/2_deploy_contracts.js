const { deployProxy } = require('@openzeppelin/truffle-upgrades');

var WrappedPinakion = artifacts.require("./WrappedPinakion.sol");
var xKlerosLiquid = artifacts.require("./xKlerosLiquid.sol");
var PolicyRegistry = artifacts.require("./PolicyRegistry.sol");
var xKlerosLiquidExtraViews = artifacts.require("./xKlerosLiquidExtraViews.sol");
var SortitionSumTreeFactory = artifacts.require("./SortitionSumTreeFactory.sol");

const pinakionParams = {
  "xdai": {
    tokenName: "Staking PNK on xDai",
    tokenSymbol: "stPNK",
    xPinakion: "0x37b60f4E9A31A64cCc0024dce7D0fD07eAA0F7B3",
    tokenBridge: "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d"
  },
  "sokol-fork": {
    tokenName: "Staking PNK on Sokol",
    tokenSymbol: "stPNK",
    xPinakion: "0x184A7Fc4fa965D18Af84C6d97dfed8C4561ff8c2",
    tokenBridge: "0x40cdff886715a4012fad0219d15c98bb149aef0e"
  },
  "sokol": {
    tokenName: "Staking PNK on Sokol",
    tokenSymbol: "stPNK",
    xPinakion: "0x184A7Fc4fa965D18Af84C6d97dfed8C4561ff8c2",
    tokenBridge: "0x40cdff886715a4012fad0219d15c98bb149aef0e"
  }
}

let xKlerosLiquidParams = {
  "xdai": {
    governor: null,
    pinakion: null,
    RNGenerator: "0x5870b0527DeDB1cFBD9534343Feda1a41Ce47766",
    minStakingTime: 3600,
    maxDrawingTime: 7200,
    hiddenVotes: true,
    minStake: web3.utils.toWei('520','ether'), // stPNK
    alpha: 5000,
    feeForJuror: web3.utils.toWei('15','ether'), // xDai
    jurorsForCourtJump: 511,
    timesPerPeriod: [280800, 583200, 583200, 388800],
    sortitionSumTreeK: 6,
  },
  "sokol-fork": {
    governor: null,
    pinakion: null,
    RNGenerator: "0x8f2b78169B0970F11a762e56659Db52B59CBCf1B",
    minStakingTime: 3600,
    maxDrawingTime: 7200,
    hiddenVotes: true,
    minStake: web3.utils.toWei('520','ether'),
    alpha: 5000,
    feeForJuror: web3.utils.toWei('0.04','ether'),
    jurorsForCourtJump: 511,
    timesPerPeriod: [280800, 583200, 583200, 388800],
    sortitionSumTreeK: 6,
  },
  "sokol": {
    governor: null,
    pinakion: null,
    RNGenerator: "0x8f2b78169B0970F11a762e56659Db52B59CBCf1B",
    minStakingTime: 3600,
    maxDrawingTime: 7200,
    hiddenVotes: true,
    minStake: web3.utils.toWei('520','ether'),
    alpha: 5000,
    feeForJuror: web3.utils.toWei('0.04','ether'),
    jurorsForCourtJump: 511,
    timesPerPeriod: [280800, 583200, 583200, 388800],
    sortitionSumTreeK: 6,
  }
}

const curateCourt = {
  parentCourt: 0,
  hiddenVotes: false,
  minStake: web3.utils.toWei('520','ether'), // stPNK
  alpha: 3100,
  feeForJuror: web3.utils.toWei('6.9','ether'), // xDai
  jurorsForCourtJump: 30,
  timesPerPeriod: [140400, 291600, 291600, 194400],
  sortitionSumTreeK: 5,
}

module.exports = async function(deployer, network) {

  if (network == "development") {
    return
  }

  const PNKInstance = await deployProxy(
    WrappedPinakion,
    [
      pinakionParams[network].tokenName,
      pinakionParams[network].tokenSymbol,
      pinakionParams[network].xPinakion,
      pinakionParams[network].tokenBridge
    ],
    { deployer }
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

  await xKlerosLiquidInstance.createSubcourt(
    curateCourt.parentCourt,
    curateCourt.hiddenVotes,
    curateCourt.minStake,
    curateCourt.alpha,
    curateCourt.feeForJuror,
    curateCourt.jurorsForCourtJump,
    curateCourt.timesPerPeriod,
    curateCourt.sortitionSumTreeK
  )

  await PNKInstance.changeController(xKlerosLiquidInstance.address)

  const ExtraViewsInstance = await deployer.deploy(
    xKlerosLiquidExtraViews,
    xKlerosLiquidInstance.address
  );

  const PolicyRegistryInstance = await deployer.deploy(
    PolicyRegistry,
    deployer.networks[network].from // deployer address
  );
  await PolicyRegistryInstance.setPolicy(
    0,
    "/ipfs/QmTsPLwhozEqjWnYKsnamZiJW47LFT7LzkQhKw5ygQxqyH/xDai-General-Court-Policy.json" 
  )
  await PolicyRegistryInstance.setPolicy(
    1,
    "/ipfs/QmWQDgtUWALrnCgakAAoFWdX1P7iDGmr5imZLZzyYtPqcE/xDai-Curation-Court-Policy.json" 
  )
  
  console.log('Deployed Wrapped PNK: ', PNKInstance.address);
  console.log('Deployed xKlerosLiquid: ', xKlerosLiquidInstance.address);
  console.log('Deployed Extra Views: ', ExtraViewsInstance.address);
  console.log('Deployed Policy Registry: ', PolicyRegistryInstance.address);
};