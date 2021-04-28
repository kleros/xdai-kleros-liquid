/* globals artifacts, contract, expect, web3 */
const { soliditySha3 } = require('web3-utils')
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades')
const { expectRevert } = require('@openzeppelin/test-helpers')
const {
  expectThrow,
} = require('openzeppelin-solidity/test/helpers/expectThrow')
const {
  increaseTime,
  advanceBlock,
  advanceBlockTo,
  latestBlockNumber,
} = require('../helpers/time')
const { MAX_UINT256 } = require('@openzeppelin/test-helpers/src/constants')

const MockRandomAuRa = artifacts.require('./contracts/mocks/MockRandomAuRa.sol')
const xKlerosLiquid = artifacts.require('./contracts/kleros/xKlerosLiquid.sol')
const xPinakion = artifacts.require('./contracts/mocks/BridgedPinakionMock.sol')
const wPinakion = artifacts.require('./contracts/tokens/WrappedPinakion.sol')
const TwoPartyArbitrable = artifacts.require(
  '@kleros/kleros-interaction/contracts/standard/arbitration/TwoPartyArbitrable.sol'
)
const SortitionSumTreeFactory = artifacts.require(
  '@kleros/kleros/contracts/data-structures/SortitionSumTreeFactory.sol'
)

// Helpers
const randomInt = (max, min = 1) =>
  Math.max(min, Math.ceil(Math.random() * max))
const generateSubcourts = (
  K,
  depth,
  ID = 0,
  minStake = 0,
  subcourtMap = {}
) => {
  const newMinStake = Math.max(randomInt(100), minStake)
  const subcourtTree = {
    ID,
    alpha: randomInt(1000),
    children:
      depth > 1
        ? [...new Array(K)].map(
            (_, i) =>
              generateSubcourts(
                K,
                depth - 1,
                K * ID + i + 1,
                newMinStake,
                subcourtMap
              ).subcourtTree
          )
        : undefined,
    hiddenVotes: ID % 2 === 0,
    jurorFee: randomInt(100),
    jurorsForJump: randomInt(15, 3),
    minStake: newMinStake,
    sortitionSumTreeK: randomInt(2, 5),
    timesPerPeriod: [...new Array(4)].map((_) => randomInt(5)),
  }
  if (ID === 0) subcourtTree.parent = 0
  else {
    subcourtTree.parent = Math.floor((ID - 1) / K)
    subcourtMap[subcourtTree.ID] = {
      ...subcourtTree,
      children:
        subcourtTree.children && subcourtTree.children.map((child) => child.ID),
    }
  }
  return { subcourtMap, subcourtTree }
}
const checkOnlyByGovernor = async (
  getter,
  value,
  method,
  nextValue,
  invalidFrom,
  nextFrom
) => {
  await method(nextValue) // Set the next value
  expect(await getter()).to.deep.equal(
    nextValue === Number(nextValue) ? web3.utils.toBN(nextValue) : nextValue
  ) // Check it was set properly
  await expectThrow(method(value, { from: invalidFrom })) // Throw when setting from a non governor address
  if (typeof nextFrom === 'undefined') await method(value)
  // Set back to the original value
  else await method(value, { from: nextFrom }) // Set back to the original value
}
const asyncForEach = async (method, iterable) => {
  const array = Array.isArray(iterable) ? iterable : Object.values(iterable)
  for (const item of array) await method(item)
}

