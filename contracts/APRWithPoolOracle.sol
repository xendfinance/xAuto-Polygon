// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/utils/Context.sol";
import '@openzeppelin/contracts/math/SafeMath.sol';
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

// Fulcrum
interface IFulcrum {
  function supplyInterestRate() external view returns (uint256);
  function nextSupplyInterestRate(uint256 supplyAmount) external view returns (uint256);
}

interface IFortube {
    function APY() external view returns (uint256);
}


interface IProtocolProvider {
    function getReserveData(
        address token
    )
    external
    view
    returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp);
}

interface ILendingPoolAddressesProvider{
  function getAddress(bytes32 id) external view returns (address);
}

contract Structs {
  struct Asset {
    address lendingPool;
    address priceOralce;
    address interestModel;
  }
}

contract APRWithPoolOracle is Context, Structs, Initializable {
  using SafeMath for uint256;
  using Address for address;

  address private _owner;
  address private _candidate;

  bool public fulcrumStatus;
  bool public fortubeStatus;
  bool public aaveStatus;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  uint256 DECIMAL = 10 ** 18;
  address public AAVE;

  constructor() public {}

  function initialize() public initializer{
    address msgSender = _msgSender();
    _owner = msgSender;
    emit OwnershipTransferred(address(0), msgSender);
    AAVE = address(0xd05e3E715d945B59290df0ae8eF85c1BdB684744);
    fulcrumStatus = false;
    fortubeStatus = true;
    aaveStatus = true;
  }

  function getFulcrumAPRAdjusted(address token, uint256 _supply) public view returns(uint256) {
    if(token == address(0) || !fulcrumStatus)
      return 0;
    else
      return IFulcrum(token).supplyInterestRate().mul(1e7); // normalize all apy's of aave, fulcrum, fortube
  }

  function getAaveAPRAdjusted(address token) public view returns (uint256) {
    address protocolProvider = ILendingPoolAddressesProvider(AAVE).getAddress('0x1');
    if(token == address(0) || !aaveStatus)
      return 0;
    else{
      IProtocolProvider provider = IProtocolProvider(protocolProvider);
      (,,,uint256 liquidityRate,,,,,,) = provider.getReserveData(token);
      return liquidityRate;
    }
  }
  function getFortubeAPRAdjusted(address token) public view returns (uint256) {
    if(token == address(0) || !fortubeStatus)
      return 0;
    else{
      IFortube fortube = IFortube(token);
      return fortube.APY().mul(1e9);    // normalize all apy's of aave, fulcrum, fortube
    }
  }

  function setFulcrumStatus(bool status) external onlyOwner{
    fulcrumStatus = status;
  }

  function setFortubeStatus(bool status) external onlyOwner{
    fortubeStatus = status;
  }

  function setAaveStatus(bool status) external onlyOwner{
    aaveStatus = status;
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