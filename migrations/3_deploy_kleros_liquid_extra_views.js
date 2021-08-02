var xKlerosLiquidExtraViews = artifacts.require("./xKlerosLiquidExtraViews.sol");

const xKlerosLiquidAddress = {
  "xdai": "0x9C1dA9A04925bDfDedf0f6421bC7EEa8305F9002",
  "sokol-fork": "0xb701ff19fBD9702DD7Ca099Ee7D0D42a2612baB5",
  "sokol": "0xb701ff19fBD9702DD7Ca099Ee7D0D42a2612baB5"
}

module.exports = async function(deployer, network) {

  if (network == "development") {
    return
  }
  
  const ExtraViewsInstance = await deployer.deploy(
    xKlerosLiquidExtraViews,
    xKlerosLiquidAddress[network]
  );

  console.log('Deployed Extra Views: ', ExtraViewsInstance.address);
};