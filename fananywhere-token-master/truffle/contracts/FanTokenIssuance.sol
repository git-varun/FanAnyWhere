// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 @title Contract to issue tokens according to distribution pools.
 @dev Adds the tokens to be issued, add the beneficiaries
 */
contract FanTokenIssuance is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

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

    event IssuanceAdded(
        DistributionType indexed poolType,
        uint256 issuedAmount
    );

    event BeneficiaryAdded(
        DistributionType indexed poolType,
        address beneficiary,
        uint256 beneficiaryAllotment
    );

    event BeneficiaryAllotmentModified(
        DistributionType indexed poolType,
        address beneficiary,
        uint256 oldBeneficiaryAllotment,
        uint256 newBeneficiaryAllotment
    );

    event BeneficiaryRemoved(
        DistributionType indexed poolType,
        address beneficiary
    );

    event PoolTokensWithdrawn(
        DistributionType indexed poolType,
        address indexed beneficiary,
        uint256 withdrawnAmount
    );

    event TokensWithdrawn(address indexed beneficiary, uint256 withdrawnAmount);

    event TokenRecovered(uint256 indexed amount);

    IERC20 private _fanToken;

    /**
      @dev The beneficiaries mapping doesnt give the 
      total beneficiary allotment. So the count is
      tracked separately. 
     */
    struct TokenIssuance {
        mapping(address => uint256) beneficiaries;
        DistributionType poolType;
        uint256 totalTokensAllotted;
        uint256 totalBeneficiaryAllotment;
        uint256 totalTokensIssued;
        uint256 totalTokensWithdrawn;
    }

    mapping(DistributionType => TokenIssuance)
        public distributionTypeToIssuance;

    mapping(DistributionType => mapping(address => uint256))
        public distributionTypeToWithdrawals;

    constructor(address _token) {
        require(
            address(_token) != address(0x0),
            "FAW token address is not valid"
        );
        _fanToken = IERC20(_token);

        _setupIssuance(DistributionType.TEAM, 125000000 * (10**18));
        _setupIssuance(DistributionType.SEED, 20000000 * (10**18));
        _setupIssuance(DistributionType.STRATEGIC, 51000000 * (10**18));
        _setupIssuance(DistributionType.PRIVATE1, 40000000 * (10**18));
        _setupIssuance(DistributionType.PRIVATE2, 66000000 * (10**18));
        _setupIssuance(DistributionType.PUBLIC, 23000000 * (10**18));
        _setupIssuance(DistributionType.ADVISORS, 70000000 * (10**18));
        _setupIssuance(DistributionType.LIQUIDITY, 20000000 * (10**18));
        _setupIssuance(DistributionType.REWARDS, 200000000 * (10**18));
        _setupIssuance(DistributionType.MARKETING, 120000000 * (10**18));
        _setupIssuance(DistributionType.RESERVES, 135000000 * (10**18));
        _setupIssuance(DistributionType.ECOSYSTEM, 130000000 * (10**18));
    }

    /**
      @dev Initialize the issuance of tokens for a pool by providing
      the total amount of tokens to be issued
     */
    function _setupIssuance(
        DistributionType _distributionType,
        uint256 _totalTokensAllotted
    ) internal onlyOwner returns (bool success) {
        require(_totalTokensAllotted > 0, "No tokens allotted");
        uint256 totalSupply = _fanToken.totalSupply();
        require(
            _totalTokensAllotted <= totalSupply,
            "Cannot allot more than total supply"
        );

        TokenIssuance storage issuance = distributionTypeToIssuance[
            _distributionType
        ];
        issuance.poolType = _distributionType;
        issuance.totalTokensAllotted = _totalTokensAllotted;

        return true;
    }

    /**
      Ownership of the contract cannot be renounced
     */
    function renounceOwnership() public view override(Ownable) onlyOwner {
        require(false, "Ownership cannot be renounced");
    }

    /**
      @dev Adds new issuance to the `_distributionType` pool. This will be called daily
      @param _distributionType The type of the pool
      @param _issuanceAmount The amount of tokens to be issued in this batch
      @return success true if the issuance was added successfully.
     */
    function addTokenIssuance(
        DistributionType _distributionType,
        uint256 _issuanceAmount
    ) public onlyOwner returns (bool success) {
        require(_issuanceAmount > 0, "Empty issuance amount");
        require(
            _fanToken.balanceOf(address(this)) >= _issuanceAmount,
            "Contract doesnt have enough balance"
        );

        TokenIssuance storage issuance = distributionTypeToIssuance[
            _distributionType
        ];

        require(
            _issuanceAmount <= issuance.totalTokensAllotted,
            "Cannot issue more than pool allotment"
        );

        issuance.totalTokensIssued = issuance.totalTokensIssued.add(
            _issuanceAmount
        );
        issuance.poolType = _distributionType;

        emit IssuanceAdded(_distributionType, _issuanceAmount);

        return true;
    }

    /**
      Add beneficiary to the `_distributionType` pool.
      A beneficiary can belong to more than one pool and their
      balance will be calulated separately
      @param _beneficiary The beneficiary address
      @param _distributionType The type of the pool
      @param _beneficiaryAllotment The total amount in this pool to be allocated to the beneficiary
    */
    function addBeneficiary(
        DistributionType _distributionType,
        address _beneficiary,
        uint256 _beneficiaryAllotment
    ) public onlyOwner returns (bool success) {
        TokenIssuance storage issuance = distributionTypeToIssuance[
            _distributionType
        ];
        require(_beneficiary != address(0x0), "Invalid beneficiary address");
        require(_beneficiaryAllotment > 0, "No tokens allotted");
        require(
            issuance.beneficiaries[_beneficiary] == 0,
            "Beneficiary already exists in pool"
        );
        require(
            issuance.totalBeneficiaryAllotment.add(_beneficiaryAllotment) <=
                issuance.totalTokensAllotted,
            "Total allotment cannot exceed max pool allotment"
        );

        issuance.beneficiaries[_beneficiary] = _beneficiaryAllotment;
        issuance.totalBeneficiaryAllotment = issuance
            .totalBeneficiaryAllotment
            .add(_beneficiaryAllotment);

        emit BeneficiaryAdded(
            _distributionType,
            _beneficiary,
            _beneficiaryAllotment
        );

        return true;
    }

    /**
      Modify the maximum allotment of a beneficiary in `_distributionType` pool.
      @dev The beneficiary allotment can be increased in all conditions, but
      can be decreased only if the beneficiary has not withdrawn more than the
      proportion of the total tokens calculated according to the decreased allotment. 
      This is to avoid the `Token Misallocation` scenario.
      `Token Misallocation` scenario:
        1. A beneficiary B1 is added with an initial allotment. Example: 60%
        2. Another beneficiary B2 is added with an initial allotment. Example: 40%
        2. An issuance of 1000 tokens is added and the B1 withdraws
           600 tokens
        3. The allotment of B1 is decreased to 50%
        4. The allotment of B2 is increased to 50%
        5. B2 now tries to withdraw 500 tokens, but B1 has already withdrawn
           600 tokens. This will cause the smart contract to throw an error since 
           it doesn’t have the required balance to transfer to B2
      To avoid this scenario, verify that the total withdrawal of B1 is 
      less than 500 tokens in the case of maximum allotment decrease
      @param _distributionType The type of the pool
      @param _beneficiary The beneficiary whose allotment is to be modified
      @param _newBeneficiaryAllotment The new allotment of the beneficiary
     */
    function modifyBeneficiaryAllotment(
        DistributionType _distributionType,
        address _beneficiary,
        uint256 _newBeneficiaryAllotment
    ) public onlyOwner returns (bool success) {
        TokenIssuance storage issuance = distributionTypeToIssuance[
            _distributionType
        ];
        require(_beneficiary != address(0x0), "Invalid beneficiary address");
        require(_newBeneficiaryAllotment > 0, "No tokens allotted");
        require(
            issuance.beneficiaries[_beneficiary] > 0,
            "Beneficiary not in pool"
        );

        uint256 oldBeneficiaryAllotment = issuance.beneficiaries[_beneficiary];
        if (_newBeneficiaryAllotment < oldBeneficiaryAllotment) {
            require(
                distributionTypeToWithdrawals[_distributionType][
                    _beneficiary
                ] <=
                    _newBeneficiaryAllotment
                        .mul(issuance.totalTokensIssued)
                        .div(issuance.totalTokensAllotted),
                "Beneficiary has withdrawn more than the decreased allotment"
            );
        }

        uint256 newTotalBeneficiaryAllotment = issuance
            .totalBeneficiaryAllotment
            .sub(oldBeneficiaryAllotment)
            .add(_newBeneficiaryAllotment);

        require(
            newTotalBeneficiaryAllotment <= issuance.totalTokensAllotted,
            "Cannot allot more than max pool allotment"
        );

        issuance.totalBeneficiaryAllotment = newTotalBeneficiaryAllotment;
        issuance.beneficiaries[_beneficiary] = _newBeneficiaryAllotment;

        emit BeneficiaryAllotmentModified(
            _distributionType,
            _beneficiary,
            oldBeneficiaryAllotment,
            _newBeneficiaryAllotment
        );
        return true;
    }

    /**
      Remove beneficiaries from the `_distributionType` pool.
      @dev Only beneficiaries who have not withdrawn any tokens
      can be removed from the pool to avoid the `Token Misallocation` 
      scenario.
      @param _beneficiary The beneficiary to be removed
      @param _distributionType The type of the pool
    */
    function removeBeneficiary(
        DistributionType _distributionType,
        address _beneficiary
    ) public onlyOwner {
        TokenIssuance storage issuance = distributionTypeToIssuance[
            _distributionType
        ];
        require(
            issuance.beneficiaries[_beneficiary] > 0,
            "Beneficiary not in pool"
        );
        require(
            distributionTypeToWithdrawals[_distributionType][_beneficiary] == 0,
            "Cannot remove beneficiary which already withdrew tokens"
        );

        uint256 beneficiaryAllotment = issuance.beneficiaries[_beneficiary];
        issuance.totalBeneficiaryAllotment = issuance
            .totalBeneficiaryAllotment
            .sub(beneficiaryAllotment);
        delete issuance.beneficiaries[_beneficiary];

        emit BeneficiaryRemoved(_distributionType, _beneficiary);
    }

    /**
      @dev Get withdrawable amount of the requestor in the `_distributionType` pool.
      The amount withdrawable is proportional to the maximum amount of tokens
      allocated to the beneficiary. The forumla for the amount withdrawable
      is provided in the code below.
      @param _distributionType The type of the pool
    */
    function getPoolWithdrawableAmount(DistributionType _distributionType)
        public
        view
        returns (uint256)
    {
        uint256 beneficiaryAllotment = distributionTypeToIssuance[
            _distributionType
        ].beneficiaries[msg.sender];

        TokenIssuance storage issuance = distributionTypeToIssuance[
            _distributionType
        ];

        // Unlocked amount =
        // (
        //   (Max Beneficiary Allotment) / (Max Pool Allotment)
        // ) * (Total Tokens Issued)
        //
        // Withdrawable amount =
        // (Unlocked amount) - (Amount withdrawn)
        uint256 withdrawableTokens = (
            (beneficiaryAllotment.mul(issuance.totalTokensIssued)).div(
                issuance.totalTokensAllotted
            )
        ).sub(distributionTypeToWithdrawals[_distributionType][msg.sender]);

        return withdrawableTokens;
    }

    /**
      @dev Get withdrawable amount of the requestor across all pools.
    */
    function getWithdrawableAmount() public view returns (uint256) {
        uint256 totalWithdrawableAmount = 0;
        for (uint256 i = 0; i <= uint256(type(DistributionType).max); i++) {
            totalWithdrawableAmount = totalWithdrawableAmount.add(
                getPoolWithdrawableAmount(DistributionType(i))
            );
        }

        return totalWithdrawableAmount;
    }

    /**
      @dev function to withdraw tokens of the requestor from a pool
     */
    function withdrawPoolTokens(DistributionType _distributionType)
        public
        returns (bool withdrawalSuccess)
    {
        uint256 withdrawableAmount = getPoolWithdrawableAmount(
            _distributionType
        );
        uint256 withdrawnAmount = distributionTypeToWithdrawals[
            _distributionType
        ][msg.sender];

        distributionTypeToWithdrawals[_distributionType][
            msg.sender
        ] = withdrawableAmount.add(withdrawnAmount);

        TokenIssuance storage issuance = distributionTypeToIssuance[
            _distributionType
        ];

        issuance.totalTokensWithdrawn = issuance.totalTokensWithdrawn.add(
            withdrawableAmount
        );

        require(withdrawableAmount > 0, "No tokens to withdraw");

        // Transfer the amount in the end to avoid reentrancy attacks
        _fanToken.safeTransfer(msg.sender, withdrawableAmount);

        emit PoolTokensWithdrawn(
            _distributionType,
            msg.sender,
            withdrawableAmount
        );

        return true;
    }

    function withdrawTokens() public returns (bool withdrawalSuccess) {
        uint256 totalWithdrawableAmount = 0;
        for (uint256 i = 0; i <= uint256(type(DistributionType).max); i++) {
            uint256 withdrawableAmount = getPoolWithdrawableAmount(
                DistributionType(i)
            );
            uint256 withdrawnAmount = distributionTypeToWithdrawals[
                DistributionType(i)
            ][msg.sender];
            distributionTypeToWithdrawals[DistributionType(i)][
                msg.sender
            ] = withdrawableAmount.add(withdrawnAmount);

            TokenIssuance storage issuance = distributionTypeToIssuance[
                DistributionType(i)
            ];

            issuance.totalTokensWithdrawn = issuance.totalTokensWithdrawn.add(
                withdrawableAmount
            );

            totalWithdrawableAmount = totalWithdrawableAmount.add(
                withdrawableAmount
            );
        }

        require(totalWithdrawableAmount > 0, "No tokens to withdraw");

        // Transfer the amount in the end to avoid reentrancy attacks
        _fanToken.safeTransfer(msg.sender, totalWithdrawableAmount);

        emit TokensWithdrawn(msg.sender, totalWithdrawableAmount);

        return true;
    }

    /**
      @dev Get the amount withdrawn by the requestor from the specified pool
      @param _distributionType The type of the pool
     */
    function getPoolWithdrawnAmount(DistributionType _distributionType)
        public
        view
        returns (uint256)
    {
        return distributionTypeToWithdrawals[_distributionType][msg.sender];
    }

    /**
      @dev Get the total amount withdrawn by the requestor from all pools
     */
    function getWithdrawnAmount() external view returns (uint256) {
        uint256 totalWithdrawnAmount = 0;
        for (uint256 i = 0; i <= uint256(type(DistributionType).max); i++) {
            totalWithdrawnAmount = totalWithdrawnAmount.add(
                getPoolWithdrawnAmount(DistributionType(i))
            );
        }
        return totalWithdrawnAmount;
    }

    /**
      @dev Get the total tokens allotted to requestor in the specified pool
      @param _distributionType The type of the pool
   */
    function getAllotment(DistributionType _distributionType)
        external
        view
        returns (uint256)
    {
        return
            distributionTypeToIssuance[_distributionType].beneficiaries[
                msg.sender
            ];
    }

    /**
      If any excess tokens are transferred to this contract without 
      adding it to any distribution pool, this function can be used to 
      recover the amount
     */
    function recoverExcessTokens() external onlyOwner {
        uint256 totalAvailableAmount = 0;
        for (uint256 i = 0; i <= uint256(type(DistributionType).max); i++) {
            TokenIssuance storage issuance = distributionTypeToIssuance[
                DistributionType(i)
            ];
            totalAvailableAmount = totalAvailableAmount
                .add(issuance.totalTokensIssued)
                .sub(issuance.totalTokensWithdrawn);
        }

        uint256 excessTokens = _fanToken.balanceOf(address(this)).sub(
            totalAvailableAmount
        );

        // Make sure that the contract has enough excess tokens to recover
        require(
            excessTokens > 0,
            "Contract doesn't have enough excess tokens to recover"
        );

        // Transfer the amount in the end to avoid reentrancy attacks
        _fanToken.safeTransfer(_msgSender(), excessTokens);

        emit TokenRecovered(excessTokens);
    }
}
