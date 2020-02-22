import React, { Component } from 'react';
import { Card, CardHeader, CardText } from 'reactstrap';

const Web3 = require('web3');
// connect to Infura node
const web3 = new Web3(
    new Web3.providers.HttpProvider(
        'https://mainnet.infura.io/v3/786ade30f36244469480aa5c2bf0743b'
    )
);

const currencyToAddress = {
    idai: '0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01',
    iusdc: '0xd6aD7a6750A7593E092a9B218d66C0A814a3436e',
    iusdt: '0x83f798e925BcD4017Eb265844FDDAbb448f1707D',
    itusd: '0x73a052500105205d34Daf004eAb301916DA8190f',
};

class Stats extends Component {
    constructor(props) {
        super(props);

        this.state = {
            depositedUsd: 0,
            withdrawnUsd: 0,
            availableUsd: 0,
            opacity: 0,
            calculated: false,
        };
    }

    async componentDidMount() {
        await this.connecting();
        for (const currencyName of Object.keys(currencyToAddress)) {
            const yToUsd = await this.getConverter(currencyName);
            const usdDeposited = yToUsd(
                await this.getDeposits(currencyToAddress[currencyName])
            );
            const usdWithdrawn = yToUsd(
                await this.getWithdrawals(currencyToAddress[currencyName])
            );

            const withdrawableUsd = yToUsd(
                await this.yWithdrawable(currencyName)
            );

            this.setState({
                depositedUsd: this.state.depositedUsd + usdDeposited,
                withdrawnUsd: this.state.withdrawnUsd + usdWithdrawn,
                availableUsd: this.state.availableUsd + withdrawableUsd,
            });
        }
        this.setState({
            calculated: true,
        });
    }

    async getDeposits(address) {
        const logs = await web3.eth.getPastLogs({
            fromBlock: 9476468,
            toBlock: 'latest',
            address,
            topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x000000000000000000000000' +
                    window.ethereum.selectedAddress.substr(2),
                '0x00000000000000000000000045f783cce6b7ff23b2ab2d70e416cdb7d6055f51',
            ],
        });
        return logs.reduce(
            (acc, val) => web3.utils.toBN(val.data).add(acc),
            web3.utils.toBN('0')
        );
    }

    async connecting() {
        let up = true;
        const opacityIterator = setInterval(() => {
            if (this.state.calculated) {
                clearInterval(opacityIterator);
            }

            let opacity = this.state.opacity;

            if (up) {
                opacity += 0.01;
            } else {
                opacity -= 0.01;
            }

            if (opacity >= 1) {
                up = false;
            }

            if (opacity <= 0) {
                up = true;
            }

            this.setState({
                opacity,
            });
        }, 9);

        if (window.ethereum) {
            await window.ethereum.enable();
        }
    }

    async getWithdrawals(address) {
        const logs = await web3.eth.getPastLogs({
            fromBlock: 9476468,
            toBlock: 'latest',
            address,
            topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x00000000000000000000000045f783cce6b7ff23b2ab2d70e416cdb7d6055f51',
                '0x000000000000000000000000' +
                    window.ethereum.selectedAddress.substr(2),
            ],
        });
        return logs.reduce(
            (acc, val) => web3.utils.toBN(val.data).add(acc),
            web3.utils.toBN('0')
        );
    }

    fromNative(curr, value) {
        const decimals = ['iusdc', 'iusdt'].includes(curr) ? 6 : 18;
        if (decimals === 18) {
            return Number(web3.utils.fromWei(value));
        }
        return value.toNumber() / 10 ** decimals;
    }

    async yWithdrawable(curr) {
        const tokenAddress = currencyToAddress[curr];
        const balanceOfCurveContract = await web3.eth.call({
            to: tokenAddress,
            data:
                '0x70a0823100000000000000000000000045f783cce6b7ff23b2ab2d70e416cdb7d6055f51',
        });
        const poolTokensBalance = await web3.eth.call({
            to: '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8',
            data:
                '0x70a08231000000000000000000000000' +
                window.ethereum.selectedAddress.substr(2),
        });
        const poolTokensSupply = await web3.eth.call({
            to: '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8',
            data: '0x18160ddd',
        });
        return web3.utils
            .toBN(balanceOfCurveContract)
            .mul(web3.utils.toBN(poolTokensBalance))
            .div(web3.utils.toBN(poolTokensSupply));
    }

    async getConverter(curr) {
        const usdPool = await web3.eth.call({
            to: currencyToAddress[curr],
            data: '0x7137ef99',
        });
        const tokensSupply = await web3.eth.call({
            to: currencyToAddress[curr],
            data: '0x18160ddd',
        });
        return value => {
            return this.fromNative(
                curr,
                web3.utils
                    .toBN(usdPool)
                    .mul(value)
                    .div(web3.utils.toBN(tokensSupply))
            );
        };
    }

    render() {
        const title = (
            <h3>
                <a
                    href="https://y.curve.fi"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    yСurve
                </a>{' '}
                vs yTokens holding
            </h3>
        );
        const show = val =>
            `${
                typeof val === 'string'
                    ? this.state[val].toFixed(2)
                    : val.toFixed(2)
            } USD`;

        if (!window.ethereum) {
            return (
                <div>
                    {title}
                    <br />
                    <br />
                    <a
                        style={{ opacity: this.state.opacity }}
                        href="https://metamask.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        MetaMask needed
                    </a>
                </div>
            );
        }
        if (!window.ethereum.selectedAddress)
            return (
                <div>
                    {title}
                    <br />
                    <br />
                    <p style={{ opacity: this.state.opacity }}>
                        Connecting to the wallet...
                    </p>
                </div>
            );
        if (!this.state.calculated)
            return (
                <div>
                    {title}
                    <br />
                    <br />
                    <p style={{ opacity: this.state.opacity }}>
                        Computation...
                    </p>
                </div>
            );
        return (
            <div>
                {title}
                <br />
                <br />

                <Card
                    body
                    inverse
                    style={{ backgroundColor: '#333', borderColor: '#333' }}
                >
                    <CardHeader>Deposits</CardHeader>
                    <CardText>{show('depositedUsd')}</CardText>
                </Card>
                <Card
                    body
                    inverse
                    style={{ backgroundColor: '#333', borderColor: '#333' }}
                >
                    <CardHeader>Withdrawals</CardHeader>
                    <CardText>{show('withdrawnUsd')}</CardText>
                </Card>
                <Card
                    body
                    inverse
                    style={{ backgroundColor: '#333', borderColor: '#333' }}
                >
                    <CardHeader>Available</CardHeader>
                    <CardText>{show('availableUsd')}</CardText>
                </Card>
                <Card
                    body
                    inverse
                    style={{ backgroundColor: '#333', borderColor: '#333' }}
                >
                    <CardHeader>Profit</CardHeader>
                    <CardText>
                        {show(
                            this.state.availableUsd +
                                this.state.withdrawnUsd -
                                this.state.depositedUsd
                        )}
                    </CardText>
                </Card>
            </div>
        );
    }
}

export default Stats;
