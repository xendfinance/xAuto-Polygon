const { BN, ether, balance } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

const APRWithPoolOracle = artifacts.require('APRWithPoolOracle')
const EarnAPRWithPool = artifacts.require('EarnAPRWithPool')
const XUSDC = artifacts.require('XUSDC')
const ForceSend = artifacts.require('ForceSend');
const usdcABI = require('./abi/usdc');

const usdcAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
const usdcContract = new web3.eth.Contract(usdcABI, usdcAddress);
const usdcOwner = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

contract('test withdraw xtoken', async([alice, bob, admin, dev, minter]) => {

    before(async () => {

        this.xUsdcContract = await XUSDC.new({
            from: alice
        });

        this.aprWithPoolOracle = await APRWithPoolOracle.new({
            from: alice
        });
        this.earnAPRWithPool = await EarnAPRWithPool.new({
            from: alice
        });

        const forceSend = await ForceSend.new();
        await forceSend.go(usdcOwner, { value: ether('1') });
        
        await usdcContract.methods.transfer(alice, '10000000000').send({ from: usdcOwner});
        await usdcContract.methods.transfer(admin, '10000000000').send({ from: usdcOwner});
        await usdcContract.methods.transfer(bob, '10000000000').send({ from: usdcOwner});
        await usdcContract.methods.transfer(minter, '10000000000').send({ from: usdcOwner});
        await usdcContract.methods.transfer(dev, '10000000000').send({ from: usdcOwner});
        
        let xusdc = this.xUsdcContract

        // let statbleTokenAddress = await this.xUsdcContract.token();
        await this.earnAPRWithPool.set_new_APR(this.aprWithPoolOracle.address)
        await this.xUsdcContract.set_new_APR(this.earnAPRWithPool.address)
        // await this.earnAPRWithPool.addXToken(statbleTokenAddress, this.xUsdcContract.address);

        // await usdcContract.methods.approve(xusdc.address, 10000000000).send({
        //     from: admin
        // });

        // await xusdc.deposit(10000000000, {from: admin});

        

        // await usdcContract.methods.approve(xusdc.address, 10000000000).send({
        //     from: admin
        // });

        await usdcContract.methods.transfer(xusdc.address, 10000).send({
            from: admin
        });

    });

    it('test withdraw', async() => {
        // let xusdc = await XUSDC.deployed();
        let xusdc = this.xUsdcContract;     
        await usdcContract.methods.approve(xusdc.address, 100000).send({
            from: admin
        }); 
        await usdcContract.methods.approve(xusdc.address, 10000000).send({
            from: alice
        });

        await usdcContract.methods.approve(xusdc.address, 48457).send({
            from: dev
        }); 
        await usdcContract.methods.approve(xusdc.address, 1000).send({
            from: minter
        });

        await usdcContract.methods.approve(xusdc.address, 458937489).send({
            from: bob
        });

        await xusdc.deposit(100000, {from: admin});
        await xusdc.deposit(48457, {from: dev});
        await xusdc.deposit(1000, {from: minter});
        await xusdc.deposit(458937489, {from: bob});
        await xusdc.deposit(10000000, {from: alice});


        fee_address = '0x67926b0C4753c42b31289C035F8A656D800cD9e7'
        xusdc.set_new_fee_address(fee_address);
        console.log('before_xusdc_balance',await xusdc.balance());
        console.log('before_alice_balance',await usdcContract.methods.balanceOf(alice).call());
        // await xusdc.supplyUsdc(1000);
        // let usdc_balance = await xusdc.balanceUsdc();
        // console.log('before_usdc_balance', usdc_balance.toString());
        // console.log('xusdc_balance',await xusdc.balance());
        let tokenAmount = await xusdc.balanceOf(alice);
        console.log('------------', tokenAmount.toString());
        await xusdc.rebalance();
        let provider = await xusdc.provider();
        console.log('provider',provider.toString());
        await xusdc.withdraw(tokenAmount.toString());
        console.log('after_xusdc_balance',await xusdc.balance());
        console.log('after_alice_balance',await usdcContract.methods.balanceOf(alice).call());
        console.log('fee_address_balance', await usdcContract.methods.balanceOf(fee_address).call());
    })
})