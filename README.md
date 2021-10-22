## DOCUMENTATION

XAuto is an automated yield aggregator on Polygon designed to automatically seek the best yield from DeFi protocols by automatically shifting funds across  protocols to the protocol with the highest yield. 

This ensures that users don’t have to have to manually check for protocols with the highest APYs. Our smart contracts perform all these operations automatically.

We are using 3 lending protocols on Polygon mainnet(AAVE, Fulcrum and ForTube). Our protocol design pattern allows us to dynamically add new protocols without breaking the original design.

## XAuto - Smart Contract Operations:

![Operation_img](https://github.com/xendfinance/polygon-earn/blob/main/operations.png)

### 1. Deposit
* Selects lending provider
Gets APYs from lending protocols and selects max APY from them.
Sets a new lending provider with it.
*Withdraws all token balances from lending protocols and supplies them to the new provider( lending protocol with max APY).

### 2. Withdraw
* Checks balance
If the balance is enough, withdraw the supported token amount.
* In other cases, if it isn’t enough, withdraw the deficit amount from other lending protocols and send the amount requested by the investor to the investor 

### 3. Rebalance
* Selects a lending provider with max APY and withdraws balances from other lending protocols and then supplies the withdrawn token to selected lending provider with max APY

## Fork mainnet for testing

ganache-cli --fork https://polygon-mainnet.infura.io/v3/INFURA_KEY  --port 8545 --chainId 1337 --unlock 0xc2132d05d31c914a87c6611c10748aeb04b58e8f --unlock 0x2791bca1f2de4661ed88a30c99a7a9449aa84174 --unlock 0x2cF7252e74036d1Da831d11089D326296e64a728 --unlock 0xc2132D05D31c914a87C6611C10748AEb04B58e8F --unlock 0xD6DF932A45C0f255f85145f286eA0b292B21C90B --unlock 0xEc0EFFAb58756E8836896220ca73776b9Dc52251 --unlock 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270 --unlock 0xadbF1854e5883eB8aa7BAf50705338739e558E5b --unlock 0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6 --unlock 0xdC9232E2Df177d7a12FdFf6EcBAb114E2231198D --unlock 0x2cf7252e74036d1da831d11089d326296e64a728

## Deployed Contracts
Visit https://docs.xend.finance/contracts/registry to see smart contract addresses
