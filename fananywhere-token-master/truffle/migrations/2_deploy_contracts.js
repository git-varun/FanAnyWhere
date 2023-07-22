const ERC20FanToken = artifacts.require("ERC20FanToken");
const FanTokenVesting = artifacts.require("FanTokenVesting");
const FanTokenIssuance = artifacts.require("FanTokenIssuance");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(ERC20FanToken);
  const fanToken = await ERC20FanToken.deployed();
  await deployer.deploy(FanTokenVesting, fanToken.address, accounts[0]);

  await deployer.deploy(FanTokenIssuance, fanToken.address);
};
