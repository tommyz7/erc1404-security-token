import { reverting } from './shouldFail';

const ServiceRegistry = artifacts.require('ServiceRegistry')
const RegulatorService = artifacts.require('RegulatorService')
const RegulatedTokenERC1404 = artifacts.require('RegulatedTokenERC1404')
var BN = web3.utils.BN;

contract('ERC1404', ([sender, recipient, ...accounts]) => {
  const owner = sender
  const initialAccount = sender
  const transferValue = web3.utils.toWei('0.1', 'ether')
  const initialBalance = web3.utils.toWei('100', 'ether')
  
  const CHECK_SUCCESS = 0
  const SUCCESS_MESSAGE = 'Success'
  const CHECK_ELOCKED = 1
  const ELOCKED_MESSAGE = 'Token is locked'
  const CHECK_EDIVIS = 2
  const EDIVIS_MESSAGE = 'Token can not trade partial amounts'
  const CHECK_ESEND = 3
  const ESEND_MESSAGE = 'Sender is not allowed to send the token'
  const CHECK_ERECV = 4
  const ERECV_MESSAGE = 'Receiver is not allowed to receive the token'
  const CHECK_EHOLDING_PERIOD = 5
  const EHOLDING_PERIOD_MESSAGE = 'Sender is still in 12 months holding period'
  const CHECK_EDECIMALS = 6
  const EDECIMALS_MESSAGE = 'Transfer value must be bigger than 0.000001 or 1 szabo'
  
  const PERM_SEND = 0x1
  const PERM_RECEIVE = 0x2

  let token
  let service
  let registry
  let tokenTotalSupply
  before(async () => {
    service = await RegulatorService.new()
    registry = await ServiceRegistry.new(service.address)
    token = await RegulatedTokenERC1404.new(
      registry.address,
      'R-Token',
      'RTKN'
    )
    await token.mint(initialAccount, initialBalance)
    tokenTotalSupply = await token.totalSupply()
  })

  let senderBalanceBefore
  let recipientBalanceBefore
  beforeEach(async () => {
    senderBalanceBefore = await token.balanceOf(sender)
    recipientBalanceBefore = await token.balanceOf(recipient)
  })

  it('should mint total supply of tokens to initial account', async () => {
    const initialAccountBalance = await token.balanceOf(initialAccount)
    assert(initialAccountBalance.eq(tokenTotalSupply))
  })

  it('should handle CHECK_ESEND condition', async () => {
    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    await token.transfer(recipient, transferValue, { from: sender })
    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert(senderBalanceAfter.eq(senderBalanceBefore))
    assert(recipientBalanceAfter.eq(recipientBalanceBefore))
    assert.equal(reason, CHECK_ESEND)
    assert.equal(message, ESEND_MESSAGE)
  })

  it('should handle CHECK_ERECV condition', async () => {
    await service.setPermission(token.address, sender, PERM_SEND) // approve sender
    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    await token.transfer(recipient, transferValue, { from: sender })
    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert(senderBalanceAfter.eq(senderBalanceBefore))
    assert(recipientBalanceAfter.eq(recipientBalanceBefore))
    assert.equal(reason,CHECK_ERECV)
    assert.equal(message, ERECV_MESSAGE)
  })

  it('should handle CHECK_ECDIVIS condition', async () => {
    await service.setPermission(token.address, recipient, PERM_RECEIVE) // approve recipient
    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    await token.transfer(recipient, transferValue, { from: sender })
    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert(senderBalanceAfter.eq(senderBalanceBefore))
    assert(recipientBalanceAfter.eq(recipientBalanceBefore))
    assert.equal(reason, CHECK_EDIVIS)
    assert.equal(message, EDIVIS_MESSAGE)
  })

  it('should allow for valid transfer', async () => {
    await service.setPartialTransfers(token.address, true) // enable partial transfers
    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    await token.transfer(recipient, transferValue, { from: sender })
    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert.equal(reason, CHECK_SUCCESS)
    assert.equal(message, SUCCESS_MESSAGE)
    assert.equal(senderBalanceAfter.toString(), senderBalanceBefore.sub(new BN(transferValue)).toString())
    assert.equal(recipientBalanceAfter.toString(), recipientBalanceBefore.add(new BN(transferValue)).toString())
  })

  it('should handle CHECK_ELOCKED condition', async () => {
    await service.setLocked(token.address, true) // lock token transfers
    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    await token.transfer(recipient, transferValue, { from: sender })
    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert(senderBalanceAfter.eq(senderBalanceBefore))
    assert(recipientBalanceAfter.eq(recipientBalanceBefore))
    assert.equal(reason, CHECK_ELOCKED)
    assert.equal(message, ELOCKED_MESSAGE)
  })

  it('should allow to set up holding period by admin only', async () => {
    // make sure there are no restrictions
    await service.setPartialTransfers(token.address, true)
    await service.setLocked(token.address, false)
    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    assert.equal(reason, CHECK_SUCCESS)
    assert.equal(message, SUCCESS_MESSAGE)

    let _startDate = Math.floor(Date.now() / 1000)
    await reverting(service.setHoldingPeriod(token.address, sender, _startDate, {from: accounts[0]}))
    await service.setHoldingPeriod(token.address, sender, _startDate)
  })

  it('should disallow token trasnfer when holding period is set', async () => {
    let tx = await token.transfer(recipient, transferValue, { from: sender })
    assert.equal(tx.logs[0].args.reason, CHECK_EHOLDING_PERIOD, "Reason should be CHECK_EHOLDING_PERIOD")
    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    assert.equal(reason, CHECK_EHOLDING_PERIOD)
    assert.equal(message, EHOLDING_PERIOD_MESSAGE)

    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert(senderBalanceAfter.eq(senderBalanceBefore))
    assert(recipientBalanceAfter.eq(recipientBalanceBefore))
  })

  it('should allow token transfer after holding period is over', async () => {
    // time travel 1 year and 1 second ahead
    let year = 365*24*60*60 + 1

    await web3.currentProvider.send({
      jsonrpc: '2.0', 
      method: 'evm_increaseTime',
      params: [year], 
      id: new Date().getSeconds()
    }, () => {})

    await web3.currentProvider.send({
      jsonrpc: '2.0', 
      method: 'evm_mine', 
      params: [], 
      id: new Date().getSeconds()
    }, () => {})

    const reason = await token.detectTransferRestriction(sender, recipient, transferValue)
    const message = await token.messageForTransferRestriction(reason)
    assert.equal(reason, CHECK_SUCCESS)
    assert.equal(message, SUCCESS_MESSAGE)

    let tx = await token.transfer(recipient, transferValue, { from: sender })
    assert.equal(tx.logs[1].args.from, sender)
    assert.equal(tx.logs[1].args.to, recipient)
    assert.equal(tx.logs[1].args.value, transferValue)
    
    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert.equal(senderBalanceAfter.toString(), senderBalanceBefore.sub(new BN(transferValue)).toString())
    assert.equal(recipientBalanceAfter.toString(), recipientBalanceBefore.add(new BN(transferValue)).toString())
    // TODO: find a way to reverse time increase
  })

  it('should disallow transfers of token lower than 6 decimal points', async () => {
    let minimalTransfer = web3.utils.toWei('0.000001', 'ether')
    let failValue = web3.utils.toWei('0.000000999999999999', 'ether')

    assert.equal(minimalTransfer, await service.MINIMAL_TRANSFER(), "Minimal transfer incorrect")

    let tx = await token.transfer(recipient, failValue, { from: sender })
    assert.equal(tx.logs[0].args.reason, CHECK_EDECIMALS, "Reason should be CHECK_EDECIMALS")

    const reason = await token.detectTransferRestriction(sender, recipient, failValue)
    const message = await token.messageForTransferRestriction(reason)
    assert.equal(reason, CHECK_EDECIMALS)
    assert.equal(message, EDECIMALS_MESSAGE)

    tx = await token.transfer(recipient, transferValue, { from: sender })
    assert.equal(tx.logs[1].args.from, sender)
    assert.equal(tx.logs[1].args.to, recipient)
    assert.equal(tx.logs[1].args.value, transferValue)
    
    const senderBalanceAfter = await token.balanceOf(sender)
    const recipientBalanceAfter = await token.balanceOf(recipient)
    assert.equal(senderBalanceAfter.toString(), senderBalanceBefore.sub(new BN(transferValue)).toString())
    assert.equal(recipientBalanceAfter.toString(), recipientBalanceBefore.add(new BN(transferValue)).toString())

  })
})