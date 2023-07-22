/* eslint-disable no-unused-expressions */
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

const FanTokenIssuance = artifacts.require("FanTokenIssuance");
const ERC20FanToken = artifacts.require("ERC20FanToken");
const { expect } = require("chai");
const vestingDistribution = require("./helpers/vestingDistribution");

contract("TokenIssuance", (accounts) => {
  let issuanceInstance;
  let tokenInstance;
  const distribution1 = vestingDistribution[0];
  const beneficiaryPool1 = new BN(
    vestingDistribution[0].distributionType.value
  );
  const initPool1Allottment = distribution1.totalTokensAllotted.div(new BN(8));
  const finalPool1Allottment = distribution1.totalTokensAllotted.div(new BN(2));

  const distribution2 = vestingDistribution[1];
  const beneficiaryPool2 = new BN(distribution2.distributionType.value);
  const initPool2Allottment = distribution2.totalTokensAllotted.div(new BN(2));
  const finalPool2Allottment = distribution2.totalTokensAllotted.div(new BN(4));

  const pool1TokenIssuance = new BN(1000);
  const pool2TokenIssuance = new BN(4000);

  beforeEach(async () => {
    issuanceInstance = await FanTokenIssuance.deployed();
    tokenInstance = await ERC20FanToken.deployed();
  });

  it("should get the deployed contracts", async () => {
    expect(issuanceInstance).to.exist;
  });

  const _checkInitialIssuance = async (distribution) => {
    const issuance = await issuanceInstance.distributionTypeToIssuance.call(
      distribution.distributionType.value
    );

    expect(issuance.poolType).to.be.bignumber.equal(
      `${distribution.distributionType.value}`
    );
    expect(issuance.totalTokensAllotted).to.be.bignumber.equal(
      distribution.totalTokensAllotted
    );
    expect(issuance.totalBeneficiaryAllotment).to.be.bignumber.equal("0");
    expect(issuance.totalTokensIssued).to.be.bignumber.equal("0");
  };

  it("should initialize issuances with correct total token allotments", async () => {
    const checkIssuancePromises = [];
    for (let i = 0; i < vestingDistribution.length; i += 1) {
      const distribution = vestingDistribution[i];
      checkIssuancePromises.push(_checkInitialIssuance(distribution));
    }
    await Promise.all(checkIssuancePromises);
  });

  it("should add token issuances", async () => {
    const receipt = await tokenInstance.transfer(
      issuanceInstance.address,
      pool1TokenIssuance.add(pool2TokenIssuance)
    );

    expectEvent(receipt, "Transfer", {
      from: accounts[0],
      to: issuanceInstance.address,
      value: pool1TokenIssuance.add(pool2TokenIssuance),
    });

    let issuance = await issuanceInstance.distributionTypeToIssuance.call(0);
    const totalIssuedTokensBeforeIssuance = issuance.totalTokensIssued;
    let result = await issuanceInstance.addTokenIssuance(
      beneficiaryPool1,
      pool1TokenIssuance
    );

    expectEvent(result, "IssuanceAdded", {
      poolType: new BN(0),
      issuedAmount: pool1TokenIssuance,
    });
    issuance = await issuanceInstance.distributionTypeToIssuance.call(0);
    const totalIssuedTokensAfterIssuance = issuance.totalTokensIssued;

    expect(totalIssuedTokensAfterIssuance).to.be.bignumber.equal(
      totalIssuedTokensBeforeIssuance.add(pool1TokenIssuance)
    );

    result = await issuanceInstance.addTokenIssuance(
      beneficiaryPool2,
      pool2TokenIssuance
    );

    expectEvent(result, "IssuanceAdded", {
      poolType: new BN(1),
      issuedAmount: pool2TokenIssuance,
    });
  });

  it("should add beneficiaries to issuance", async () => {
    const beforeIssuance =
      await issuanceInstance.distributionTypeToIssuance.call(beneficiaryPool1);

    const beforeTotalBeneficiaryAllotment =
      beforeIssuance.totalBeneficiaryAllotment;

    const pool1BeneficiaryBeforeAllotment =
      await issuanceInstance.getAllotment.call(beneficiaryPool1);

    const result = await issuanceInstance.addBeneficiary(
      beneficiaryPool1,
      accounts[0],
      initPool1Allottment
    );

    expectEvent(result, "BeneficiaryAdded", {
      poolType: `${beneficiaryPool1}`,
      beneficiary: accounts[0],
      beneficiaryAllotment: initPool1Allottment,
    });

    const afterIssuance =
      await issuanceInstance.distributionTypeToIssuance.call(beneficiaryPool1);
    const afterTotalBeneficiaryAllotment =
      afterIssuance.totalBeneficiaryAllotment;

    expect(afterTotalBeneficiaryAllotment).to.bignumber.equal(
      beforeTotalBeneficiaryAllotment.add(initPool1Allottment)
    );

    const pool1BeneficiaryAfterAllotment =
      await issuanceInstance.getAllotment.call(beneficiaryPool1);

    expect(pool1BeneficiaryAfterAllotment).to.be.bignumber.equal(
      pool1BeneficiaryBeforeAllotment.add(initPool1Allottment)
    );

    const pool2BeneficiaryBeforeAllotment =
      await issuanceInstance.getAllotment.call(beneficiaryPool2);

    const pool2Result = await issuanceInstance.addBeneficiary(
      beneficiaryPool2,
      accounts[0],
      initPool2Allottment
    );

    expectEvent(pool2Result, "BeneficiaryAdded", {
      poolType: `${beneficiaryPool2}`,
      beneficiary: accounts[0],
      beneficiaryAllotment: initPool2Allottment,
    });

    const pool2BeneficiaryAfterAllotment =
      await issuanceInstance.getAllotment.call(beneficiaryPool2);

    expect(pool2BeneficiaryAfterAllotment).to.be.bignumber.equal(
      pool2BeneficiaryBeforeAllotment.add(initPool2Allottment)
    );
  });

  it("should allow increase and decrease of untouched beneficiary allotments", async () => {
    const pool1BeneficiaryBeforeModification =
      await issuanceInstance.getAllotment.call(beneficiaryPool1);

    let result = await issuanceInstance.modifyBeneficiaryAllotment(
      beneficiaryPool1,
      accounts[0],
      finalPool1Allottment
    );

    expectEvent(result, "BeneficiaryAllotmentModified", {
      poolType: `${beneficiaryPool1}`,
      beneficiary: accounts[0],
      oldBeneficiaryAllotment: pool1BeneficiaryBeforeModification,
      newBeneficiaryAllotment: finalPool1Allottment,
    });

    const pool1BeneficiaryAfterAllotment =
      await issuanceInstance.getAllotment.call(beneficiaryPool1);

    expect(pool1BeneficiaryAfterAllotment).to.be.bignumber.equal(
      finalPool1Allottment
    );

    const pool2BeneficiaryBeforeModification =
      await issuanceInstance.getAllotment.call(beneficiaryPool2);

    result = await issuanceInstance.modifyBeneficiaryAllotment(
      beneficiaryPool2,
      accounts[0],
      finalPool2Allottment
    );

    expectEvent(result, "BeneficiaryAllotmentModified", {
      poolType: `${beneficiaryPool2}`,
      beneficiary: accounts[0],
      oldBeneficiaryAllotment: pool2BeneficiaryBeforeModification,
      newBeneficiaryAllotment: finalPool2Allottment,
    });

    const pool2BeneficiaryAfterAllotment =
      await issuanceInstance.getAllotment.call(beneficiaryPool2);

    expect(pool2BeneficiaryAfterAllotment).to.be.bignumber.equal(
      finalPool2Allottment
    );
  });

  it("should give proportional pool withdrawable amounts", async () => {
    const pool1Amount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool1
    );
    expect(pool1Amount).to.be.bignumber.equal(
      pool1TokenIssuance.div(new BN(2))
    );

    const pool2Amount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool2
    );
    expect(pool2Amount).to.be.bignumber.equal(
      pool2TokenIssuance.div(new BN(4))
    );
  });

  it("should give correct total withdrawable amount", async () => {
    const totalAmount = await issuanceInstance.getWithdrawableAmount();
    const pool1Amount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool1
    );
    const pool2Amount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool2
    );

    expect(totalAmount).to.be.bignumber.equal(pool1Amount.add(pool2Amount));
  });

  it("should allow beneficiary to withdraw tokens poolwise", async () => {
    const pool1BeforeAmount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool1
    );
    let beforeBalance = await tokenInstance.balanceOf(accounts[0]);
    await issuanceInstance.withdrawPoolTokens(beneficiaryPool1);
    const pool1AfterAmount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool1
    );
    let afterBalance = await tokenInstance.balanceOf(accounts[0]);
    expect(pool1AfterAmount).to.be.bignumber.equal("0");
    expect(afterBalance).to.be.bignumber.equal(
      beforeBalance.add(pool1BeforeAmount)
    );

    const pool2BeforeAmount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool2
    );
    beforeBalance = await tokenInstance.balanceOf(accounts[0]);
    await issuanceInstance.withdrawPoolTokens(beneficiaryPool2);
    const pool2AfterAmount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool2
    );
    afterBalance = await tokenInstance.balanceOf(accounts[0]);
    expect(pool2AfterAmount).to.be.bignumber.equal("0");
    expect(afterBalance).to.be.bignumber.equal(
      beforeBalance.add(pool2BeforeAmount)
    );
  });

  it("should allow beneficiary to withdraw tokens from all pools at once", async () => {
    const receipt = await tokenInstance.transfer(
      issuanceInstance.address,
      pool1TokenIssuance.add(pool2TokenIssuance)
    );

    expectEvent(receipt, "Transfer", {
      from: accounts[0],
      to: issuanceInstance.address,
      value: pool1TokenIssuance.add(pool2TokenIssuance),
    });

    let result = await issuanceInstance.addTokenIssuance(
      beneficiaryPool1,
      pool1TokenIssuance
    );

    expectEvent(result, "IssuanceAdded", {
      poolType: new BN(0),
      issuedAmount: pool1TokenIssuance,
    });

    result = await issuanceInstance.addTokenIssuance(
      beneficiaryPool2,
      pool2TokenIssuance
    );

    expectEvent(result, "IssuanceAdded", {
      poolType: new BN(1),
      issuedAmount: pool2TokenIssuance,
    });

    const totalBeforeAmount = await issuanceInstance.getWithdrawableAmount();
    const pool1BeforeAmount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool1
    );
    const pool2BeforeAmount = await issuanceInstance.getPoolWithdrawableAmount(
      beneficiaryPool2
    );
    expect(totalBeforeAmount).to.be.bignumber.equal(
      pool1BeforeAmount.add(pool2BeforeAmount)
    );
    const beforeBalance = await tokenInstance.balanceOf(accounts[0]);

    result = await issuanceInstance.withdrawTokens();
    expectEvent(result, "TokensWithdrawn", {
      beneficiary: accounts[0],
      withdrawnAmount: totalBeforeAmount,
    });

    const totalAfterAmount = await issuanceInstance.getWithdrawableAmount();
    expect(totalAfterAmount).to.be.bignumber.equal("0");

    const afterBalance = await tokenInstance.balanceOf(accounts[0]);

    expect(afterBalance).to.be.bignumber.equal(
      beforeBalance.add(totalBeforeAmount)
    );
  });

  it("should allow recovery of excess tokens", async () => {
    const extraTxferAmt = new BN(1000);
    const beforeBalance = await tokenInstance.balanceOf(accounts[0]);

    let receipt = await tokenInstance.transfer(
      issuanceInstance.address,
      extraTxferAmt
    );
    expectEvent(receipt, "Transfer", {
      from: accounts[0],
      to: issuanceInstance.address,
      value: extraTxferAmt,
    });

    const afterBalance = await tokenInstance.balanceOf(accounts[0]);
    expect(afterBalance).to.be.bignumber.equal(
      beforeBalance.sub(extraTxferAmt)
    );

    receipt = await issuanceInstance.recoverExcessTokens();

    expectEvent(receipt, "TokenRecovered", {
      amount: extraTxferAmt,
    });

    const afterRecoverBalance = await tokenInstance.balanceOf(accounts[0]);
    expect(afterRecoverBalance).to.be.bignumber.equal(beforeBalance);
  });

  it("should allow removal of a new beneficiary", async () => {
    const allottedTokens = distribution1.totalTokensAllotted.div(new BN(12));

    let result = await issuanceInstance.addBeneficiary(
      beneficiaryPool1,
      accounts[2],
      allottedTokens
    );

    expectEvent(result, "BeneficiaryAdded", {
      poolType: `${beneficiaryPool1}`,
      beneficiary: accounts[2],
      beneficiaryAllotment: allottedTokens,
    });

    const beforeIssuance =
      await issuanceInstance.distributionTypeToIssuance.call(beneficiaryPool1);

    const beforeTotalBeneficiaryAllotment =
      beforeIssuance.totalBeneficiaryAllotment;

    result = await issuanceInstance.removeBeneficiary(
      beneficiaryPool1,
      accounts[2]
    );

    expectEvent(result, "BeneficiaryRemoved", {
      poolType: `${beneficiaryPool1}`,
      beneficiary: accounts[2],
    });

    const afterIssuance =
      await issuanceInstance.distributionTypeToIssuance.call(beneficiaryPool1);
    const afterTotalBeneficiaryAllotment =
      afterIssuance.totalBeneficiaryAllotment;

    expect(afterTotalBeneficiaryAllotment).to.bignumber.equal(
      beforeTotalBeneficiaryAllotment.sub(allottedTokens)
    );
  });

  it("should not allow beneficiary allotment to be more than total allotment", async () => {
    const allottedTokens = distribution1.totalTokensAllotted
      .div(new BN(2))
      .add(new BN(1));

    await expectRevert(
      issuanceInstance.addBeneficiary(
        beneficiaryPool1,
        accounts[1],
        allottedTokens
      ),
      "Total allotment cannot exceed max pool allotment"
    );
  });

  it("should not allow decrease or removal of touched beneficiary allotments", async () => {
    const pool1AllottedTokens = distribution1.totalTokensAllotted.div(
      new BN(4)
    );

    await expectRevert(
      issuanceInstance.modifyBeneficiaryAllotment(
        beneficiaryPool1,
        accounts[0],
        pool1AllottedTokens
      ),
      "Beneficiary has withdrawn more than the decreased allotment"
    );

    await expectRevert(
      issuanceInstance.removeBeneficiary(beneficiaryPool1, accounts[0]),
      "Cannot remove beneficiary which already withdrew tokens"
    );
  });

  it("should not allow removal of a touched beneficiary", async () => {
    await expectRevert(
      issuanceInstance.removeBeneficiary(beneficiaryPool1, accounts[0]),
      "Cannot remove beneficiary which already withdrew tokens"
    );
  });
});
