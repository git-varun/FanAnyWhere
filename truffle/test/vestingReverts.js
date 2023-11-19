/* eslint-disable no-unused-expressions */
const {
  time,
  expectEvent,
  expectRevert,
  BN,
} = require("@openzeppelin/test-helpers");

const { expect } = require("chai");
const vestingDistribution = require("./helpers/vestingDistribution");

const ERC20FanToken = artifacts.require("ERC20FanToken");
const FanTokenVesting = artifacts.require("FanTokenVesting");

contract("FanTokenVesting", (accounts) => {
  let tokenInstance;
  let vestingInstance;

  beforeEach(async () => {
    tokenInstance = await ERC20FanToken.deployed();
    vestingInstance = await FanTokenVesting.deployed();
  });

  it("should get the deployed contracts", async () => {
    expect(tokenInstance).to.exist;
    expect(vestingInstance).to.exist;
  });

  it("should be able to some tokens to vesting contract", async () => {
    const totalSupply = await tokenInstance.totalSupply.call();
    const receipt = await tokenInstance.transfer(
      vestingInstance.address,
      totalSupply.sub(new BN(1))
    );

    expectEvent(receipt, "Transfer", {
      from: accounts[0],
      to: vestingInstance.address,
      value: totalSupply.sub(new BN(1)),
    });

    return true;
  });

  it("should throw on initializing with insufficient funds", async () => {
    const now = (await time.latest()).toString();

    await expectRevert(
      vestingInstance.init(now),
      "Contract doesn't have enough balance to distribute"
    );

    return true;
  });

  it("should throw on calling `initialized` methods", async () => {
    await expectRevert(
      vestingInstance.withdrawTokens(
        vestingDistribution[0].distributionType.value
      ),
      "Contract not initialized"
    );

    await expectRevert(
      vestingInstance.recoverExcessTokens(),
      "Contract not initialized"
    );

    return true;
  });

  it("should throw on calling `onlyOwner` methods with non-owner account", async () => {
    const now = (await time.latest()).toString();

    await expectRevert(
      vestingInstance.init(now, { from: accounts[1] }),
      "Ownable: caller is not the owner"
    );

    await expectRevert(
      vestingInstance.withdrawTokens(
        vestingDistribution[0].distributionType.value,
        { from: accounts[1] }
      ),
      "Ownable: caller is not the owner"
    );

    await expectRevert(
      vestingInstance.recoverExcessTokens({ from: accounts[1] }),
      "Ownable: caller is not the owner"
    );

    await expectRevert(
      vestingInstance.setTreasury(accounts[1], { from: accounts[1] }),
      "Ownable: caller is not the owner"
    );

    return true;
  });

  it("should not allow renounce of ownership", async () => {
    await expectRevert(
      vestingInstance.renounceOwnership(),
      "Ownership cannot be renounced"
    );
    return true;
  });
});
