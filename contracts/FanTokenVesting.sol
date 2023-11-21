// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BokkyPooBahsDateTimeLibrary.sol";

/**
  @title Contract to calculate the tokens that can be withdrawn
  for different distribution pools
*/
contract FanTokenVesting is Ownable {
    using BokkyPooBahsDateTimeLibrary for uint256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    enum DistributionType {
        TEAM,
        SEED,
        STRATEGIC,
        PRIVATE1,
        PRIVATE2,
        PUBLIC,
        ADVISORS,
        LIQUIDITY,
        REWARDS,
        MARKETING,
        RESERVES,
        ECOSYSTEM
    }
    event DistributionAdded(
        address indexed caller,
        DistributionType indexed distributionType,
        uint256 totalTokensAllotted,
        uint256 initialTokensReleased,
        uint256 cliffPeriodMonths,
        uint256 vestingPeriodMonths
    );
    event WithdrawnTokens(address indexed investor, uint256 value);
    event TokenRecovered(uint256 indexed amount);
    event TreasuryChanged(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    address public treasury;
    uint256 private _initialTimestamp;
    IERC20 private _fanToken;

    /**
      @dev Cliff and Vesting happen in months but the allocation 
      is in days. So, an extra field is added to store the 
      number of days from initialization. This is calculated one time
      during initialization to avoid the gas fees from 
      calculating it on every withdrawal.
    */
    struct Distribution {
        DistributionType distributionType;
        uint256 totalTokensAllotted;
        uint256 initialTokensReleased;
        uint256 cliffPeriodMonths;
        uint256 cliffPeriodDays;
        uint256 vestingPeriodMonths;
        uint256 vestingPeriodDays;
        uint256 withdrawnTokens;
    }

    mapping(DistributionType => Distribution) public distributionInfo;

    /**
      @dev Boolean variable that indicates whether the contract was initialized.
   */
    bool public isInitialized = false;

    /**
      @dev Checks that the contract is initialized.
   */
    modifier initialized() {
        require(isInitialized, "Contract not initialized");
        _;
    }

    /**
      @dev Checks that the contract is not initialized.
   */
    modifier notInitialized() {
        require(!isInitialized, "Contract already initialized");
        _;
    }

    constructor(address _token, address _treasury) {
        require(
            address(_token) != address(0x0),
            "FAW token address is not valid"
        );
        require(_treasury != address(0x0), "Treasury address is not valid");

        treasury = _treasury;
        _fanToken = IERC20(_token);

        // 12.5%, 0% TGE, 12 month cliff, linear release for 36 months
        _addDistribution(
            DistributionType.TEAM,
            125000000 * (10**18),
            0 * (10**18),
            12,
            48
        );

        // 2%, 5% TGE, 1 month cliff, linear release for 11 months
        _addDistribution(
            DistributionType.SEED,
            20000000 * (10**18),
            1000000 * (10**18),
            1,
            12
        );

        // 5.1%, 5% TGE, 1 month cliff, linear release for 11 months
        _addDistribution(
            DistributionType.STRATEGIC,
            51000000 * (10**18),
            2550000 * (10**18),
            1,
            12
        );

        // 4%, 7% TGE, 1 month cliff, linear release for 11 months
        _addDistribution(
            DistributionType.PRIVATE1,
            40000000 * (10**18),
            2800000 * (10**18),
            1,
            12
        );

        // 6.6%, 8% TGE, 1 month cliff, linear release for 11 months
        _addDistribution(
            DistributionType.PRIVATE2,
            66000000 * (10**18),
            5280000 * (10**18),
            1,
            12
        );

        // 2.3%, 20% TGE, no cliff, linear release for 4 months
        _addDistribution(
            DistributionType.PUBLIC,
            23000000 * (10**18),
            4600000 * (10**18),
            0,
            4
        );

        // 7%, 0% TGE, 6 month cliff, linear release for 18 months
        _addDistribution(
            DistributionType.ADVISORS,
            70000000 * (10**18),
            0 * (10**18),
            6,
            24
        );

        // 2%, 100% TGE, no cliff, no vesting
        _addDistribution(
            DistributionType.LIQUIDITY,
            20000000 * (10**18),
            20000000 * (10**18),
            0,
            0
        );

        // 20%, 0% TGE, 1 month cliff, linear release for 24 months
        _addDistribution(
            DistributionType.REWARDS,
            200000000 * (10**18),
            0 * (10**18),
            1,
            25
        );

        // 12%, 5% TGE, no cliff, linear release for 24 months
        _addDistribution(
            DistributionType.MARKETING,
            120000000 * (10**18),
            6000000 * (10**18),
            0,
            24
        );

        // 13.5%, 5% TGE, no cliff, linear release for 24 months
        _addDistribution(
            DistributionType.RESERVES,
            135000000 * (10**18),
            6750000 * (10**18),
            0,
            24
        );

        // 13%, 0% TGE, 1 month cliff, linear release for 18 months
        _addDistribution(
            DistributionType.ECOSYSTEM,
            130000000 * (10**18),
            0 * (10**18),
            1,
            19
        );
    }

    /// @dev Returns the vesting initilization timestamp
    function getInitialTimestamp() public view returns (uint256 timestamp) {
        return _initialTimestamp;
    }

    /**
      @dev Adds Distribution for the in the `_distributionType` pool. Note that the initial token will be withdrawable only after the initialization date
      @param _distributionType The pool type to which the tokens are allotted
      @param _totalTokensAllotted The total number tokens allotted in the `_distributionType` pool
      @param _initialTokensReleased Number of tokens released on TGE
      @param _cliffPeriodMonths Cliff period in months
      @param _vestingPeriodMonths Vesting period in months
     */
    function _addDistribution(
        DistributionType _distributionType,
        uint256 _totalTokensAllotted,
        uint256 _initialTokensReleased,
        uint256 _cliffPeriodMonths,
        uint256 _vestingPeriodMonths
    ) internal {
        Distribution storage distribution = distributionInfo[_distributionType];
        distribution.distributionType = _distributionType;
        distribution.totalTokensAllotted = _totalTokensAllotted;
        distribution.cliffPeriodMonths = _cliffPeriodMonths;
        distribution.vestingPeriodMonths = _vestingPeriodMonths;
        distribution.initialTokensReleased = _initialTokensReleased;
        distribution.withdrawnTokens = 0;

        emit DistributionAdded(
            _msgSender(),
            _distributionType,
            _totalTokensAllotted,
            _initialTokensReleased,
            _cliffPeriodMonths,
            _vestingPeriodMonths
        );
    }

    /**
      Initialize the contract by setting the initial timestamp.
      @dev This function can only be called once by the owner.
      Upon invocation, the function also does the following:
      1. Calculate the vesting and cliff periods in days for each distribution.
      This is done to avoid gas usage every time withdraw is called.
      2. Ensure that the total number of tokens in the distribution pool 
      is equal to the total number of tokens owned by the contract.
      Block timestamp is used here since the issuance happens
      on a daily basis. Minor time uncertainities are acceptable
      @param _timestamp The initial timestamp, this timestamp will be used for vesting
    */
    function init(uint256 _timestamp) external onlyOwner notInitialized {
        isInitialized = true;
        _initialTimestamp = _timestamp;

        uint256 totalAlottedAmount = 0;
        for (uint256 i = 0; i <= uint256(type(DistributionType).max); i++) {
            Distribution storage distribution = distributionInfo[
                DistributionType(i)
            ];

            uint256 cliffPeriodMonths = distribution.cliffPeriodMonths;
            uint256 cliffEndTimestamp = BokkyPooBahsDateTimeLibrary.addMonths(
                _timestamp,
                cliffPeriodMonths
            );
            distribution.cliffPeriodDays = BokkyPooBahsDateTimeLibrary.diffDays(
                _timestamp,
                cliffEndTimestamp
            );

            uint256 vestingPeriodMonths = distribution.vestingPeriodMonths;
            uint256 vestingEndTimestamp = BokkyPooBahsDateTimeLibrary.addMonths(
                _timestamp,
                vestingPeriodMonths
            );
            distribution.vestingPeriodDays = BokkyPooBahsDateTimeLibrary
                .diffDays(_timestamp, vestingEndTimestamp);

            totalAlottedAmount = totalAlottedAmount.add(
                distribution.totalTokensAllotted
            );
        }

        // Make sure that the contract has enough tokens to distribute
        // to the beneficiaries
        require(
            _fanToken.balanceOf(address(this)) >= totalAlottedAmount,
            "Contract doesn't have enough balance to distribute"
        );
    }

    /**
      Ownership of the contract cannot be renounced
     */
    function renounceOwnership() public view override(Ownable) onlyOwner {
        require(false, "Ownership cannot be renounced");
    }

    function withdrawTokens(DistributionType _distributionType)
        external
        onlyOwner
        initialized
    {
        Distribution storage distribution = distributionInfo[_distributionType];

        uint256 tokensWithdrawable = withdrawableTokens(_distributionType);

        require(tokensWithdrawable > 0, "No tokens available for withdrawal");

        distribution.withdrawnTokens = distribution.withdrawnTokens.add(
            tokensWithdrawable
        );

        // Transfer the amount in the end to avoid reentrancy attacks
        _fanToken.safeTransfer(treasury, tokensWithdrawable);

        emit WithdrawnTokens(treasury, tokensWithdrawable);
    }

    /**
      Returns the amount of tokens that can be withdrawn from 
      the contract for the specified distribution type.
      @param distributionType The distribution type
      @return tokens The amount of tokens that can be withdrawn from 
      the contract for the distribution type
    */
    function withdrawableTokens(DistributionType distributionType)
        public
        view
        returns (uint256 tokens)
    {
        // Even the initialTokensReleased cannot be withdrawn
        // before contract initialization
        if (!isInitialized) {
            return 0;
        }

        Distribution storage distribution = distributionInfo[distributionType];

        // Get the number of tokens available for withdrawal based
        // on the number of DAYS elapsed since the contract was initialized
        uint256 vestedTokens = _calculateVestedTokens(distributionType);

        return (
            (vestedTokens.add(distribution.initialTokensReleased)).sub(
                distribution.withdrawnTokens
            )
        );
    }

    function _calculateVestedTokens(DistributionType distributionType)
        private
        view
        returns (uint256 _amountVested)
    {
        // Block timestamp is used here since the issuance happens
        // on a daily basis. Minor time uncertainities are acceptable
        uint256 currentTimeStamp = block.timestamp;
        uint256 noOfDays = BokkyPooBahsDateTimeLibrary.diffDays(
            _initialTimestamp,
            currentTimeStamp
        );

        Distribution storage distribution = distributionInfo[distributionType];

        if (noOfDays <= distribution.cliffPeriodDays) {
            return 0;
        } else if (noOfDays >= distribution.vestingPeriodDays) {
            return
                distribution.totalTokensAllotted.sub(
                    distribution.initialTokensReleased
                );
        } else {
            uint256 vestedTokens = (
                (
                    distribution.totalTokensAllotted.sub(
                        distribution.initialTokensReleased
                    )
                ).div(distribution.vestingPeriodDays)
            ).mul(noOfDays);

            return vestedTokens;
        }
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(treasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryChanged(oldTreasury, _treasury);
    }

    /**
      If any excess tokens are transferred to this contract without 
      adding it to any distribution pool, this function can be used to 
      recover the amount
     */
    function recoverExcessTokens() external onlyOwner initialized {
        uint256 totalAvailableAmount = 0;
        for (uint256 i = 0; i <= uint256(type(DistributionType).max); i++) {
            Distribution storage distribution = distributionInfo[
                DistributionType(i)
            ];
            totalAvailableAmount = totalAvailableAmount
                .add(distribution.totalTokensAllotted)
                .sub(distribution.withdrawnTokens);
        }

        uint256 excessTokens = _fanToken.balanceOf(address(this)).sub(
            totalAvailableAmount
        );

        // Make sure that the contract has enough excess tokens to recover
        require(
            excessTokens > 0,
            "Contract doesn't have enough excess tokens to recover"
        );

        _fanToken.safeTransfer(_msgSender(), excessTokens);

        emit TokenRecovered(excessTokens);
    }
}