contract('xKlerosLiquid', (accounts) => {
  let bridgedPinakion
  let pinakion
  let randomNumber
  let RNG
  let governor
  let minStakingTime
  let maxDrawingTime
  let subcourtTree
  let subcourtMap
  let klerosLiquid
  beforeEach(async () => {
    governor = accounts[0]
    // Deploy contracts and generate subcourts
    bridgedPinakion = await deployProxy(xPinakion, [
      governor, // receiver
      MAX_UINT256.div(web3.utils.toBN(2)), // initial supply
    ])

    pinakion = await deployProxy(wPinakion, [
      'Wrapped Pinakion', // _tokenName
      'WPNK', // _tokenSymbol
      bridgedPinakion.address, // xPinakion
      '0x0000000000000000000000000000000000000000', // tokenBridge
    ])
    randomNumber = 10
    RNG = await MockRandomAuRa.new(randomNumber)
    minStakingTime = 1
    maxDrawingTime = 1
    const {
      subcourtMap: _subcourtMap,
      subcourtTree: _subcourtTree,
    } = generateSubcourts(randomInt(4, 2), 3)
    subcourtTree = _subcourtTree
    subcourtMap = _subcourtMap

    const sortitionSumTreeFactoryLib = await SortitionSumTreeFactory.new()
    await xKlerosLiquid.link(
      'SortitionSumTreeFactory',
      sortitionSumTreeFactoryLib.address
    )
    klerosLiquid = await deployProxy(
      xKlerosLiquid,
      [
        governor,
        pinakion.address,
        RNG.address,
        minStakingTime,
        maxDrawingTime,
        subcourtTree.hiddenVotes,
        subcourtTree.minStake,
        subcourtTree.alpha,
        subcourtTree.jurorFee,
        subcourtTree.jurorsForJump,
        subcourtTree.timesPerPeriod,
        subcourtTree.sortitionSumTreeK,
      ],
      { unsafeAllowLinkedLibraries: true }
    )

    await pinakion.changeController(klerosLiquid.address)
  })

  it('Should implement the spec, https://docs.google.com/document/d/17aqJ0LTLJrQNSk07Cwop4JVRmicaCLi1I4UfYeSw96Y.', async () => {
    // Test general governance
    await checkOnlyByGovernor(
      klerosLiquid.governor,
      governor,
      klerosLiquid.changeGovernor,
      accounts[1],
      accounts[2],
      accounts[1]
    )
    await checkOnlyByGovernor(
      klerosLiquid.pinakion,
      pinakion.address,
      klerosLiquid.changePinakion,
      '0x0000000000000000000000000000000000000000',
      accounts[2]
    )
    await checkOnlyByGovernor(
      klerosLiquid.RNGenerator,
      RNG.address,
      klerosLiquid.changeRNGenerator,
      '0x0000000000000000000000000000000000000000',
      accounts[2]
    )
    await checkOnlyByGovernor(
      klerosLiquid.minStakingTime,
      minStakingTime,
      klerosLiquid.changeMinStakingTime,
      0,
      accounts[2]
    )
    await checkOnlyByGovernor(
      klerosLiquid.maxDrawingTime,
      maxDrawingTime,
      klerosLiquid.changeMaxDrawingTime,
      0,
      accounts[2]
    )

    // Create subcourts and check hierarchy
    await asyncForEach(
      (subcourt) =>
        klerosLiquid.createSubcourt(
          subcourt.parent,
          subcourt.hiddenVotes,
          subcourt.minStake,
          subcourt.alpha,
          subcourt.jurorFee,
          subcourt.jurorsForJump,
          subcourt.timesPerPeriod,
          subcourt.sortitionSumTreeK
        ),
      subcourtMap
    )
    await asyncForEach(async (subcourt) => {
      const r = await klerosLiquid.courts(subcourt.ID)
      expect([r[0], r[1], r[2], r[3], r[4], r[5]]).to.deep.equal([
        web3.utils.toBN(subcourt.parent),
        subcourt.hiddenVotes,
        web3.utils.toBN(subcourt.minStake),
        web3.utils.toBN(subcourt.alpha),
        web3.utils.toBN(subcourt.jurorFee),
        web3.utils.toBN(subcourt.jurorsForJump),
      ])
    }, subcourtMap)

    // Test subcourt governance
    await checkOnlyByGovernor(
      async () => (await klerosLiquid.courts(0))[2],
      subcourtTree.minStake,
      (nextValue, ...args) =>
        klerosLiquid.changeSubcourtMinStake(0, nextValue, ...args),
      0,
      accounts[2]
    )
    await checkOnlyByGovernor(
      async () => (await klerosLiquid.courts(0))[3],
      subcourtTree.alpha,
      (nextValue, ...args) =>
        klerosLiquid.changeSubcourtAlpha(0, nextValue, ...args),
      0,
      accounts[2]
    )
    await checkOnlyByGovernor(
      async () => (await klerosLiquid.courts(0))[4],
      subcourtTree.jurorFee,
      (nextValue, ...args) =>
        klerosLiquid.changeSubcourtJurorFee(0, nextValue, ...args),
      0,
      accounts[2]
    )
    await checkOnlyByGovernor(
      async () => (await klerosLiquid.courts(0))[5],
      subcourtTree.jurorsForJump,
      (nextValue, ...args) =>
        klerosLiquid.changeSubcourtJurorsForJump(0, nextValue, ...args),
      0,
      accounts[2]
    )
    await klerosLiquid.changeSubcourtTimesPerPeriod(
      0,
      subcourtTree.timesPerPeriod
    )

    // Test the dispute resolution flow
    const disputes = [
      {
        ID: 0,
        appeals: 0,
        numberOfJurors: subcourtTree.children[0].children[0].jurorsForJump,
        subcourtID: subcourtTree.children[0].children[0].ID,
        voteRatios: [0, 1, 2],
      },
      {
        ID: 1,
        appeals: 1,
        numberOfJurors: subcourtTree.children[0].children[1].jurorsForJump,
        subcourtID: subcourtTree.children[0].children[1].ID,
        voteRatios: [0, 2, 1],
      },
      {
        ID: 2,
        appeals: 2,
        numberOfJurors: subcourtTree.children[1].children[0].jurorsForJump,
        subcourtID: subcourtTree.children[1].children[0].ID,
        voteRatios: [1, 1, 2],
      },
      {
        ID: 3,
        appeals: 4,
        numberOfJurors: subcourtTree.jurorsForJump,
        subcourtID: subcourtTree.children[1].children[1].ID,
        voteRatios: [1, 2, 1],
      },
    ]

    // Create the disputes and set stakes directly
    await bridgedPinakion.approve(pinakion.address, MAX_UINT256, {
      from: governor,
    })
    await pinakion.deposit(MAX_UINT256.div(web3.utils.toBN(2)), {
      from: governor,
    })
    for (const dispute of disputes) {
      const extraData = `0x${dispute.subcourtID
        .toString(16)
        .padStart(64, '0')}${dispute.numberOfJurors
        .toString(16)
        .padStart(64, '0')}`
      await klerosLiquid.createDispute(2, extraData, {
        value: await klerosLiquid.arbitrationCost(extraData),
      })
      await klerosLiquid.setStake(
        dispute.subcourtID,
        subcourtMap[dispute.subcourtID].minStake
      )
    }

    // Set stakes using delayed actions
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()
    for (const dispute of disputes)
      await klerosLiquid.setStake(
        dispute.subcourtID,
        subcourtMap[dispute.subcourtID].minStake
      )
    await increaseTime(maxDrawingTime)
    await klerosLiquid.passPhase()
    for (const _dispute of disputes)
      await klerosLiquid.executeDelayedSetStakes(1)

    // Resolve disputes
    for (const dispute of disputes) {
      const numberOfDraws = []
      const totalJurorFees = []
      const votes = []
      const voteRatioDivisor = dispute.voteRatios.reduce((acc, v) => acc + v, 0)
      for (let i = 0; i <= dispute.appeals; i++) {
        if (
          dispute.subcourtID === 0 &&
          numberOfDraws[numberOfDraws.length - 1] >= subcourtTree.jurorsForJump
        )
          continue
        dispute.subcourtID = (
          await klerosLiquid.disputes(dispute.ID)
        )[0].toNumber()
        const subcourt = subcourtMap[dispute.subcourtID] || subcourtTree

        // Generate random number
        await increaseTime(minStakingTime)
        await klerosLiquid.passPhase()
        const RNBlock = await klerosLiquid.RNBlock()
        await advanceBlockTo(RNBlock.toNumber())
        await klerosLiquid.passPhase()

        // Draw
        const lockedTokensBefore = (await klerosLiquid.jurors(governor))[1]
        const drawBlockNumber = (
          await klerosLiquid.drawJurors(dispute.ID, MAX_UINT256)
        ).receipt.blockNumber
        const drawEvents = await klerosLiquid.getPastEvents('Draw', {
          filter: { _disputeID: dispute.ID },
          fromBlock: drawBlockNumber,
          toBlock: 'latest',
        })
        numberOfDraws.push(drawEvents.length)
        totalJurorFees.push(subcourt.jurorFee * numberOfDraws[i])
        const tokens1 = (await klerosLiquid.jurors(governor))[1]
        const tokens2 = lockedTokensBefore.add(
          web3.utils
            .toBN(subcourt.minStake)
            .mul(web3.utils.toBN(subcourt.alpha))
            .div(web3.utils.toBN(10000))
            .mul(web3.utils.toBN(numberOfDraws[i]))
        )
        expect(tokens1.eq(tokens2)).to.equal(true)
        await increaseTime(subcourt.timesPerPeriod[0])
        await klerosLiquid.passPeriod(dispute.ID)

        // Decide votes
        votes.push(
          dispute.voteRatios
            .map((voteRatio, index) =>
              [
                ...new Array(
                  Math.floor(numberOfDraws[i] * (voteRatio / voteRatioDivisor))
                ),
              ].map((_) => index)
            )
            .reduce((acc, a) => [...acc, ...a], [])
        )
        if (votes[i].length < numberOfDraws[i])
          votes[i] = [
            ...votes[i],
            ...[...new Array(numberOfDraws[i] - votes[i].length)].map((_) => 0),
          ]

        // Commit
        if (subcourt.hiddenVotes) {
          for (let j = 0; j < votes[i].length; j++)
            await klerosLiquid.castCommit(
              dispute.ID,
              [j],
              soliditySha3(votes[i][j], j)
            )
          await increaseTime(subcourt.timesPerPeriod[1])
          await klerosLiquid.passPeriod(dispute.ID)
        }

        // Test `appealPeriod` and `disputeStatus`
        const appealPeriod = await klerosLiquid.appealPeriod(dispute.ID)
        expect(appealPeriod[0]).to.deep.equal(web3.utils.toBN(0))
        expect(appealPeriod[1]).to.deep.equal(web3.utils.toBN(0))
        expect(await klerosLiquid.disputeStatus(dispute.ID)).to.deep.equal(
          web3.utils.toBN(0)
        )

        // Vote
        for (let j = 0; j < votes[i].length; j++)
          await klerosLiquid.castVote(dispute.ID, [j], votes[i][j], j)
        await increaseTime(subcourt.timesPerPeriod[2])
        const appealPeriodStart = (
          await web3.eth.getBlock(
            (await klerosLiquid.passPeriod(dispute.ID)).receipt.blockNumber
          )
        ).timestamp

        // Test `appealPeriod` and `disputeStatus`
        const appealPeriod2 = await klerosLiquid.appealPeriod(dispute.ID)
        expect(
          web3.utils
            .toBN(appealPeriod2[0])
            .eq(web3.utils.toBN(appealPeriodStart))
        ).to.equal(true)
        expect(
          web3.utils
            .toBN(appealPeriod2[1])
            .eq(
              web3.utils
                .toBN(appealPeriodStart)
                .add(web3.utils.toBN(subcourt.timesPerPeriod[3]))
            )
        ).to.equal(true)
        const status = await klerosLiquid.disputeStatus(dispute.ID)
        expect(web3.utils.toBN(status).eq(web3.utils.toBN(1))).to.deep.equal(
          true
        )

        // Appeal or execute
        if (i < dispute.appeals) {
          const appealCost = await klerosLiquid.appealCost(
            dispute.ID,
            '0x0000000000000000000000000000000000000000'
          )
          const non_payable_amount = MAX_UINT256.sub(web3.utils.toBN(1)).div(
            web3.utils.toBN(2)
          )
          if (appealCost.eq(non_payable_amount)) {
            await klerosLiquid.passPhase()
            continue
          }
          await expectThrow(
            klerosLiquid.appeal(
              dispute.ID,
              '0x0000000000000000000000000000000000000000',
              { value: appealCost, from: accounts[1] }
            )
          )
          if (
            dispute.subcourtID === 0 &&
            numberOfDraws[numberOfDraws.length - 1] >=
              subcourtTree.jurorsForJump
          ) {
            let error = null
            try {
              await klerosLiquid.appeal(
                dispute.ID,
                '0x0000000000000000000000000000000000000000',
                { value: appealCost }
              )
            } catch (err) {
              error = err
            }
            expect(error).to.not.equal(null)
          } else
            await klerosLiquid.appeal(
              dispute.ID,
              '0x0000000000000000000000000000000000000000',
              { value: appealCost }
            )
        } else {
          await increaseTime(subcourt.timesPerPeriod[3])
          await klerosLiquid.passPeriod(dispute.ID)
          // Test `disputeStatus`
          expect(await klerosLiquid.disputeStatus(dispute.ID)).to.deep.equal(
            web3.utils.toBN(2)
          )
          for (let i = 0; i <= dispute.appeals; i++) {
            const voteCounters = Object.entries(
              votes[votes.length - 1].reduce((acc, v) => {
                acc[v] = (acc[v] || 0) + 1
                return acc
              }, {})
            ).sort((a, b) => b[1] - a[1])
            const notTieAndNoCoherent =
              !(voteCounters[1] && voteCounters[1][1] === voteCounters[0][1]) &&
              !votes[i].includes(Number(voteCounters[0][0]))
            // Test `currentRuling`
            const currentRuling = await klerosLiquid.currentRuling(dispute.ID)
            const PNKBefore = web3.utils.toBN(
              await pinakion.balanceOf(governor)
            )
            const executeBlockNumber = (
              await klerosLiquid.execute(
                dispute.ID,
                i,
                web3.utils.toBN(MAX_UINT256)
              )
            ).receipt.blockNumber

            const PNKAfter = web3.utils.toBN(await pinakion.balanceOf(governor))
            const _tokensAtStakePerJuror = (
              await klerosLiquid.getDispute(dispute.ID)
            )[1]
            const coherentVotes = web3.utils.toBN(
              votes[i].filter((value) =>
                web3.utils.toBN(value).eq(currentRuling)
              ).length
            )
            const incoherentVotes = web3.utils
              .toBN(votes[i].length)
              .sub(coherentVotes)
            const burntPNK = _tokensAtStakePerJuror[i]
              .mul(incoherentVotes)
              .mod(coherentVotes)
            expect(PNKBefore.eq(PNKAfter.add(burntPNK))).to.equal(true)
            const tokensShiftEvents = await klerosLiquid.getPastEvents(
              'TokenAndETHShift',
              {
                filter: { _disputeID: dispute.ID },
                fromBlock: executeBlockNumber,
                toBlock: 'latest',
              }
            )
            expect(
              tokensShiftEvents
                .reduce(
                  (acc, e) => acc.add(e.args._ETHAmount),
                  web3.utils.toBN(0)
                )
                .toNumber()
            ).to.be.closeTo(
              notTieAndNoCoherent ? 0 : totalJurorFees[i],
              numberOfDraws[i]
            )
          }
          expect(
            web3.utils
              .toBN((await klerosLiquid.jurors(governor))[1])
              .eq(web3.utils.toBN(0))
          ).to.equal(true)
        }

        // Continue
        await klerosLiquid.passPhase()
      }
    }

    // Test untested getters
    await klerosLiquid.getSubcourt(subcourtTree.ID)
    await klerosLiquid.getVote(disputes[0].ID, 0, 0)
    await klerosLiquid.getVoteCounter(disputes[0].ID, 0)
    await klerosLiquid.getJuror(governor)
  })

  it('Should execute governor proposals.', async () => {
    const transferAmount = 100
    const PNKBefore = await pinakion.balanceOf(klerosLiquid.address)
    await bridgedPinakion.approve(
      pinakion.address,
      MAX_UINT256.div(web3.utils.toBN(2)),
      { from: governor }
    )
    await pinakion.deposit(MAX_UINT256.div(web3.utils.toBN(2)), {
      from: governor,
    })
    await pinakion.transfer(klerosLiquid.address, transferAmount, {
      from: governor,
    })
    await expectThrow(
      klerosLiquid.executeGovernorProposal(
        pinakion.address,
        transferAmount,
        pinakion.contract.methods.transfer(governor, transferAmount).encodeABI()
      )
    )
    await klerosLiquid.executeGovernorProposal(
      pinakion.address,
      0,
      pinakion.contract.methods.transfer(governor, transferAmount).encodeABI()
    )
    expect(await pinakion.balanceOf(klerosLiquid.address)).to.deep.equal(
      PNKBefore
    )
  })

  it('Should bump `RNBlock` when changing the `RNGenerator` during the generating phase.', async () => {
    const extraData = `0x${(0).toString(16).padStart(64, '0')}${(1)
      .toString(16)
      .padStart(64, '0')}`
    await klerosLiquid.createDispute(2, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.changeRNGenerator(RNG.address)
    expect(RNBlock.toNumber() + 4 * 2).to.deep.equal(
      (await klerosLiquid.RNBlock()).toNumber()
    )
  })

  it('Should not allow creating subcourts with parents that have a higher minimum stake.', () =>
    expectThrow(
      klerosLiquid.createSubcourt(
        subcourtTree.parent,
        subcourtTree.hiddenVotes,
        subcourtTree.minStake - 1,
        subcourtTree.alpha,
        subcourtTree.jurorFee,
        subcourtTree.jurorsForJump,
        subcourtTree.timesPerPeriod,
        subcourtTree.sortitionSumTreeK
      )
    ))

  it("Should not allow changing a subcourt's minimum stake to a value lower than its parent's or higher than any of its children's.", async () => {
    const subcourt = subcourtTree.children[0]
    await expectThrow(
      klerosLiquid.changeSubcourtMinStake(
        subcourt.ID,
        subcourtTree.minStake - 1
      )
    )
    await expectThrow(
      klerosLiquid.changeSubcourtMinStake(
        subcourt.ID,
        subcourt.children[0].minStake + 1
      )
    )
  })

  it('Should validate all preconditions for passing phases.', async () => {
    // Staking
    await expectThrow(klerosLiquid.passPhase())
    await increaseTime(minStakingTime)
    await expectThrow(klerosLiquid.passPhase())
    const extraData = `0x${(0).toString(16).padStart(64, '0')}${(1)
      .toString(16)
      .padStart(64, '0')}`
    await klerosLiquid.createDispute(2, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    await klerosLiquid.passPhase()

    // Generating
    const RNBlock = await klerosLiquid.RNBlock()
    const currentBlock = await latestBlockNumber()
    await advanceBlockTo(currentBlock + 2) // Advance directly to the reveal phase.
    await expectThrow(klerosLiquid.passPhase())
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()

    // Drawing
    await expectThrow(klerosLiquid.passPhase())
    await increaseTime(maxDrawingTime)
    await klerosLiquid.passPhase()
  })

  it('Should validate all preconditions for passing periods.', async () => {
    const disputeID = 0
    const numberOfJurors = 1
    const numberOfChoices = 2
    const extraData = `0x${subcourtTree.ID.toString(16).padStart(
      64,
      '0'
    )}${numberOfJurors.toString(16).padStart(64, '0')}`
    await klerosLiquid.createDispute(numberOfChoices, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    await bridgedPinakion.approve(
      pinakion.address,
      MAX_UINT256.div(web3.utils.toBN(2)),
      { from: governor }
    )
    await pinakion.deposit(MAX_UINT256.div(web3.utils.toBN(2)), {
      from: governor,
    })
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()
    await expectThrow(klerosLiquid.passPeriod(disputeID))
    await increaseTime(subcourtTree.timesPerPeriod[0])
    await expectThrow(klerosLiquid.passPeriod(disputeID))
    await klerosLiquid.drawJurors(disputeID, MAX_UINT256)
    await klerosLiquid.passPeriod(disputeID)
    await expectThrow(klerosLiquid.passPeriod(disputeID))
    await klerosLiquid.castCommit(
      disputeID,
      [numberOfJurors - 1],
      soliditySha3(numberOfChoices, numberOfJurors - 1)
    )
    await klerosLiquid.passPeriod(disputeID)
    await expectThrow(klerosLiquid.passPeriod(disputeID))
    await klerosLiquid.castVote(
      disputeID,
      [numberOfJurors - 1],
      numberOfChoices,
      numberOfJurors - 1
    )
    await klerosLiquid.passPeriod(disputeID)
    await expectThrow(klerosLiquid.passPeriod(disputeID))
    await increaseTime(subcourtTree.timesPerPeriod[3])
    await klerosLiquid.passPeriod(disputeID)
    await expectThrow(klerosLiquid.passPeriod(disputeID))
  })

  it('Should validate all preconditions for setting stake.', async () => {
    await asyncForEach(
      (subcourt) =>
        klerosLiquid.createSubcourt(
          subcourt.parent,
          subcourt.hiddenVotes,
          subcourt.minStake,
          subcourt.alpha,
          subcourt.jurorFee,
          subcourt.jurorsForJump,
          subcourt.timesPerPeriod,
          subcourt.sortitionSumTreeK
        ),
      subcourtMap
    )
    const PNK =
      subcourtTree.minStake +
      subcourtTree.children[0].minStake +
      subcourtTree.children[1].minStake +
      subcourtTree.children[0].children[0].minStake +
      subcourtTree.children[0].children[1].minStake
    await bridgedPinakion.approve(pinakion.address, PNK, { from: governor })
    await pinakion.deposit(PNK, { from: governor })
    await expectThrow(
      klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake - 1)
    )
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)
    await klerosLiquid.setStake(
      subcourtTree.children[0].ID,
      subcourtTree.children[0].minStake
    )
    await klerosLiquid.setStake(
      subcourtTree.children[1].ID,
      subcourtTree.children[1].minStake
    )
    await klerosLiquid.setStake(
      subcourtTree.children[0].children[0].ID,
      subcourtTree.children[0].children[0].minStake
    )
    await expectThrow(
      klerosLiquid.setStake(
        subcourtTree.children[0].children[1].ID,
        subcourtTree.children[0].children[1].minStake
      )
    )
    await expectThrow(
      klerosLiquid.setStake(
        subcourtTree.children[0].children[0].ID,
        subcourtTree.children[0].children[0].minStake +
          subcourtTree.children[0].children[1].minStake +
          1
      )
    )
    await klerosLiquid.setStake(subcourtTree.children[0].children[0].ID, 0)
  })


  it('Should prevent overflows when executing delayed set stakes.', async () => {
    const extraData = `0x${(0).toString(16).padStart(64, '0')}${(1)
      .toString(16)
      .padStart(64, '0')}`
    await klerosLiquid.createDispute(2, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)

    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()

    await increaseTime(maxDrawingTime)
    await klerosLiquid.passPhase()
    await klerosLiquid.executeDelayedSetStakes(1)
    await expectThrow(klerosLiquid.executeDelayedSetStakes(MAX_UINT256))
  })

  it('Should prevent overflows and going out of range when drawing jurors.', async () => {
    const disputeID = 0
    const numberOfJurors = 3
    const numberOfChoices = 2
    const extraData = `0x${subcourtTree.ID.toString(16).padStart(
      64,
      '0'
    )}${numberOfJurors.toString(16).padStart(64, '0')}`
    await klerosLiquid.createDispute(numberOfChoices, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    await bridgedPinakion.approve(
      pinakion.address,
      MAX_UINT256.div(web3.utils.toBN(2)),
      { from: governor }
    )
    await pinakion.deposit(MAX_UINT256.div(web3.utils.toBN(2)), {
      from: governor,
    })
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()
    await klerosLiquid.drawJurors(disputeID, 1)
    await expectThrow(klerosLiquid.drawJurors(disputeID, MAX_UINT256))
    await klerosLiquid.drawJurors(disputeID, numberOfJurors + 1)
  })

  it('Should validate all preconditions for committing and revealing a vote.', async () => {
    const disputeID = 0
    const numberOfJurors = 1
    const numberOfChoices = 2
    const extraData = `0x${subcourtTree.ID.toString(16).padStart(
      64,
      '0'
    )}${numberOfJurors.toString(16).padStart(64, '0')}`
    await klerosLiquid.createDispute(numberOfChoices, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    await bridgedPinakion.approve(
      pinakion.address,
      MAX_UINT256.div(web3.utils.toBN(2)),
      { from: governor }
    )
    await pinakion.deposit(MAX_UINT256.div(web3.utils.toBN(2)), {
      from: governor,
    })
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()
    await increaseTime(subcourtTree.timesPerPeriod[0])
    await klerosLiquid.drawJurors(disputeID, MAX_UINT256)
    await klerosLiquid.passPeriod(disputeID)
    await expectThrow(
      klerosLiquid.castCommit(
        disputeID,
        [numberOfJurors - 1],
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
    )
    await expectThrow(
      klerosLiquid.castCommit(
        disputeID,
        [numberOfJurors - 1],
        soliditySha3(numberOfChoices, numberOfJurors - 1),
        { from: accounts[1] }
      )
    )
    await klerosLiquid.castCommit(
      disputeID,
      [numberOfJurors - 1],
      soliditySha3(numberOfChoices, numberOfJurors - 1)
    )
    await expectThrow(
      klerosLiquid.castCommit(
        disputeID,
        [numberOfJurors - 1],
        soliditySha3(numberOfChoices, numberOfJurors - 1)
      )
    )
    await klerosLiquid.passPeriod(disputeID)
    await expectThrow(
      klerosLiquid.castVote(disputeID, [], numberOfChoices, numberOfJurors - 1)
    )
    await expectThrow(
      klerosLiquid.castVote(
        disputeID,
        [numberOfJurors - 1],
        numberOfChoices + 1,
        numberOfJurors - 1
      )
    )
    await expectThrow(
      klerosLiquid.castVote(
        disputeID,
        [numberOfJurors - 1],
        numberOfChoices,
        numberOfJurors - 1,
        { from: accounts[1] }
      )
    )
    await expectThrow(
      klerosLiquid.castVote(
        disputeID,
        [numberOfJurors - 1],
        numberOfChoices,
        numberOfJurors
      )
    )
    await klerosLiquid.castVote(
      disputeID,
      [numberOfJurors - 1],
      numberOfChoices,
      numberOfJurors - 1
    )
    await expectThrow(
      klerosLiquid.castVote(
        disputeID,
        [numberOfJurors - 1],
        numberOfChoices,
        numberOfJurors - 1
      )
    )
  })

  it('Should prevent overflows and going out of range when executing a dispute, unstake inactive jurors, and block insolvent transfers.', async () => {
    const disputeID = 0
    const numberOfJurors = 1
    const numberOfChoices = 2
    const extraData = `0x${subcourtTree.ID.toString(16).padStart(
      64,
      '0'
    )}${numberOfJurors.toString(16).padStart(64, '0')}`
    await klerosLiquid.createDispute(numberOfChoices, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    await bridgedPinakion.approve(pinakion.address, subcourtTree.minStake * 2, {
      from: governor,
    })
    await pinakion.deposit(subcourtTree.minStake * 2, { from: governor })
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)
    await expectThrow(pinakion.transfer(accounts[1], subcourtTree.minStake * 2))
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()
    await increaseTime(subcourtTree.timesPerPeriod[0])
    await klerosLiquid.drawJurors(disputeID, MAX_UINT256)
    await klerosLiquid.passPeriod(disputeID)
    await increaseTime(subcourtTree.timesPerPeriod[1])
    await klerosLiquid.passPeriod(disputeID)
    await increaseTime(subcourtTree.timesPerPeriod[2])
    await klerosLiquid.passPeriod(disputeID)
    await increaseTime(subcourtTree.timesPerPeriod[3])
    await klerosLiquid.passPeriod(disputeID)
    await klerosLiquid.passPhase()
    const disputeData = await klerosLiquid.disputes(disputeID)
    await klerosLiquid.execute(disputeID, 0, 1)
    await expectThrow(klerosLiquid.execute(disputeID, 0, MAX_UINT256))
    await klerosLiquid.execute(disputeID, 0, numberOfJurors * 2 + 1)
    expect((await klerosLiquid.jurors(governor))[0]).to.deep.equal(
      web3.utils.toBN(0)
    )
    expect(await klerosLiquid.stakeOf(governor, subcourtTree.ID)).to.deep.equal(
      web3.utils.toBN(0)
    )
  })

  it('Should call `rule` once on the arbitrated contract with the winning choice.', async () => {
    const partyB = accounts[1]
    const disputeID = 0
    const numberOfJurors = 1
    const numberOfChoices = 2
    const extraData = `0x${subcourtTree.ID.toString(16).padStart(
      64,
      '0'
    )}${numberOfJurors.toString(16).padStart(64, '0')}`
    const twoPartyArbitrable = await TwoPartyArbitrable.new(
      klerosLiquid.address, // _arbitrator
      0, // _timeout
      partyB, // _partyB
      numberOfChoices, // _amountOfChoices
      extraData, // _arbitratorExtraData
      '' // _metaEvidence
    )
    const arbitrationCost = await klerosLiquid.arbitrationCost(extraData)
    await twoPartyArbitrable.payArbitrationFeeByPartyA({
      value: arbitrationCost,
    })
    await twoPartyArbitrable.payArbitrationFeeByPartyB({
      from: partyB,
      value: arbitrationCost,
    })
    await bridgedPinakion.approve(
      pinakion.address,
      MAX_UINT256.div(web3.utils.toBN(2)),
      { from: governor }
    )
    await pinakion.deposit(MAX_UINT256.div(web3.utils.toBN(2)), {
      from: governor,
    })
    await klerosLiquid.setStake(subcourtTree.ID, subcourtTree.minStake)
    await increaseTime(minStakingTime)
    await klerosLiquid.passPhase()
    const RNBlock = await klerosLiquid.RNBlock()
    await advanceBlockTo(RNBlock.toNumber())
    await klerosLiquid.passPhase()
    await increaseTime(subcourtTree.timesPerPeriod[0])
    await klerosLiquid.drawJurors(disputeID, MAX_UINT256)
    await klerosLiquid.passPeriod(disputeID)
    await klerosLiquid.castCommit(
      disputeID,
      [numberOfJurors - 1],
      soliditySha3(numberOfChoices, numberOfJurors - 1)
    )
    await klerosLiquid.passPeriod(disputeID)
    await klerosLiquid.castVote(
      disputeID,
      [numberOfJurors - 1],
      numberOfChoices,
      numberOfJurors - 1
    )
    await klerosLiquid.passPeriod(disputeID)
    await increaseTime(subcourtTree.timesPerPeriod[3])
    await klerosLiquid.passPeriod(disputeID)
    const ETHBefore = web3.utils.toBN(await web3.eth.getBalance(partyB))
    await klerosLiquid.executeRuling(disputeID)
    await expectThrow(klerosLiquid.executeRuling(disputeID))
    const ETHAfter = web3.utils.toBN(await web3.eth.getBalance(partyB))
    expect(ETHAfter.gt(ETHBefore)).to.equal(true)
  })

  it('Should handle invalid extra data.', async () => {
    const disputeID = 0
    const extraData = `0x${(1000).toString(16).padStart(64, '0')}${(0)
      .toString(16)
      .padStart(64, '0')}ffffffffffffffff`
    await klerosLiquid.createDispute(2, extraData, {
      value: await klerosLiquid.arbitrationCost(extraData),
    })
    expect((await klerosLiquid.disputes(disputeID))[0]).to.deep.equal(
      web3.utils.toBN(0)
    )
    expect((await klerosLiquid.getDispute(disputeID))[0][0]).to.deep.equal(
      web3.utils.toBN(3)
    )
  })

  it('Should handle empty extra data.', async () => {
    const disputeID = 0
    await klerosLiquid.createDispute(2, 0, {
      value: await klerosLiquid.arbitrationCost(0),
    })
    expect((await klerosLiquid.disputes(disputeID))[0]).to.deep.equal(
      web3.utils.toBN(0)
    )
    expect((await klerosLiquid.getDispute(disputeID))[0][0]).to.deep.equal(
      web3.utils.toBN(3)
    )
  })

})
