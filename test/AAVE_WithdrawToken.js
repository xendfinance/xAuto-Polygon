const { BN, ether, balance } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const APRWithPoolOracle = artifacts.require('APRWithPoolOracle')
const EarnAPRWithPool = artifacts.require('EarnAPRWithPool')
const XAAVE = artifacts.require('XAAVE')
const ForceSend = artifacts.require('ForceSend');
const aaveABI = require('./abi/aave');

const aaveAddress = '0xD6DF932A45C0f255f85145f286eA0b292B21C90B';
const aaveContract = new web3.eth.Contract(aaveABI, aaveAddress);
const aaveOwner = '0xEc0EFFAb58756E8836896220ca73776b9Dc52251';

contract('test withdraw xtoken', async([alice, bob, admin, dev, minter]) => {

    before(async () => {

        this.xaaveContract = await XAAVE.new({
            from: alice
        });

        this.aprWithPoolOracle = await APRWithPoolOracle.new({
            from: alice
        });
        this.earnAPRWithPool = await EarnAPRWithPool.new({
            from: alice
        });

        const forceSend = await ForceSend.new();
        await forceSend.go(aaveOwner, { value: ether('1') });
        
        await aaveContract.methods.transfer(alice, '10000000000000000000').send({ from: aaveOwner});
        await aaveContract.methods.transfer(admin, '10000000000000000000').send({ from: aaveOwner});
        await aaveContract.methods.transfer(bob, '10000000000000000000').send({ from: aaveOwner});
        await aaveContract.methods.transfer(minter, '10000000000000000000').send({ from: aaveOwner});
        await aaveContract.methods.transfer(dev, '10000000000000000000').send({ from: aaveOwner});
        
        let xaave = this.xaaveContract

        await this.aprWithPoolOracle.initialize();

        // let statbleTokenAddress = await this.xaaveContract.token();
        await this.earnAPRWithPool.initialize(this.aprWithPoolOracle.address)
        await this.xaaveContract.initialize(this.earnAPRWithPool.address)
        // await this.earnAPRWithPool.addXToken(statbleTokenAddress, this.xaaveContract.address);

        // await aaveContract.methods.approve(xaave.address, 10000000000).send({
        //     from: admin
        // });

        // await xaave.deposit(10000000000, {from: admin});

        

        // await aaveContract.methods.approve(xaave.address, 10000000000).send({
        //     from: admin
        // });

       

    });

    it('test withdraw', async() => {
        // let xaave = await XAAVE.deployed();
        await this.xaaveContract.activateLender(1);
        let xaave = this.xaaveContract;
        fee_address = await xaave.feeAddress();
        await xaave.set_new_feeAmount(10);

        await aaveContract.methods.approve(xaave.address, '10000000000000000000').send({
            from: admin
        }); 
        await aaveContract.methods.approve(xaave.address, '10000000000000000000').send({
            from: alice
        });

        await aaveContract.methods.approve(xaave.address, '10000000000000000000').send({
            from: dev
        }); 
        await aaveContract.methods.approve(xaave.address, '10000000000000000000').send({
            from: minter
        });

        await aaveContract.methods.approve(xaave.address, '10000000000000000000').send({
            from: bob
        });

        // console.log('before_xaave_balance',await xaave.balance());
        console.log('before_xaave_balance',await aaveContract.methods.balanceOf(xaave.address).call());
        console.log('before_alice_balance',await aaveContract.methods.balanceOf(alice).call());
        console.log('before_admin_balance',await aaveContract.methods.balanceOf(admin).call());
        console.log('before_dev_balance',await aaveContract.methods.balanceOf(dev).call());
        console.log('before_minter_balance',await aaveContract.methods.balanceOf(minter).call());
        console.log('before_bob_balance',await aaveContract.methods.balanceOf(bob).call());

        await xaave.deposit('2000000000000000000', {from: admin});
        await xaave.deposit('2000000000000000000', {from: dev});
        await xaave.deposit('2000000000000000000', {from: alice});
        await aaveContract.methods.transfer(xaave.address, '1000000000000000000').send({
            from: admin
        });

        console.log('fee_address_balance', await aaveContract.methods.balanceOf(fee_address).call());

        await xaave.deposit('2000000000000000000', {from: minter});
        await xaave.deposit('2000000000000000000', {from: bob});

        
        // await xaave.supplyAave(1000);
        // let aave_balance = await xaave.balanceAave();
        // console.log('before_aave_balance', aave_balance.toString());
        // console.log('xaave_balance',await xaave.balance());
        let tokenAmount = await xaave.balanceOf(alice);
        // console.log('alice------------', tokenAmount.toString());
        await xaave.rebalance();
        let provider = await xaave.provider();
        console.log('provider',provider.toString());
        // await xaave.withdraw(1000000);
        tokenAmount = await xaave.balanceOf(alice);
        console.log('alice------------', tokenAmount.toString());
        await xaave.withdraw(tokenAmount.toString(), {from: alice});
        
        tokenAmount = await xaave.balanceOf(admin);
        console.log('admin------------', tokenAmount.toString());
        await xaave.withdraw(tokenAmount.toString(), {from: admin});
        
        tokenAmount = await xaave.balanceOf(dev);
        console.log('dev------------', tokenAmount.toString());
        await xaave.withdraw(tokenAmount.toString(), {from: dev});
        
        tokenAmount = await xaave.balanceOf(minter);
        console.log('minter------------', tokenAmount.toString());
        await xaave.withdraw(tokenAmount.toString(), {from: minter});

        console.log('fee_address_balance', await aaveContract.methods.balanceOf(fee_address).call());
        
        tokenAmount = await xaave.balanceOf(bob);
        console.log('bob------------', tokenAmount.toString());
        await xaave.withdraw((tokenAmount).toString(), {from: bob});
        
        console.log('after_xaave_balance',await aaveContract.methods.balanceOf(xaave.address).call());
        console.log('after_alice_balance',await aaveContract.methods.balanceOf(alice).call());
        console.log('after_admin_balance',await aaveContract.methods.balanceOf(admin).call());
        console.log('after_dev_balance',await aaveContract.methods.balanceOf(dev).call());
        console.log('after_minter_balance',await aaveContract.methods.balanceOf(minter).call());
        console.log('after_bob_balance',await aaveContract.methods.balanceOf(bob).call());

        console.log('fee_address_balance', await aaveContract.methods.balanceOf(fee_address).call());
    })

    // function timeout(ms) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }
})