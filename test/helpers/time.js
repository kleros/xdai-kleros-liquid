const { time } = require('@openzeppelin/test-helpers')

async function latestBlockNumber() {
  return Number(await time.latestBlock())
}

async function latestTime() {
  return Number(await time.latest())
}

async function increaseTime(secondsPassed) {
  return time.increase(secondsPassed)
}

async function advanceBlock() {
  return time.advanceBlock()
}

async function advanceBlockTo(block) {
  return time.advanceBlockTo(block)
}

module.exports = {
  latestTime,
  increaseTime,
  advanceBlock,
  advanceBlockTo,
  latestBlockNumber,
}
