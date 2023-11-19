const { BN } = require("@openzeppelin/test-helpers");

const DISTRIBUTIONTYPES = {
  TEAM: { value: 0, name: "TEAM" },
  SEED: { value: 1, name: "SEED" },
  STRATEGIC: { value: 2, name: "STRATEGIC" },
  PRIVATE1: { value: 3, name: "PRIVATE1" },
  PRIVATE2: { value: 4, name: "PRIVATE2" },
  PUBLIC: { value: 5, name: "PUBLIC" },
  ADVISORS: { value: 6, name: "ADVISORS" },
  LIQUIDITY: { value: 7, name: "LIQUIDITY" },
  REWARDS: { value: 8, name: "REWARDS" },
  MARKETING: { value: 9, name: "MARKETING" },
  RESERVES: { value: 10, name: "RESERVES" },
  ECOSYSTEM: { value: 11, name: "ECOSYSTEM" },
};

const _mulE18 = (n) => new BN(n).mul(new BN("10").pow(new BN("18")));
const _bn = (n) => new BN(n);

module.exports = [
  {
    distributionType: DISTRIBUTIONTYPES.TEAM,
    totalTokensAllotted: _mulE18("125000000"),
    initialTokensReleased: _mulE18("0"),
    cliffPeriodMonths: _bn("12"),
    vestingPeriodMonths: _bn("48"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.SEED,
    totalTokensAllotted: _mulE18("20000000"),
    initialTokensReleased: _mulE18("1000000"),
    cliffPeriodMonths: _bn("1"),
    vestingPeriodMonths: _bn("12"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.STRATEGIC,
    totalTokensAllotted: _mulE18("51000000"),
    initialTokensReleased: _mulE18("2550000"),
    cliffPeriodMonths: _bn("1"),
    vestingPeriodMonths: _bn("12"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.PRIVATE1,
    totalTokensAllotted: _mulE18("40000000"),
    initialTokensReleased: _mulE18("2800000"),
    cliffPeriodMonths: _bn("1"),
    vestingPeriodMonths: _bn("12"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.PRIVATE2,
    totalTokensAllotted: _mulE18("66000000"),
    initialTokensReleased: _mulE18("5280000"),
    cliffPeriodMonths: _bn("1"),
    vestingPeriodMonths: _bn("12"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.PUBLIC,
    totalTokensAllotted: _mulE18("23000000"),
    initialTokensReleased: _mulE18("4600000"),
    cliffPeriodMonths: _bn("0"),
    vestingPeriodMonths: _bn("4"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.ADVISORS,
    totalTokensAllotted: _mulE18("70000000"),
    initialTokensReleased: _mulE18("0"),
    cliffPeriodMonths: _bn("6"),
    vestingPeriodMonths: _bn("24"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.LIQUIDITY,
    totalTokensAllotted: _mulE18("20000000"),
    initialTokensReleased: _mulE18("20000000"),
    cliffPeriodMonths: _bn("0"),
    vestingPeriodMonths: _bn("0"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.REWARDS,
    totalTokensAllotted: _mulE18("200000000"),
    initialTokensReleased: _mulE18("0"),
    cliffPeriodMonths: _bn("1"),
    vestingPeriodMonths: _bn("25"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.MARKETING,
    totalTokensAllotted: _mulE18("120000000"),
    initialTokensReleased: _mulE18("6000000"),
    cliffPeriodMonths: _bn("0"),
    vestingPeriodMonths: _bn("24"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.RESERVES,
    totalTokensAllotted: _mulE18("135000000"),
    initialTokensReleased: _mulE18("6750000"),
    cliffPeriodMonths: _bn("0"),
    vestingPeriodMonths: _bn("24"),
  },
  {
    distributionType: DISTRIBUTIONTYPES.ECOSYSTEM,
    totalTokensAllotted: _mulE18("130000000"),
    initialTokensReleased: _mulE18("0"),
    cliffPeriodMonths: _bn("1"),
    vestingPeriodMonths: _bn("19"),
  },
];
