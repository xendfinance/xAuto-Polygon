// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
struct ReserveConfigurationMap {
    uint256 data;
}
struct ReserveData {
    ReserveConfigurationMap configuration; uint128 liquidityIndex; uint128 variableBorrowIndex; uint128 currentLiquidityRate; uint128 currentVariableBorrowRate; uint128 currentStableBorrowRate; uint40 lastUpdateTimestamp; address aTokenAddress; address stableDebtTokenAddress; address variableDebtTokenAddress; address interestRateStrategyAddress; uint8 id;
}
interface Aave {
    function deposit(address _reserve, uint256 _amount, address onBehalfOf, uint16 _referralCode) external;
    function withdraw(address _token, uint256 _amount, address _to) external returns(uint256);
    function getReserveData(address _token) external view returns(ReserveData memory reserve);
}