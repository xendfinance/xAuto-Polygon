const { BN, ether, balance } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const APRWithPoolOracle = artifacts.require('APRWithPoolOracle')
const EarnAPRWithPool = artifacts.require('EarnAPRWithPool')
const XWBTC = artifacts.require('XWBTC')
const ForceSend = artifacts.require('ForceSend');
const wbtcABI = require('./abi/wbtc');

const wbtcAddress = '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6';
const wbtcContract = new web3.eth.Contract(wbtcABI, wbtcAddress);
const wbtcOwner = '0xdC9232E2Df177d7a12FdFf6EcBAb114E2231198D';

contract('test withdraw xtoken', async([alice, bob, admin, dev, minter]) => {

    before(async () => {

        this.xwbtcContract = await XWBTC.new({
            from: alice
        });

        this.aprWithPoolOracle = await APRWithPoolOracle.new({
            from: alice
        });
        this.earnAPRWithPool = await EarnAPRWithPool.new({
            from: alice
        });

        const forceSend = await ForceSend.new();
        await forceSend.go(wbtcOwner, { value: ether('1') });
        
        await wbtcContract.methods.transfer(alice, '1000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(admin, '1000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(bob, '1000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(minter, '1000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(dev, '1000000000').send({ from: wbtcOwner});
        
        let xwbtc = this.xwbtcContract

        await this.aprWithPoolOracle.initialize();

        // let statbleTokenAddress = await this.xwbtcContract.token();
        await this.earnAPRWithPool.initialize(this.aprWithPoolOracle.address)
        await this.xwbtcContract.initialize(this.earnAPRWithPool.address)
        // await this.earnAPRWithPool.addXToken(statbleTokenAddress, this.xwbtcContract.address);

        // await wbtcContract.methods.approve(xwbtc.address, 10000000000).send({
        //     from: admin
        // });

        // await xwbtc.deposit(10000000000, {from: admin});

        

        // await wbtcContract.methods.approve(xwbtc.address, 10000000000).send({
        //     from: admin
        // });



    });

    it('test withdraw', async() => {
        // let xwbtc = await XWBTC.deployed();
        let xwbtc = this.xwbtcContract;   
        fee_address = await xwbtc.feeAddress();
        await xwbtc.set_new_feeAmount(10);        
        await wbtcContract.methods.approve(xwbtc.address, '1000000000').send({
            from: admin
        }); 
        await wbtcContract.methods.approve(xwbtc.address, '1000000000').send({
            from: alice
        });

        await wbtcContract.methods.approve(xwbtc.address, '1000000000').send({
            from: dev
        }); 
        await wbtcContract.methods.approve(xwbtc.address, '1000000000').send({
            from: minter
        });

        await wbtcContract.methods.approve(xwbtc.address, '1000000000').send({
            from: bob
        });

        console.log('before_xwbtc_balance',await wbtcContract.methods.balanceOf(xwbtc.address).call());
        console.log('before_alice_balance',await wbtcContract.methods.balanceOf(alice).call());
        console.log('before_admin_balance',await wbtcContract.methods.balanceOf(admin).call());
        console.log('before_dev_balance',await wbtcContract.methods.balanceOf(dev).call());
        console.log('before_minter_balance',await wbtcContract.methods.balanceOf(minter).call());
        console.log('before_bob_balance',await wbtcContract.methods.balanceOf(bob).call());

        await xwbtc.deposit('200000000', {from: admin});
        await xwbtc.deposit('200000000', {from: dev});
        await xwbtc.deposit('200000000', {from: minter});
        await wbtcContract.methods.transfer(xwbtc.address, '100000000').send({
            from: admin
        });

        console.log('fee_address_balance', await wbtcContract.methods.balanceOf(fee_address).call());

        await xwbtc.deposit('200000000', {from: bob});
        await xwbtc.deposit('200000000', {from: alice});


        // await xwbtc.supplyUsdc(1000);
        // let usdc_balance = await xwbtc.balanceUsdc();
        // console.log('before_usdc_balance', usdc_balance.toString());
        // console.log('xwbtc_balance',await xwbtc.balance());
        let tokenAmount = await xwbtc.balanceOf(alice);
        console.log('------------', tokenAmount.toString());
        await xwbtc.rebalance();
        let provider = await xwbtc.provider();
        console.log('provider',provider.toString());

        tokenAmount = await xwbtc.balanceOf(alice);
        console.log('alice------------', tokenAmount.toString());
        await xwbtc.withdraw(tokenAmount.toString(), {from: alice});
        
        tokenAmount = await xwbtc.balanceOf(admin);
        console.log('admin------------', tokenAmount.toString());
        await xwbtc.withdraw(tokenAmount.toString(), {from: admin});
        
        tokenAmount = await xwbtc.balanceOf(dev);
        console.log('dev------------', tokenAmount.toString());
        await xwbtc.withdraw(tokenAmount.toString(), {from: dev});
        
        tokenAmount = await xwbtc.balanceOf(minter);
        console.log('minter------------', tokenAmount.toString());
        await xwbtc.withdraw(tokenAmount.toString(), {from: minter});

        console.log('fee_address_balance', await wbtcContract.methods.balanceOf(fee_address).call());
        
        tokenAmount = await xwbtc.balanceOf(bob);
        console.log('bob------------', tokenAmount.toString());
        await xwbtc.withdraw((tokenAmount-1).toString(), {from: bob});

        console.log('after_xwbtc_balance',await wbtcContract.methods.balanceOf(xwbtc.address).call());
        console.log('after_alice_balance',await wbtcContract.methods.balanceOf(alice).call());
        console.log('after_admin_balance',await wbtcContract.methods.balanceOf(admin).call());
        console.log('after_dev_balance',await wbtcContract.methods.balanceOf(dev).call());
        console.log('after_minter_balance',await wbtcContract.methods.balanceOf(minter).call());
        console.log('after_bob_balance',await wbtcContract.methods.balanceOf(bob).call());

        console.log('fee_address_balance', await wbtcContract.methods.balanceOf(fee_address).call());
    })
})