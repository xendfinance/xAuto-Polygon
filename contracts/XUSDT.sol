// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "./libraries/Ownable.sol";
import './libraries/TokenStructs.sol';
import './interfaces/Aave.sol';
import './interfaces/FortubeToken.sol';
import './interfaces/FortubeBank.sol';
import './interfaces/Fulcrum.sol';
import './interfaces/IIEarnManager.sol';
import './interfaces/LendingPoolAddressesProvider.sol';
import './interfaces/ITreasury.sol';

contract xUSDT is Context, IERC20, ReentrancyGuard, Ownable, TokenStructs, Initializable {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  uint256 public pool;
  address public token;
  address public fulcrum;
  address public aave;
  address public aaveToken;
  address public apr;
  address public fortubeToken;
  address public fortubeBank;
  address public feeAddress;
  uint256 public feeAmount;
  uint256 public feePrecision;
  uint256 private lastWithdrawFeeTime;
  uint256 public totalDepositedAmount;

  mapping (address => uint256) depositedAmount;

  enum Lender {
      NONE,
      AAVE,
      FULCRUM,
      FORTUBE
  }
  mapping (Lender => bool) public lenderStatus;
  mapping (Lender => bool) public withdrawable;

  Lender public provider = Lender.NONE;

  mapping (address => uint256) private _balances;

  mapping (address => mapping (address => uint256)) private _allowances;

  uint256 private _totalSupply;

  string private _name;
  string private _symbol;
  uint8 private _decimals;

  constructor () public {}

  function initialize(
    address _apr
  ) public initializer{
    apr = _apr;
    _name = "xend USDT";
    _symbol = "xUSDT";
    token = address(0xc2132D05D31c914a87C6611C10748AEb04B58e8F);
    aave = address(0xd05e3E715d945B59290df0ae8eF85c1BdB684744);
    feeAddress = address(0x9D42c2F50D5e8868B1f11a403f090b8a8b698dbE);
    fulcrum = address(0x5BFAC8a40782398fb662A69bac8a89e6EDc574b1);
    fortubeToken = address(0xE2272A850188B43E94eD6DF5b75f1a2FDcd5aC26);
    fortubeBank = address(0x170371bbcfFf200bFB90333e799B9631A7680Cc5);
    ReserveData memory reserve = Aave(getAave()).getReserveData(token);
    aaveToken = reserve.aTokenAddress;
    feeAmount = 0;
    feePrecision = 1000;
    lenderStatus[Lender.AAVE] = true;
    lenderStatus[Lender.FULCRUM] = false;
    lenderStatus[Lender.FORTUBE] = true;
    withdrawable[Lender.AAVE] = true;
    withdrawable[Lender.FULCRUM] = false;
    withdrawable[Lender.FORTUBE] = true;
    approveToken();
  }

  function set_new_APR(address _new_APR) public onlyOwner {
      apr = _new_APR;
  }
  function set_new_feeAmount(uint256 fee) public onlyOwner{
    require(fee < feePrecision, 'fee amount must be less than 100%');
    feeAmount = fee;
  }
  function set_new_fee_address(address _new_fee_address) public onlyOwner {
      feeAddress = _new_fee_address;
  }
  function set_new_feePrecision(uint256 _newFeePrecision) public onlyOwner{
    require(_newFeePrecision >= 100, "fee precision must be greater than 100 at least");
    set_new_feeAmount(feeAmount*_newFeePrecision/feePrecision);
    feePrecision = _newFeePrecision;
  }
  // Quick swap low gas method for pool swaps
  function deposit(uint256 _amount)
      external
      nonReentrant
  {
      require(_amount > 0, "deposit must be greater than 0");
      pool = _calcPoolValueInToken();
      IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
      rebalance();
      // Calculate pool shares
      uint256 shares = 0;
      if (pool == 0) {
        shares = _amount;
        pool = _amount;
      } else {
        if (totalSupply() == 0) {
          shares = _amount;
        } else {
          shares = (_amount.mul(totalSupply())).div(pool);
        }
      }
      pool = _calcPoolValueInToken();
      _mint(msg.sender, shares);
      depositedAmount[msg.sender] = depositedAmount[msg.sender].add(_amount);
      totalDepositedAmount = totalDepositedAmount.add(_amount);
      if(lastWithdrawFeeTime == 0)
        lastWithdrawFeeTime = block.timestamp;
      emit Deposit(msg.sender, _amount);
  }

  // No rebalance implementation for lower fees and faster swaps
  function withdraw(uint256 _shares)
      external
      nonReentrant
  {
      require(_shares > 0, "withdraw must be greater than 0");

      uint256 ibalance = balanceOf(msg.sender);
      require(_shares <= ibalance, "insufficient balance");

      // Could have over value from xTokens
      pool = _calcPoolValueInToken();
      // Calc to redeem before updating balances
      uint256 fee = pool.sub(totalDepositedAmount).mul(feeAmount).div(feePrecision);
      // uint256 fee = 0;
      uint256 r = (pool.sub(fee).mul(_shares)).div(totalSupply());

      emit Transfer(msg.sender, address(0), _shares);

      // Check balance
      uint256 b = IERC20(token).balanceOf(address(this));
      if (b < r) {
        _withdrawSome(r.sub(b));
      }

      IERC20(token).safeTransfer(msg.sender, r);
      totalDepositedAmount = totalDepositedAmount.sub(_shares.mul(depositedAmount[msg.sender]).div(ibalance));
      depositedAmount[msg.sender] = depositedAmount[msg.sender].sub(_shares.mul(depositedAmount[msg.sender]).div(ibalance));
      _burn(msg.sender, _shares);
      rebalance();
      pool = _calcPoolValueInToken();
      emit Withdraw(msg.sender, _shares);
  }
  receive() external payable {}

  function recommend() public view returns (Lender) {
    (, uint256 fapr,uint256 aapr, uint256 ftapr) = IIEarnManager(apr).recommend(token);
    uint256 max = 0;
    if (fapr > max && lenderStatus[Lender.FULCRUM]) {
      max = fapr;
    }
    if (aapr > max && lenderStatus[Lender.AAVE]) {
      max = aapr;
    }
    if (ftapr > max && lenderStatus[Lender.FORTUBE]) {
      max = ftapr;
    }
    
    Lender newProvider = Lender.NONE;
    if (max == aapr) {
      newProvider = Lender.AAVE;
    } else if (max == fapr) {
      newProvider = Lender.FULCRUM;
    } else if (max == ftapr) {
      newProvider = Lender.FORTUBE;
    }
    return newProvider;
  }
  
  function getAave() public view returns (address) {
    return LendingPoolAddressesProvider(aave).getLendingPool();
  }

  function getDepositedAmount(address investor) public view returns (uint256) {
    return depositedAmount[investor];
  }

  function approveToken() public {
      IERC20(token).approve(getAave(), uint(-1));
      IERC20(token).approve(fulcrum, uint(-1));
      IERC20(token).approve(FortubeBank(fortubeBank).controller(),  uint(-1));
  }

  function balanceFortubeInToken() external view returns (uint256) {
    return _balanceFortubeInToken();
  }

  function balance() external view returns (uint256) {
    return _balance();
  }

  function balanceFulcrumInToken() external view returns (uint256) {
    return _balanceFulcrumInToken();
  }
  function balanceFulcrum() external view returns (uint256) {
    return _balanceFulcrum();
  }
  function balanceAave() external view returns (uint256) {
    return _balanceAave();
  }
  function balanceFortube() external view returns (uint256) {
    return _balanceFortube();
  }

  function _balance() internal view returns (uint256) {
    return IERC20(token).balanceOf(address(this));
  }

  function _balanceFulcrumInToken() internal view returns (uint256) {
    uint256 b = _balanceFulcrum();
    if (b > 0 && withdrawable[Lender.FULCRUM]) {
      b = Fulcrum(fulcrum).assetBalanceOf(address(this));
    }
    return b;
  }

  function _balanceFortubeInToken() internal view returns (uint256) {
    uint256 b = _balanceFortube();
    if (b > 0 && withdrawable[Lender.FORTUBE]) {
      uint256 exchangeRate = FortubeToken(fortubeToken).exchangeRateStored();
      uint256 oneAmount = FortubeToken(fortubeToken).ONE();
      b = b.mul(exchangeRate).div(oneAmount);
    }
    return b;
  }

  function _balanceFulcrum() internal view returns (uint256) {
    if(withdrawable[Lender.FULCRUM])
      return IERC20(fulcrum).balanceOf(address(this));
    else
      return 0;
  }
  function _balanceAave() internal view returns (uint256) {
    if(withdrawable[Lender.AAVE])
      return IERC20(aaveToken).balanceOf(address(this));
    else
      return 0;
  }
  function _balanceFortube() internal view returns (uint256) {
    if(withdrawable[Lender.FORTUBE])
      return FortubeToken(fortubeToken).balanceOf(address(this));
    else
      return 0;
  }

  function _withdrawAll() internal {
    uint256  amount = _balanceFulcrum();
    if (amount > 0) {
      _withdrawFulcrum(amount);
    }
    amount = _balanceAave();
    if (amount > 0) {
      _withdrawAave(amount);
    }
    amount = _balanceFortube();
    if (amount > 0) {
      _withdrawFortube(amount);
    }
  }

  function _withdrawSomeFulcrum(uint256 _amount) internal {
    uint256 b = _balanceFulcrum();
    // Balance of token in fulcrum
    uint256 bT = _balanceFulcrumInToken();
    require(bT >= _amount, "insufficient funds");
    // can have unintentional rounding errors
    uint256 amount = (b.mul(_amount)).div(bT).add(1);
    _withdrawFulcrum(amount);
  }

  function _withdrawSomeFortube(uint256 _amount) internal {
    uint256 b = _balanceFortube();
    uint256 bT = _balanceFortubeInToken();
    require(bT >= _amount, "insufficient funds");
    uint256 amount = (b.mul(_amount)).div(bT).add(1);
    _withdrawFortube(amount);
  }

  function _withdrawSome(uint256 _amount) internal {
    
    if (provider == Lender.AAVE) {
      require(_balanceAave() >= _amount, "insufficient funds");
      _withdrawAave(_amount);
    }
    if (provider == Lender.FULCRUM) {
      _withdrawSomeFulcrum(_amount);
    }
    if (provider == Lender.FORTUBE) {
      _withdrawSomeFortube(_amount);
    }
  }

  function rebalance() public {
    Lender newProvider = recommend();

    if (newProvider != provider) {
      _withdrawAll();
    }

    if (_balance() > 0) {
      if (newProvider == Lender.FULCRUM) {
        supplyFulcrum(_balance());
      } else if (newProvider == Lender.AAVE) {
        supplyAave(_balance());
      } else if (newProvider == Lender.FORTUBE) {
        supplyFortube(_balance());
      }
    }

    provider = newProvider;
  }

  function supplyAave(uint amount) public {
      Aave(getAave()).deposit(token, amount, address(this), 0);
  }
  function supplyFulcrum(uint amount) public {
      require(Fulcrum(fulcrum).mint(address(this), amount) > 0, "FULCRUM: supply failed");
  }
  function supplyFortube(uint amount) public {
      require(amount > 0, "FORTUBE: supply failed");
      FortubeBank(fortubeBank).deposit(token, amount);
  }
  function _withdrawAave(uint amount) internal {
      require(Aave(getAave()).withdraw(token, amount, address(this)) > 0, "AAVE: withdraw failed");
  }
  function _withdrawFulcrum(uint amount) internal {
      require(Fulcrum(fulcrum).burn(address(this), amount) > 0, "FULCRUM: withdraw failed");
  }
  function _withdrawFortube(uint amount) internal {
      require(FortubeBank(fortubeBank).withdraw(token, amount) > 0, "Fortube: withdraw failed");
  }

  function _calcPoolValueInToken() internal view returns (uint) {
    return _balanceFulcrumInToken()
      .add(_balanceAave())
      .add(_balanceFortubeInToken())
      .add(_balance());
  }

  function calcPoolValueInToken() public view returns (uint) {
    return _calcPoolValueInToken();
  }

  function getPricePerFullShare() public view returns (uint) {
    uint _pool = _calcPoolValueInToken();
    return _pool.mul(1e18).div(totalSupply());
  }

  function activateLender(Lender lender) public onlyOwner {
    lenderStatus[lender] = true;
    withdrawable[lender] = true;
    rebalance();
  }

  function deactivateWithdrawableLender(Lender lender) public onlyOwner {
    lenderStatus[lender] = false;
    rebalance();
  }

  function deactivateNonWithdrawableLender(Lender lender) public onlyOwner {
    lenderStatus[lender] = false;
    withdrawable[lender] = false;
    rebalance();
  }
  
  function withdrawFee() public {
    pool = _calcPoolValueInToken();
    uint256 amount = pool.sub(totalDepositedAmount).mul(feeAmount).div(feePrecision).mul(block.timestamp.sub(lastWithdrawFeeTime)).div(365 * 24 * 60 * 60);
    if(amount > 0){
      _withdrawSome(amount);
      IERC20(token).approve(feeAddress, amount);
      ITreasury(feeAddress).depositToken(token);
      lastWithdrawFeeTime = block.timestamp;
    }
  }

    function name() public view virtual returns (string memory) {
        return _name;
    }
    
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }
    
    function decimals() public view virtual returns (uint8) {
        return _decimals;
    }
    
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }
    
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }
    
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }
    
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
    
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    function _setupDecimals(uint8 decimals_) internal virtual {
        _decimals = decimals_;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual { }
}