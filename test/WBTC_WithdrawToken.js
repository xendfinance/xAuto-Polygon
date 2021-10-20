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
        
        await wbtcContract.methods.transfer(alice, '10000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(admin, '10000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(bob, '10000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(minter, '10000000000').send({ from: wbtcOwner});
        await wbtcContract.methods.transfer(dev, '10000000000').send({ from: wbtcOwner});
        
        let xwbtc = this.xwbtcContract

        // let statbleTokenAddress = await this.xwbtcContract.token();
        await this.earnAPRWithPool.set_new_APR(this.aprWithPoolOracle.address)
        await this.xwbtcContract.set_new_APR(this.earnAPRWithPool.address)
        // await this.earnAPRWithPool.addXToken(statbleTokenAddress, this.xwbtcContract.address);

        // await wbtcContract.methods.approve(xwbtc.address, 10000000000).send({
        //     from: admin
        // });

        // await xwbtc.deposit(10000000000, {from: admin});

        

        // await wbtcContract.methods.approve(xwbtc.address, 10000000000).send({
        //     from: admin
        // });

        await wbtcContract.methods.transfer(xwbtc.address, 10000).send({
            from: admin
        });

    });

    it('test withdraw', async() => {
        // let xwbtc = await XWBTC.deployed();
        let xwbtc = this.xwbtcContract;     
        await wbtcContract.methods.approve(xwbtc.address, 100000).send({
            from: admin
        }); 
        await wbtcContract.methods.approve(xwbtc.address, 10000000).send({
            from: alice
        });

        await wbtcContract.methods.approve(xwbtc.address, 48457).send({
            from: dev
        }); 
        await wbtcContract.methods.approve(xwbtc.address, 1000).send({
            from: minter
        });

        await wbtcContract.methods.approve(xwbtc.address, 458937489).send({
            from: bob
        });

        await xwbtc.deposit(100000, {from: admin});
        await xwbtc.deposit(48457, {from: dev});
        await xwbtc.deposit(1000, {from: minter});
        await xwbtc.deposit(458937489, {from: bob});
        await xwbtc.deposit(10000000, {from: alice});


        fee_address = '0x67926b0C4753c42b31289C035F8A656D800cD9e7'
        xwbtc.set_new_fee_address(fee_address);
        console.log('before_xwbtc_balance',await xwbtc.balance());
        console.log('before_alice_balance',await wbtcContract.methods.balanceOf(alice).call());
        let tokenAmount = await xwbtc.balanceOf(alice);
        console.log('------------', tokenAmount.toString());
        await xwbtc.rebalance();
        let provider = await xwbtc.provider();
        console.log('provider',provider.toString());
        await xwbtc.withdraw(tokenAmount.toString());
        console.log('after_xwbtc_balance',await xwbtc.balance());
        console.log('after_alice_balance',await wbtcContract.methods.balanceOf(alice).call());
        console.log('fee_address_balance', await wbtcContract.methods.balanceOf(fee_address).call());
    })
})