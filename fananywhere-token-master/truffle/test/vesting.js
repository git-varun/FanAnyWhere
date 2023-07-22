/* eslint-disable no-unused-expressions */
const {
  time,
  expectEvent,
  expectRevert,
  BN,
} = require("@openzeppelin/test-helpers");
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

  it("should show correct total supply", async () => {
    const totalSupply = await tokenInstance.totalSupply.call();

    const MAX_CAP = new BN("1000000000").mul(new BN("10").pow(new BN("18")));

    expect(totalSupply, "Incorrect Total Supply").to.be.bignumber.equal(
      MAX_CAP
    );
  });

  it("should allow admin to change the treasury", async () => {
    const treasury = await vestingInstance.treasury.call();
    const receipt = await vestingInstance.setTreasury(contractTeasury);

    expectEvent(receipt, "TreasuryChanged", {
      oldTreasury: treasury,
      newTreasury: contractTeasury,
    });

    const newTreasury = await vestingInstance.treasury.call();
    expect(newTreasury).to.equal(contractTeasury);

    return true;
  });

  const _checkDistributionInfo = async (distribution, now, checkDays) => {
    const distributionInfo = await vestingInstance.distributionInfo.call(
      distribution.distributionType.value
    );

    expect(distributionInfo.totalTokensAllotted).to.be.bignumber.equal(
      distribution.totalTokensAllotted
    );
    expect(distributionInfo.initialTokensReleased).to.be.bignumber.equal(
      distribution.initialTokensReleased
    );
    expect(distributionInfo.cliffPeriodMonths).to.be.bignumber.equal(
      distribution.cliffPeriodMonths
    );
    expect(distributionInfo.vestingPeriodMonths).to.be.bignumber.equal(
      distribution.vestingPeriodMonths
    );
    expect(distributionInfo.withdrawnTokens).to.be.bignumber.equal("0");

    if (checkDays) {
      const numDaysCliff = Math.round(
        moment
          .duration(
            moment(now, "X")
              .add(distribution.cliffPeriodMonths.toString(), "months")
              .diff(moment(now, "X"))
          )
          .asDays()
      );

      expect(distributionInfo.cliffPeriodDays).to.be.bignumber.equal(
        `${numDaysCliff}`
      );

      const numDaysVesting = Math.round(
        moment
          .duration(
            moment(now, "X")
              .add(distribution.vestingPeriodMonths.toString(), "months")
              .diff(moment(now, "X"))
          )
          .asDays()
      );

      expect(distributionInfo.vestingPeriodDays).to.be.bignumber.equal(
        `${numDaysVesting}`
      );

      console.log(
        `  ==> DISTRIBUTION TYPE: ${distribution.distributionType.name}`
      );
      console.log(
        `  ==> TOTAL ALLOTTED TOKENS: ${distributionInfo.totalTokensAllotted.toString()}`
      );
      console.log(
        `  ==> TGE TOKENS: ${distributionInfo.initialTokensReleased.toString()}`
      );
      console.log(
        `  ==> CLIFF PERIOD DAYS: ${distributionInfo.cliffPeriodDays.toString()}`
      );
      console.log(
        `  ==> VESTING PERIOD DAYS: ${distributionInfo.vestingPeriodDays.toString()}`
      );
      console.log("--");
    }
  };

  const _checkWithdrawableTokens = async (distribution, withdrawTs) => {
    const withdrawableTokens = await vestingInstance.withdrawableTokens(
      distribution.distributionType.value
    );

    if (withdrawTs === undefined) {
      expect(withdrawableTokens).to.be.bignumber.equal("0");
      return;
    }

    const distributionInfo = await vestingInstance.distributionInfo.call(
      distribution.distributionType.value
    );

    const initialTimestamp = await vestingInstance.getInitialTimestamp.call();
    const numDays = Math.round(
      moment
        .duration(
          moment(withdrawTs, "X").diff(moment(initialTimestamp.toString(), "X"))
        )
        .asDays()
    );

    const numDaysBn = new BN(`${numDays}`);
    const numDaysCliff = new BN(distributionInfo.cliffPeriodDays.toString());
    const numDaysVesting = new BN(
      distributionInfo.vestingPeriodDays.toString()
    );

    let vestingMode;

    let eVestedTokens;
    if (numDaysBn.lte(numDaysCliff)) {
      eVestedTokens = new BN("0");
      vestingMode = "BEFORE CLIFF";
    } else if (numDaysBn.gte(numDaysVesting)) {
      eVestedTokens = distributionInfo.totalTokensAllotted.sub(
        distribution.initialTokensReleased
      );
      vestingMode = "TOTAL VESTED";
    } else {
      eVestedTokens = distribution.totalTokensAllotted
        .sub(distribution.initialTokensReleased)
        .div(numDaysVesting)
        .mul(numDaysBn);
      vestingMode = "PARTIAL VESTED";
    }

    const eWithdrawnTokens = new BN("0");
    const eWithdrawableTokens = distribution.initialTokensReleased
      .add(eVestedTokens)
      .sub(eWithdrawnTokens);

    console.log(
      `  ==> DISTRIBUTION TYPE: ${distribution.distributionType.name}`
    );
    console.log(
      `  ==> INITIALIZED DATE: ${moment(
        initialTimestamp.toString(),
        "X"
      ).format("DD/MM/YYYY")}`
    );
    console.log(
      `  ==> CHECKING ON: ${moment(withdrawTs, "X").format("DD/MM/YYYY")}`
    );
    console.log(`  ==> DAYS PASSED: ${numDays}`);
    console.log(`  ==> VESTING MODE: ${vestingMode}`);
    console.log(`  ==> VESTED AMOUNT: ${eVestedTokens.toString()}`);
    console.log(
      `  ==> INITIAL TOKENS: ${distribution.initialTokensReleased.toString()}`
    );
    console.log(`  ==> WITHDRAWN TOKENS: ${eWithdrawnTokens.toString()}`);
    console.log(`  ==> UNLOCKED TOKENS: ${eWithdrawableTokens.toString()}`);
    console.log(`  ==> CONTRACT RESPONSE: ${withdrawableTokens.toString()}`);
    console.log("--");

    expect(withdrawableTokens).to.be.bignumber.equal(eWithdrawableTokens);
  };

  it("should be able to transfer supply to vesting contract", async () => {
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

    const tokenDistributionPromises = [];
    for (let i = 0; i < vestingDistribution.length; i += 1) {
      const distribution = vestingDistribution[i];
      tokenDistributionPromises.push(_checkDistributionInfo(distribution));
    }
    await Promise.all(tokenDistributionPromises);

    return true;
  });

  it("should return correct initial withdrawable tokens", async () => {
    const tokenWithdrawablePromises = [];
    for (let i = 0; i < vestingDistribution.length; i += 1) {
      const distribution = vestingDistribution[i];
      tokenWithdrawablePromises.push(_checkWithdrawableTokens(distribution));
    }
    await Promise.all(tokenWithdrawablePromises);

    return true;
  });

  it("should set the initial timestamp and vesting days", async () => {
    const now = (await time.latest()).toString();

    await vestingInstance.init(now);
    console.log("===============================================");
    console.log("********** Checking distribution info *********");
    console.log("===============================================");
    console.log(
      `Setting intialization date: ${moment(now, "X").format("DD/MM/YYYY")}`
    );

    const tokenDistributionPromises = [];
    for (let i = 0; i < vestingDistribution.length; i += 1) {
      const distribution = vestingDistribution[i];
      tokenDistributionPromises.push(
        _checkDistributionInfo(distribution, now, true)
      );
    }
    await Promise.all(tokenDistributionPromises);
  });

  it("should not initialize twice", async () => {
    const now = (await time.latest()).toString();

    await expectRevert(
      vestingInstance.init(now),
      "Contract already initialized"
    );

    return true;
  });

  it("should check withdrawable tokens for various elapsed times", async () => {
    const initialTimestamp = await vestingInstance.getInitialTimestamp.call();
    const monthsToCheck = [1, 2, 12, 13];

    console.log("===============================================");
    console.log("******* Checking withdrawable schedules *******");
    console.log("===============================================");

    for (let i = 0; i < monthsToCheck.length; i += 1) {
      const monthToCheck = monthsToCheck[i];
      const targetTs = moment(initialTimestamp, "X")
        .add(monthToCheck, "months")
        .format("X");

      // eslint-disable-next-line no-await-in-loop
      const now = await time.latest();
      console.log(
        `Shifting from ${moment(now, "X").format("DD/MM/YYYY")} to ${moment(
          targetTs,
          "X"
        ).format("DD/MM/YYYY")}`
      );
      // eslint-disable-next-line no-await-in-loop
      await time.increaseTo(targetTs);

      const withdrawablePromises = [];
      for (let j = 0; j < vestingDistribution.length; j += 1) {
        const distribution = vestingDistribution[j];
        withdrawablePromises.push(
          _checkWithdrawableTokens(distribution, targetTs)
        );
      }
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(withdrawablePromises);
    }
  });
});
