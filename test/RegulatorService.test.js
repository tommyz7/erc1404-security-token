/**
   Copyright (c) 2017 Harbor Platform, Inc.

   Licensed under the Apache License, Version 2.0 (the “License”);
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an “AS IS” BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
import { expectThrow } from 'zeppelin-solidity/test/helpers/expectThrow';
import { inLogs } from 'zeppelin-solidity/test/helpers/expectEvent';
var BN = web3.utils.BN;
const RegulatedTokenERC1404 = artifacts.require('RegulatedTokenERC1404.sol');
const RegulatorService = artifacts.require('RegulatorService.sol');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const PERM_NONE = 0x0;
const PERM_SEND = 0x1;
const PERM_RECEIVE = 0x2;
const PERM_TRANSFER = PERM_SEND | PERM_RECEIVE;

const ENONE = 0;
const ELOCKED = 1;
const EDIVIS = 2;
const ESEND = 3;
const ERECV = 4;

let transferValue = web3.utils.toWei('1', 'ether');

contract('RegulatorService', async accounts => {
  let owner, other, spender, admin, account;
  let service, token;

  beforeEach(async () => {
    owner = accounts[0];
    spender = owner;
    admin = accounts[1];
    account = accounts[2];
    other = accounts[3];

    service = await RegulatorService.new({ from: owner });
    token = await RegulatedTokenERC1404.new(service.address, "R-Token", "RTKN");
  });

  const onlyOwner = (method, producer) => {
    it(method + ' requires owner permissions', async () => {
      const [serviceToTest, ...args] = producer();

      const acct = accounts[accounts.length - 1];

      assert.isTrue(!!acct);
      assert.isTrue(acct != accounts[0]);

      await expectThrow(serviceToTest[method](...args, { from: acct }));
    });
  };

  const assertResult = (ret, success, reason) => {
    assert.equal(ret, reason, 'Assert reason');
  };

  describe('permissions', () => {
    onlyOwner('setLocked', () => {
      return [service, token.address, true];
    });
    onlyOwner('setPartialTransfers', () => {
      return [service, token.address, true];
    });
    onlyOwner('setPermission', () => {
      return [service, token.address, account, 0];
    });
    onlyOwner('transferAdmin', () => {
      return [service, account];
    });

    describe('setPermission', () => {
      beforeEach(async () => {
        await service.transferAdmin(admin);
      });

      it('allows admin to invoke', async () => {
        await service.setPermission.call(ZERO_ADDRESS, account, 0, { from: admin });
        await expectThrow(service.setPermission.call(ZERO_ADDRESS, account, 0, { from: other }));
      });
    });

    describe('default roles', () => {
      it('defaults the owner as the creator of the contract', async () => {
        const currentOwner = await service.owner();
        assert.equal(owner, currentOwner);
      });

      it('defaults the admin as the creator of the contract', async () => {
        const currentAdmin = await service.admin();
        assert.equal(owner, currentAdmin);
      });
    });
  });

  describe('locking', () => {
    beforeEach(async () => {
      await service.setPermission(token.address, owner, PERM_TRANSFER);
      await service.setPermission(token.address, account, PERM_TRANSFER);
    });

    it('toggles the ability to trade', async () => {
      await service.setLocked(token.address, true);
      assertResult(await service.check.call(token.address, spender, owner, account, transferValue), false, ELOCKED);
      await service.setLocked(token.address, false);
      assertResult(await service.check.call(token.address, spender, owner, account, transferValue), true, ENONE);
    });

    it('logs an event', async () => {
      const { logs } = await service.setLocked(token.address, false);
      
      const event = await inLogs(logs, 'LogLockSet');
      event.args.token.should.eq(token.address);
      event.args.locked.should.eq(false);
    });
  });

  describe('partial trades', () => {
    const roundAmount = web3.utils.toWei('100', "ether");
    const partialAmount = web3.utils.toWei('100.111', "ether");
    beforeEach(async () => {
      await service.setLocked(token.address, false);
      await service.setPermission(token.address, owner, PERM_TRANSFER);
      await service.setPermission(token.address, account, PERM_TRANSFER);

      // const decimals = 4;
      let expectedTotalSupply = 2000 * 10 ** await token.decimals.call();
      expectedTotalSupply = new BN(expectedTotalSupply.toString());

      // await token.setDecimals(decimals);
      await token.mint(owner, expectedTotalSupply);
      let supply = await token.totalSupply.call();
      assert.equal(expectedTotalSupply.toString(), supply.toString());

      assertResult(await service.check.call(token.address, spender, owner, account, partialAmount), false, EDIVIS);
    });

    it('logs an event', async () => {
      const { logs } = await service.setPartialTransfers(token.address, true);

      const event = await inLogs(logs, 'LogPartialTransferSet');
      event.args.token.should.eq(token.address);
      event.args.enabled.should.eq(true);
    });

    describe('when partial trades are allowed', async () => {
      it('allows fractional trades', async () => {
        await service.setPartialTransfers(token.address, true);
        assertResult(await service.check.call(token.address, spender, owner, account, partialAmount), true, ENONE);
        assertResult(await service.check.call(token.address, spender, owner, account, roundAmount), true, ENONE);
      });
    });

    describe('when partial trades are NOT allowed', async () => {
      it('does NOT allow fractional trades', async () => {
        await service.setPartialTransfers(token.address, false);
        assertResult(await service.check.call(token.address, spender, owner, account, roundAmount), true, ENONE);
        assertResult(await service.check.call(token.address, spender, owner, account, partialAmount), false, EDIVIS);
      });
    });
  });

  describe('transferAdmin()', () => {
    describe('when the new admin is valid', () => {
      beforeEach(async () => {
        assert.equal(await service.admin(), owner);
      });

      it('sets the new admin', async () => {
        await service.transferAdmin(admin);
        assert.equal(await service.admin(), admin);
      });

      it('logs an event', async () => {
        const { logs } = await service.transferAdmin(admin);

        const event = await inLogs(logs, 'LogTransferAdmin');
        event.args.oldAdmin.should.eq(owner);
        event.args.newAdmin.should.eq(admin);
      });
    });

    describe('when the new admin is NOT valid', () => {
      it('throws', async () => {
        await expectThrow(service.transferAdmin(ZERO_ADDRESS));
        assert.equal(await service.admin(), owner);
      });
    });
  });

  describe('transfer permissions', () => {
    beforeEach(async () => {
      await service.setLocked(token.address, false);
    });

    it('logs an event', async () => {
      const tx = await service.setPermission(token.address, account, PERM_SEND);
      const event = await inLogs(tx.logs, 'LogPermissionSet');
      event.args.token.should.eq(token.address);
      event.args.participant.should.eq(account);
      event.args.permission.toNumber().should.eq(PERM_SEND);
    });

    describe('when granular permissions are used', () => {
      it('requires a sender to have send permissions', async () => {
        await service.setPermission(token.address, owner, PERM_SEND);
        await service.setPermission(token.address, account, PERM_RECEIVE);

        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), true, ENONE);

        await service.setPermission(token.address, owner, PERM_RECEIVE);
        await service.setPermission(token.address, account, PERM_RECEIVE);

        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), false, ESEND);
      });

      it('requires a receiver to have receive permissions', async () => {
        await service.setPermission(token.address, owner, PERM_SEND);
        await service.setPermission(token.address, account, PERM_RECEIVE);

        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), true, ENONE);

        await service.setPermission(token.address, owner, PERM_TRANSFER);
        await service.setPermission(token.address, account, PERM_SEND);

        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), false, ERECV);
      });
    });

    describe('when a participant does not exist', () => {
      beforeEach(async () => {
        await service.setPermission(token.address, owner, PERM_TRANSFER);
        await service.setPermission(token.address, account, PERM_TRANSFER);
        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), true, ENONE);
      });

      it('denies trades', async () => {
        assertResult(await service.check.call(token.address, spender, owner, ZERO_ADDRESS, transferValue), false, ERECV);
        assertResult(await service.check.call(token.address, spender, ZERO_ADDRESS, owner, transferValue), false, ESEND);
      });
    });

    describe('when both participants are eligible', () => {
      beforeEach(async () => {
        await service.setPermission(token.address, owner, PERM_NONE);
        await service.setPermission(token.address, account, PERM_NONE);
        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), false, ESEND);
      });

      it('allows trades', async () => {
        await service.setPermission(token.address, owner, PERM_TRANSFER);
        await service.setPermission(token.address, account, PERM_TRANSFER);
        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), true, ENONE);
      });
    });

    describe('when one participant is ineligible', () => {
      beforeEach(async () => {
        await service.setPermission(token.address, owner, PERM_TRANSFER);
        await service.setPermission(token.address, account, PERM_TRANSFER);
        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), true, ENONE);
      });

      it('prevents trades', async () => {
        await service.setPermission(token.address, owner, PERM_TRANSFER);
        await service.setPermission(token.address, account, PERM_NONE);

        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), false, ERECV);

        await service.setPermission(token.address, owner, PERM_NONE);
        await service.setPermission(token.address, account, PERM_TRANSFER);

        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), false, ESEND);
      });
    });

    describe('when no participants are eligible', () => {
      beforeEach(async () => {
        await service.setPermission(token.address, owner, PERM_TRANSFER);
        await service.setPermission(token.address, account, PERM_TRANSFER);
        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), true, ENONE);
      });

      it('prevents trades', async () => {
        await service.setPermission(token.address, owner, PERM_NONE);
        await service.setPermission(token.address, account, PERM_NONE);
        assertResult(await service.check.call(token.address, spender, owner, account, transferValue), false, ESEND);
      });
    });
  });
});
