/* eslint-disable no-unused-expressions */
const { time, expectEvent, BN } = require("@openzeppelin/test-helpers");
const moment = require("moment");

const { expect } = require("chai");
const vestingDistribution = require("./helpers/vestingDistribution");

const ERC20FanToken = artifacts.require("ERC20FanToken");
const FanTokenVesting = artifacts.require("FanTokenVesting");

contract("FanTokenVesting", (accounts) => {
  let tokenInstance;
  let vestingInstance;
  let contractTeasury;

  beforeEach(async () => {
    tokenInstance = await ERC20FanToken.deployed();
    vestingInstance = await FanTokenVesting.deployed();
    [, contractTeasury] = accounts;
  });

  it("should get the deployed contracts", async () => {
    expect(tokenInstance).to.exist;
    expect(vestingInstance).to.exist;
  });

  const checkWithdrawal = async (distribution) => {
    const contractStartBalance = await tokenInstance.balanceOf.call(
      vestingInstance.address
    );
    const treasuryStartBalance = await tokenInstance.balanceOf.call(
      contractTeasury
    );

    const withdrawableTokensBeforeWithdraw =
      await vestingInstance.withdrawableTokens(
        distribution.distributionType.value
      );

    await vestingInstance.withdrawTokens(distribution.distributionType.value);

    const withdrawableTokensAfterWithdraw =
      await vestingInstance.withdrawableTokens(
        distribution.distributionType.value
      );
    expect(withdrawableTokensAfterWithdraw).to.be.bignumber.equal("0");

    const contractEndBalance = await tokenInstance.balanceOf.call(
      vestingInstance.address
    );

    expect(contractEndBalance).to.bignumber.equal(
      contractStartBalance.sub(withdrawableTokensBeforeWithdraw)
    );

    const treasuryEndBalance = await tokenInstance.balanceOf.call(
      contractTeasury
    );

    expect(treasuryEndBalance).to.bignumber.equal(
      treasuryStartBalance.add(withdrawableTokensBeforeWithdraw)
    );

    console.log(
      `  ==> DISTRIBUTION TYPE: ${distribution.distributionType.name}`
    );
    console.log(`  ==> BEFORE WITHDRAW`);
    console.log(
      `         - UNLOCKED TOKENS: ${withdrawableTokensBeforeWithdraw.toString()}`
    );
    console.log(
      `         - CONTRACT BALANCE: ${contractStartBalance.toString()}`
    );
    console.log(
      `         - TREASURY BALANCE: ${treasuryStartBalance.toString()}`
    );
    console.log(`  ==> AFTER WITHDRAW`);
    console.log(
      `         - UNLOCKED : ${withdrawableTokensAfterWithdraw.toString()}`
    );
    console.log(
      `         - CONTRACT BALANCE: ${contractEndBalance.toString()}`
    );
    console.log(
      `         - TREASURY BALANCE: ${treasuryEndBalance.toString()}`
    );
    console.log("--");
  };

  it("should be able to withdraw tokens and reduce contracts balance", async () => {
    const totalSupply = await tokenInstance.totalSupply.call();
    const receipt = await tokenInstance.transfer(
      vestingInstance.address,
      totalSupply
    );

    expectEvent(receipt, "Transfer", {
      from: accounts[0],
      to: vestingInstance.address,
      value: totalSupply,
    });

    const now = await time.latest();

    await vestingInstance.init(now);
    await vestingInstance.setTreasury(contractTeasury);

    console.log("===============================================");
    console.log("********* Checking vesting withdrawals *********");
    console.log("===============================================");

    const initialTimestamp = await vestingInstance.getInitialTimestamp.call();
    console.log(
      "Vesting contract initialized At: ",
      moment(initialTimestamp.toString(), "X").format("DD/MM/YYYY")
    );

    const targetTs = moment(initialTimestamp, "X")
      .add(48, "months")
      .format("X");

    console.log(
      `Shifting from ${moment(now, "X").format("DD/MM/YYYY")} to ${moment(
        targetTs,
        "X"
      ).format("DD/MM/YYYY")}`
    );
    // eslint-disable-next-line no-await-in-loop
    await time.increaseTo(targetTs);

    for (let i = 0; i < vestingDistribution.length; i += 1) {
      const distribution = vestingDistribution[i];
      // eslint-disable-next-line no-await-in-loop
      await checkWithdrawal(distribution);
    }

    const contractEndBalance = await tokenInstance.balanceOf.call(
      vestingInstance.address
    );

    const treasuryEndBalance = await tokenInstance.balanceOf.call(
      contractTeasury
    );

    expect(contractEndBalance).to.bignumber.equal("0");
    expect(treasuryEndBalance).to.bignumber.equal(totalSupply);
  });

  it("should allow admin to recover excess tokens", async () => {
    const adminStartBalance = await tokenInstance.balanceOf.call(accounts[0]);
    await tokenInstance.transfer(vestingInstance.address, "10", {
      from: contractTeasury,
    });
    const receipt = await vestingInstance.recoverExcessTokens();
    expectEvent(receipt, "TokenRecovered", {
      amount: new BN("10"),
    });

    const adminEndBalance = await tokenInstance.balanceOf.call(accounts[0]);
    expect(adminEndBalance).to.bignumber.equal(
      adminStartBalance.add(new BN("10"))
    );
  });
});
