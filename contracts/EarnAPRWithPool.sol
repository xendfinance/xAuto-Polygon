// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

interface IAPRWithPoolOracle {

  function getFulcrumAPR(address token) external view returns(uint256);
  function getFulcrumAPRAdjusted(address token, uint256 _supply) external view returns(uint256);
  function getAaveCore() external view returns (address);
  function getAaveAPR(address token) external view returns (uint256);
  function getAaveAPRAdjusted(address token) external view returns (uint256);
  function getFortubeAPRAdjusted(address token) external view returns (uint256);
  function AAVE() external view returns (address);

}

interface IUniswapFactory {
    function getExchange(address token) external view returns (address exchange);
}

interface IxToken {
  function calcPoolValueInToken() external view returns (uint256);
  function decimals() external view returns (uint256);
}

interface ILendingPoolAddressesProvider{
  function getAddress(bytes32 id) external view returns (address);
}

interface IProtocolProvider {
    function getReserveConfigurationData(address token) external view returns (
      uint256 decimals,
      uint256 ltv,
      uint256 liquidationThreshold,
      uint256 liquidationBonus,
      uint256 reserveFactor,
      bool usageAsCollateralEnabled,
      bool borrowingEnabled,
      bool stableBorrowRateEnabled,
      bool isActive,
      bool isFrozen
    );
}

contract EarnAPRWithPool is Context, Initializable {
    using SafeMath for uint;
    using Address for address;

    address private _owner;
    address private _candidate;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    mapping(address => uint256) public pools;
    mapping(address => address) public fulcrum;
    mapping(address => address) public fortube;

    address public APR;

    constructor() public {}

    function initialize(
      address _apr
    ) public initializer{
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
        APR = _apr;
        addFToken(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 0x81B91c9a68b94F88f3DFC4F375f101223dDd5007); //fMATIC
        addFToken(0xc2132D05D31c914a87C6611C10748AEb04B58e8F, 0x5BFAC8a40782398fb662A69bac8a89e6EDc574b1); //fUSDT
        addFToken(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174, 0xC3f6816C860e7d7893508C8F8568d5AF190f6d7d); //fUSDC
        // addFToken(0xD6DF932A45C0f255f85145f286eA0b292B21C90B, 0xf009c28b2D9E13886105714B895f013E2e43EE12); //fAAVE
        addFToken(0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6, 0x1a7189Af4e5f58Ddd0b9B195a53E5f4e4b55c949); //fWBTC

        addFTToken(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 0x33d6D5F813BF78163901b1e72Fb1fEB90E72fD72); //ftMatic
        addFTToken(0xc2132D05D31c914a87C6611C10748AEb04B58e8F, 0xE2272A850188B43E94eD6DF5b75f1a2FDcd5aC26); //ftUSDT
        addFTToken(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174, 0xf330b39f74e7f71ab9604A5307690872b8125aC8); //ftUSDC
        addFTToken(0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6, 0x57160962Dc107C8FBC2A619aCA43F79Fd03E7556); //ftWBTC
    }

    // Wrapper for legacy v1 token support
    function recommend(address _token) public view returns (
      string memory choice,
      uint256 fapr,
      uint256 aapr,
      uint256 ftapr
    ) {
      (fapr,aapr,ftapr) = getAPROptionsInc(_token);
      return (choice, fapr, aapr, ftapr);
    }

    function getAPROptionsInc(address _token) public view returns (
      uint256 _fulcrum,
      uint256 _aave,
      uint256 _fortube
    ) {

      address addr;
      addr = fulcrum[_token];
      if (addr != address(0)) {
        _fulcrum = IAPRWithPoolOracle(APR).getFulcrumAPRAdjusted(addr, 0);
      }
      addr = _token;
      if (getActiveTokenInAave(addr)) {
        _aave = IAPRWithPoolOracle(APR).getAaveAPRAdjusted(addr);
      }
      addr = fortube[_token];
      if (addr != address(0)) {
        _fortube = IAPRWithPoolOracle(APR).getFortubeAPRAdjusted(addr);
      }

      return (
        _fulcrum,
        _aave,
        _fortube
      );
    }

    function addFToken(
      address token,
      address fToken
    ) public onlyOwner {
        require(fulcrum[token] == address(0), "This token is already set.");
        fulcrum[token] = fToken;
    }

    function addFTToken(
      address token,
      address ftToken
    ) public onlyOwner {
        require(fortube[token] == address(0), "This token is already set.");
        fortube[token] = ftToken;
    }

    function set_new_APR(address _new_APR) public onlyOwner {
        APR = _new_APR;
    }

    function getActiveTokenInAave(address token) public view returns (bool isActive){
      address LendingPoolAddressesProvider = IAPRWithPoolOracle(APR).AAVE();
      address protocolProvider = ILendingPoolAddressesProvider(LendingPoolAddressesProvider).getAddress('0x1');
      IProtocolProvider provider = IProtocolProvider(protocolProvider);
      (,,,,,,,, isActive,) = provider.getReserveConfigurationData(token);
      return isActive;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _candidate = newOwner;
    }

    function acceptOwnership() external {
        require(msg.sender == _candidate, "Ownable: not cadidate");
        emit OwnershipTransferred(_owner, _candidate);
        _owner = _candidate;
    }
}