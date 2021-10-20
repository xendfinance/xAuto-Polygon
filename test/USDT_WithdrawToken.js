const { BN, ether, balance } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const APRWithPoolOracle = artifacts.require('APRWithPoolOracle')
const EarnAPRWithPool = artifacts.require('EarnAPRWithPool')
const XUSDT = artifacts.require('XUSDT')
const ForceSend = artifacts.require('ForceSend');
const usdtABI = require('./abi/usdt');

const usdtAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const usdtContract = new web3.eth.Contract(usdtABI, usdtAddress);
const usdtOwner = '0x2cf7252e74036d1da831d11089d326296e64a728';

contract('test withdraw xtoken', async([alice, bob, admin, dev, minter]) => {

    before(async () => {

        this.xusdtContract = await XUSDT.new({
            from: alice
        });

        this.aprWithPoolOracle = await APRWithPoolOracle.new({
            from: alice
        });
        this.earnAPRWithPool = await EarnAPRWithPool.new({
            from: alice
        });

        const forceSend = await ForceSend.new();
        await forceSend.go(usdtOwner, { value: ether('1') });
        
        await usdtContract.methods.transfer(alice, '10000000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(admin, '10000000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(bob, '10000000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(minter, '10000000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(dev, '10000000000').send({ from: usdtOwner});
        
        let xusdt = this.xusdtContract

        // let statbleTokenAddress = await this.xusdtContract.token();
        await this.earnAPRWithPool.set_new_APR(this.aprWithPoolOracle.address)
        await this.xusdtContract.set_new_APR(this.earnAPRWithPool.address)
        // await this.earnAPRWithPool.addXToken(statbleTokenAddress, this.xusdtContract.address);

        // await usdtContract.methods.approve(xusdt.address, 10000000000).send({
        //     from: admin
        // });

        // await xusdt.deposit(10000000000, {from: admin});

        

        // await usdtContract.methods.approve(xusdt.address, 10000000000).send({
        //     from: admin
        // });

        await usdtContract.methods.transfer(xusdt.address, 10000).send({
            from: admin
        });

    });

    it('test withdraw', async() => {
        // let xusdt = await XUSDT.deployed();
        let xusdt = this.xusdtContract;     
        await usdtContract.methods.approve(xusdt.address, 100000).send({
            from: admin
        }); 
        await usdtContract.methods.approve(xusdt.address, 10000000).send({
            from: alice
        });

        await usdtContract.methods.approve(xusdt.address, 48457).send({
            from: dev
        }); 
        await usdtContract.methods.approve(xusdt.address, 1000).send({
            from: minter
        });

        await usdtContract.methods.approve(xusdt.address, 458937489).send({
            from: bob
        });

        await xusdt.deposit(100000, {from: admin});
        await xusdt.deposit(48457, {from: dev});
        await xusdt.deposit(1000, {from: minter});
        await xusdt.deposit(458937489, {from: bob});
        await xusdt.deposit(10000000, {from: alice});


        fee_address = '0x67926b0C4753c42b31289C035F8A656D800cD9e7'
        xusdt.set_new_fee_address(fee_address);
        console.log('before_xusdt_balance',await xusdt.balance());
        console.log('before_alice_balance',await usdtContract.methods.balanceOf(alice).call());
        let tokenAmount = await xusdt.balanceOf(alice);
        console.log('------------', tokenAmount.toString());
        await xusdt.rebalance();
        let provider = await xusdt.provider();
        console.log('provider',provider.toString());
        await xusdt.withdraw(tokenAmount.toString());
        console.log('after_xusdt_balance',await xusdt.balance());
        console.log('after_alice_balance',await usdtContract.methods.balanceOf(alice).call());
        console.log('fee_address_balance', await usdtContract.methods.balanceOf(fee_address).call());
    })
})