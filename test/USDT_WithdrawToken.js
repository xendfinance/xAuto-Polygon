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
        
        await usdtContract.methods.transfer(alice, '10000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(admin, '10000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(bob, '10000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(minter, '10000000').send({ from: usdtOwner});
        await usdtContract.methods.transfer(dev, '10000000').send({ from: usdtOwner});
        
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



    });

    it('test withdraw', async() => {
        // let xusdt = await XUSDT.deployed();
        let xusdt = this.xusdtContract;
        fee_address = await xusdt.feeAddress();
        await xusdt.set_new_feeAmount(10);         
        await usdtContract.methods.approve(xusdt.address, '8000000').send({
            from: admin
        }); 
        await usdtContract.methods.approve(xusdt.address, '5000000').send({
            from: alice
        });

        await usdtContract.methods.approve(xusdt.address, '10000000').send({
            from: dev
        }); 
        await usdtContract.methods.approve(xusdt.address, '10000000').send({
            from: minter
        });

        await usdtContract.methods.approve(xusdt.address, '10000000').send({
            from: bob
        });

        console.log('before_xusdt_balance',await usdtContract.methods.balanceOf(xusdt.address).call());
        console.log('before_alice_balance',await usdtContract.methods.balanceOf(alice).call());
        console.log('before_admin_balance',await usdtContract.methods.balanceOf(admin).call());
        console.log('before_dev_balance',await usdtContract.methods.balanceOf(dev).call());
        console.log('before_minter_balance',await usdtContract.methods.balanceOf(minter).call());
        console.log('before_bob_balance',await usdtContract.methods.balanceOf(bob).call());

        await xusdt.deposit('8000000', {from: admin});
        await xusdt.deposit('10000000', {from: dev});
        await xusdt.deposit('10000000', {from: minter});
        await usdtContract.methods.transfer(xusdt.address, 500000).send({
            from: admin
        });

        console.log('fee_address_balance', await usdtContract.methods.balanceOf(fee_address).call());
        await xusdt.withdrawFee({from : alice});
        console.log('fee_address_balance', await usdtContract.methods.balanceOf(fee_address).call());

        await xusdt.deposit('2000000', {from: bob});
        await xusdt.deposit('5000000', {from: alice});


        // await xusdt.supplyUsdc(1000);
        // let usdc_balance = await xusdt.balanceUsdc();
        // console.log('before_usdc_balance', usdc_balance.toString());
        // console.log('xusdt_balance',await xusdt.balance());
        let tokenAmount = await xusdt.balanceOf(alice);
        console.log('------------', tokenAmount.toString());
        await xusdt.rebalance();
        let provider = await xusdt.provider();
        console.log('provider',provider.toString());

        tokenAmount = await xusdt.balanceOf(alice);
        console.log('alice------------', tokenAmount.toString());
        await xusdt.withdraw(tokenAmount.toString(), {from: alice});
        
        tokenAmount = await xusdt.balanceOf(admin);
        console.log('admin------------', tokenAmount.toString());
        await xusdt.withdraw(tokenAmount.toString(), {from: admin});
        
        tokenAmount = await xusdt.balanceOf(dev);
        console.log('dev------------', tokenAmount.toString());
        await xusdt.withdraw(tokenAmount.toString(), {from: dev});
        
        tokenAmount = await xusdt.balanceOf(minter);
        console.log('minter------------', tokenAmount.toString());
        await xusdt.withdraw(tokenAmount.toString(), {from: minter});

        console.log('fee_address_balance', await usdtContract.methods.balanceOf(fee_address).call());
        await xusdt.withdrawFee({from : alice});
        console.log('fee_address_balance', await usdtContract.methods.balanceOf(fee_address).call());
        
        tokenAmount = await xusdt.balanceOf(bob);
        console.log('bob------------', tokenAmount.toString());
        await xusdt.withdraw(tokenAmount.toString(), {from: bob});

        console.log('after_xusdt_balance',await usdtContract.methods.balanceOf(xusdt.address).call());
        console.log('after_alice_balance',await usdtContract.methods.balanceOf(alice).call());
        console.log('after_admin_balance',await usdtContract.methods.balanceOf(admin).call());
        console.log('after_dev_balance',await usdtContract.methods.balanceOf(dev).call());
        console.log('after_minter_balance',await usdtContract.methods.balanceOf(minter).call());
        console.log('after_bob_balance',await usdtContract.methods.balanceOf(bob).call());

        console.log('fee_address_balance', await usdtContract.methods.balanceOf(fee_address).call());
        await xusdt.withdrawFee({from : alice});
        console.log('fee_address_balance', await usdtContract.methods.balanceOf(fee_address).call());
    })
})