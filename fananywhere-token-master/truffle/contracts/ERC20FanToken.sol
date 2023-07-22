// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Permit.sol";
import "./IBEP20.sol";

/**
 * @title BEP20 Token Contract
 */
contract ERC20FanToken is ERC20Permit, IBEP20, Ownable {
    uint256 public constant MAX_CAP = 1000000000 * (10**18); // 1,000,000,000 tokens

    constructor() ERC20("FanToken", "FAW") {
        _mint(msg.sender, MAX_CAP);
    }

    /**
      @dev Only contract owner can burn the tokens that they own
     */
    function burn(uint256 amount) public override(ERC20Burnable) onlyOwner {
        super.burn(amount);
    }

    /**
      @dev Only contract owner can burn the tokens 
      for which they have approval
     */
    function burnFrom(address account, uint256 amount)
        public
        override(ERC20Burnable)
        onlyOwner
    {
        super.burnFrom(account, amount);
    }

    function totalSupply()
        public
        view
        override(ERC20, IBEP20)
        returns (uint256)
    {
        return super.totalSupply();
    }

    function decimals() public view override(ERC20, IBEP20) returns (uint8) {
        return super.decimals();
    }

    function symbol()
        public
        view
        override(ERC20, IBEP20)
        returns (string memory)
    {
        return super.symbol();
    }

    function name()
        public
        view
        override(ERC20, IBEP20)
        returns (string memory)
    {
        return super.symbol();
    }

    function getOwner() external view override(IBEP20) returns (address) {
        return owner();
    }

    /**
      Ownership of the contract cannot be renounced
     */
    function renounceOwnership() public view override(Ownable) onlyOwner {
        require(false, "Ownership cannot be renounced");
    }

    function balanceOf(address account)
        public
        view
        override(ERC20, IBEP20)
        returns (uint256)
    {
        return super.balanceOf(account);
    }

    function transfer(address recipient, uint256 amount)
        public
        override(ERC20, IBEP20)
        returns (bool)
    {
        return super.transfer(recipient, amount);
    }

    function allowance(address _owner, address spender)
        public
        view
        override(ERC20, IBEP20)
        returns (uint256)
    {
        return super.allowance(_owner, spender);
    }

    /**
      Disable approve to avoid the approve race condition
      attack: https://gitmemory.cn/repo/balancer-labs/balancer-core/issues/104
     */
    function approve(address spender, uint256 amount)
        public
        pure
        override(ERC20, IBEP20)
        returns (bool)
    {
        require(
            false,
            "Use `increaseAllowance` and `decreaseAllowance` instead"
        );
        return false;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override(ERC20, IBEP20) returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }
}
