const get = require("lodash.get");
const { BN } = require("@openzeppelin/test-helpers");

const ERC20FanToken = artifacts.require("ERC20FanToken");
const { expect } = require("chai");

const checkLogs = (result, logsLength, logAsserts) => {
  assert.isObject(result);
  assert.isArray(result.logs);
  assert.lengthOf(result.logs, logsLength);
  for (let i = 0; i < logAsserts.length; i += 1) {
    const { logIdx, strictEquals } = logAsserts[i];
    const log = result.logs[logIdx];
    assert.isObject(log);
    for (let j = 0; j < strictEquals.length; j += 1) {
      const { path, value, processActual } = strictEquals[j];
      let actual = get(log, path);
      if (processActual) {
        actual = processActual(actual);
      }
      assert.strictEqual(actual, value);
    }
  }
};

contract("ERC20FanToken ERC20", (accounts) => {
  let instance;
  const MAX_CAP = new BN("1000000000").mul(new BN("10").pow(new BN("18")));

  beforeEach(async () => {
    instance = await ERC20FanToken.deployed();
  });

  it("should get the deployed contract", async () => {
    expect(instance).to.exist;
  });

  it("should show correct token name and symbol", async () => {
    const name = await instance.name.call();
    const symbol = await instance.symbol.call();
    expect(name, "Token name mismatch").to.equal("FAW");
    expect(symbol, "Token symbol mismatch").to.equal("FAW");
  });

  it("should show correct balance", async () => {
    const balance = await instance.balanceOf.call(accounts[0]);

    return expect(balance, "Incorrect Initial Balance").to.be.bignumber.equal(
      MAX_CAP
    );
  });

  it("should show correct Total Supply", async () => {
    const totalSupply = await instance.totalSupply.call();

    expect(totalSupply, "Incorrect Total Supply").to.be.bignumber.equal(
      MAX_CAP
    );
  });

  it("should be able to transfer supply to vesting contract", async () => {
    const isTransferred = await instance.transfer(accounts[1], 10000);
    if (!isTransferred) {
      return false;
    }
    const balance = await instance.balanceOf.call(accounts[1]);
    const transferredAmount = new BN("10000");

    expect(
      balance,
      "Incorrect Treasury Balance after transfer"
    ).to.be.bignumber.equal(transferredAmount);
  });
});
