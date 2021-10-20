// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
interface FortubeBank {
    function deposit(address token, uint256 amount) external payable;
    function withdraw(address underlying, uint256 withdrawTokens) external returns (uint256);
    function controller() external returns (address);
}