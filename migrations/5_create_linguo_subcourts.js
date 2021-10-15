const xKlerosLiquid = artifacts.require("./xKlerosLiquid.sol");
const PolicyRegistry = artifacts.require("./PolicyRegistry.sol");

const xKlerosLiquidAddress = {
  "xdai": "0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002",
  "sokol-fork": "0xb701ff19fBD9702DD7Ca099Ee7D0D42a2612baB5",
  "sokol": "0xb701ff19fBD9702DD7Ca099Ee7D0D42a2612baB5"
}

const policyRegistryAddress = {
  "xdai": "0x9d494768936b6bDaabc46733b8D53A937A6c6D7e",
  "sokol-fork": "0x0Bee63bC7220d0Bacd8A3c9d6B6511126CDfe58f",
  "sokol": "0x0Bee63bC7220d0Bacd8A3c9d6B6511126CDfe58f"
}

const linguoSubcourts = [
  {
    name: "xDai English Language",
    policy: "/ipfs/QmPLD9Zj8aZj5sVH9WcsHXbARR3RfRnEwHRrVeDM8AbPLt/xDai-English-Language-Court-Policy.json",
    parentCourt: 0,
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('22.0','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 5000,
    jurorsForCourtJump: 63,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai Spanish-English Translation",
    policy: "/ipfs/QmXJbzzuKQQVa7PFrwhb8r4in1yy1sRRQseCZ6g8EZWpHZ/xDai-Spanish-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('9.4','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 1800,
    jurorsForCourtJump: 63,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai French-English Translation",
    policy: "/ipfs/QmUYsy6mVozbGn885ssCk3LKC8iXT363RwY7DH3QuRCu1Y/xDai-French-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('9.4','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 1800,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai Portuguese-English Translation",
    policy: "/ipfs/QmRZviKJzgkr6AyxcAULjnoQArt5DvNPssvEzVNxHjAUzb/xDai-Portuguese-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('9.4','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 1800,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai German-English Translation",
    policy: "/ipfs/Qmf6hiaVdzHHVV5jAp7AM6MA9EHLoAtVbbDnFDhPqwU4TL/xDai-German-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('12.0','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 2200,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai Russian-English Translation",
    policy: "/ipfs/QmViD1v5PBkYwtAeWiLktDZtBVCRvDd3LrLSzQ7TTEsTtb/xDai-Russian-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('12.0','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 2200,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai Korean-English Translation",
    policy: "/ipfs/QmZZaTxzkJsWd1JTKvSQsBPBSDWbPc5og6By7Vx8F7Wcdt/xDai-Korean-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('15.0','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 2800,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai Japanese-English Translation",
    policy: "/ipfs/QmWqxZhKFyR17JYU4GwXtumMinfACtw9z2r9cXumVcUbek/xDai-Japanese-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('15.0','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 2800,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai Turkish-English Translation",
    policy: "/ipfs/QmZxbiUdvC9CwsTiLGhqnnYYBUJNFp28ZNFWJfhSXFXY8K/xDai-Turkish-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('15.0','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 2800,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
  {
    name: "xDai Chinese-English Translation",
    policy: "/ipfs/QmTERr8X73QTnTXNDMSWew2znWYWrcgvFWTUbEJeXPXmBU/xDai-Chinese-English-Language-Court-Policy.json",
    parentCourt: 2,  // General: 0, Curation: 1, xDai English Language: 2.
    hiddenVotes: false,
    feeForJuror: web3.utils.toWei('15.0','ether'), // xDai
    minStake: web3.utils.toWei('1200','ether'), // stPNK
    alpha: 2800,
    jurorsForCourtJump: 31,
    timesPerPeriod: [280800,437400,437400,291600],
    sortitionSumTreeK: 5,
  },
]

module.exports = async function(deployer, network) {

  if (network == "development") {
    return
  }

  // Init xKlerosLiquid
  console.log("");
  const xKlerosLiquidInstance = await xKlerosLiquid.at(xKlerosLiquidAddress[network]);
  for (let i = 0; i < linguoSubcourts.length; i++) {
    const subcourt = linguoSubcourts[i];
    console.log("Creating subcourt: " + subcourt.name);
    await xKlerosLiquidInstance.createSubcourt(
      subcourt.parentCourt,
      subcourt.hiddenVotes,
      subcourt.minStake,
      subcourt.alpha,
      subcourt.feeForJuror,
      subcourt.jurorsForCourtJump,
      subcourt.timesPerPeriod,
      subcourt.sortitionSumTreeK
    );
  }

  // Init PolicyRegistry
  console.log("");
  const policyRegistryInstance = await PolicyRegistry.at(policyRegistryAddress[network]);
  for (let i = 0; i < linguoSubcourts.length; i++) {
    const subcourt = linguoSubcourts[i];
    console.log("Setting policy of subcourt: " + subcourt.name);
    const subcourtID = i + 2;
    await policyRegistryInstance.setPolicy(
      subcourtID,
      subcourt.policy
    )
  }
};