const {
  BN,
  expectEvent,
  expectRevert,
  constants,
} = require("@openzeppelin/test-helpers");

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
    return expect(issuanceInstance).to.exist;
  });

  it("should not allow illegal token issuances", async () => {
    await expectRevert(
      issuanceInstance.addTokenIssuance(beneficiaryPool1, 0, {
        from: accounts[1],
      }),
      "Ownable: caller is not the owner"
    );

    await expectRevert(
      issuanceInstance.addTokenIssuance(beneficiaryPool1, 0),
      "Empty issuance amount"
    );

    await expectRevert(
      issuanceInstance.addTokenIssuance(beneficiaryPool1, 100),
      "Contract doesnt have enough balance"
    );

    await tokenInstance.transfer(issuanceInstance.address, 100);
  });

  it("should not allow illegal beneficiary addition", async () => {
    await expectRevert(
      issuanceInstance.addBeneficiary(
        beneficiaryPool1,
        accounts[1],
        initPool1Allottment,
        {
          from: accounts[1],
        }
      ),
      "Ownable: caller is not the owner"
    );

    await expectRevert(
      issuanceInstance.addBeneficiary(
        beneficiaryPool1,
        constants.ZERO_ADDRESS,
        initPool1Allottment
      ),
      "Invalid beneficiary address"
    );

    await expectRevert(
      issuanceInstance.addBeneficiary(beneficiaryPool1, accounts[0], 0),
      "No tokens allotted"
    );

    const reciept = await issuanceInstance.addBeneficiary(
      beneficiaryPool1,
      accounts[0],
      initPool1Allottment
    );

    expectEvent(reciept, "BeneficiaryAdded", {
      poolType: `${beneficiaryPool1}`,
      beneficiary: accounts[0],
      beneficiaryAllotment: initPool1Allottment,
    });

    await expectRevert(
      issuanceInstance.addBeneficiary(
        beneficiaryPool1,
        accounts[0],
        initPool1Allottment
      ),
      "Beneficiary already exists in pool"
    );
  });

  it("should not allow illegal beneficiary modification", async () => {
    await expectRevert(
      issuanceInstance.modifyBeneficiaryAllotment(
        beneficiaryPool1,
        accounts[0],
        finalPool1Allottment,
        {
          from: accounts[1],
        }
      ),
      "Ownable: caller is not the owner"
    );

    await expectRevert(
      issuanceInstance.modifyBeneficiaryAllotment(
        beneficiaryPool1,
        constants.ZERO_ADDRESS,
        finalPool1Allottment
      ),
      "Invalid beneficiary address"
    );

    await expectRevert(
      issuanceInstance.modifyBeneficiaryAllotment(
        beneficiaryPool1,
        accounts[0],
        0
      ),
      "No tokens allotted"
    );

    await expectRevert(
      issuanceInstance.modifyBeneficiaryAllotment(
        beneficiaryPool1,
        accounts[1],
        finalPool1Allottment
      ),
      "Beneficiary not in pool"
    );

    await expectRevert(
      issuanceInstance.modifyBeneficiaryAllotment(
        beneficiaryPool1,
        accounts[0],
        distribution1.totalTokensAllotted.add(new BN(1))
      ),
      "Cannot allot more than max pool allotment"
    );

    const reciept = await issuanceInstance.modifyBeneficiaryAllotment(
      beneficiaryPool1,
      accounts[0],
      finalPool1Allottment
    );

    expectEvent(reciept, "BeneficiaryAllotmentModified", {
      poolType: `${beneficiaryPool1}`,
      beneficiary: accounts[0],
      oldBeneficiaryAllotment: initPool1Allottment,
      newBeneficiaryAllotment: finalPool1Allottment,
    });
  });

  it("should not allow illegal beneficiary removal", async () => {
    await expectRevert(
      issuanceInstance.removeBeneficiary(beneficiaryPool1, accounts[0], {
        from: accounts[1],
      }),
      "Ownable: caller is not the owner"
    );

    await expectRevert(
      issuanceInstance.removeBeneficiary(beneficiaryPool1, accounts[1]),
      "Beneficiary not in pool"
    );

    const reciept = await issuanceInstance.removeBeneficiary(
      beneficiaryPool1,
      accounts[0]
    );

    expectEvent(reciept, "BeneficiaryRemoved", {
      poolType: `${beneficiaryPool1}`,
      beneficiary: accounts[0],
    });

    await issuanceInstance.addBeneficiary(
      beneficiaryPool1,
      accounts[0],
      finalPool1Allottment
    );
  });

  it("should not allow renounce of ownership", async () => {
    await expectRevert(
      issuanceInstance.renounceOwnership(),
      "Ownership cannot be renounced"
    );
    return true;
  });
});
