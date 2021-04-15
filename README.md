# xdai-kleros-liquid
Kleros Courts on xDai

# Testing PNK on Sokol-Kovan

MetaMask setup for Sokol: 
- Network Name: POA Sokol Testnet
- New RPC URL: https://sokol.poa.network
- ChainID: 0x4d (77)
- Symbol: SPOA
- Block Explorer URL: https://blockscout.com/poa/sokol

## Stake
1. Get Kovan PNK from [faucet](https://kovan.etherscan.io/address/0x4e95b2e0ecb3bd394e1dddd775504820a746d3bd#writeContract). The Kovan PNK contract address is 0x1ee318dbc19267dbce08f54a66ab198f73ede356.
1. Go to the [token bridge](https://sokol-omnibridge.web.app/bridge) and convert Kovan PNK into Sokol PNK. The Sokol PNK contract address is 0x184A7Fc4fa965D18Af84C6d97dfed8C4561ff8c2.
1. Sokol PNK are not directly used for staking. Instead, the token is wrapped in order to let xKlerosLiquid (the courts) be the controller of the PNK contract. To convert Sokol PNK into Sokol Wrapped PNK, first [approve](https://blockscout.com/poa/sokol/address/0x184A7Fc4fa965D18Af84C6d97dfed8C4561ff8c2/write-proxy) the amount you want to convert and then call [deposit](https://blockscout.com/poa/sokol/address/0x33009Fa50BBdECd5b5a38a593990768d64339933/write-contract).
1. Now, you are ready to stake in the Sokol general court. Go to xKlerosLiquid and stake! xKlerosLiquid is located at 0x128F75CD2C77962E28eCd7ac5066Caa89eD07a92. The contract is not verified yet. For the time being you can easily interact with it through Remix using the ABI.

## Unstake
1. Unstake from the Sokol general court. 
1. You can use `withdrawAndConvertToPNK()` [method](https://blockscout.com/poa/sokol/address/0x33009Fa50BBdECd5b5a38a593990768d64339933/write-contract) to directly convert the Sokol Wrapped PNK into Kovan PNK. If you use this method, it is possible to set the receiver. On the Kovan chain, the tokens have to be claimed though. Go to the [token bridge](https://sokol-omnibridge.web.app/bridge), connect MetaMask with your Kovan account and claim your tokens.
1. If you rather use the token bridge, call `withdraw()` [method](https://blockscout.com/poa/sokol/address/0x33009Fa50BBdECd5b5a38a593990768d64339933/write-contract) instead. On the Kovan chain, the tokens have to be claimed though. Go to the [token bridge](https://sokol-omnibridge.web.app/bridge), connect MetaMask with your Kovan account and claim your tokens.
