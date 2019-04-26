import Eth from 'ethjs';
import Web3 from 'web3';

export default class Ethereum {

  constructor() {
    this.eth = undefined;
    this.web3 = undefined;
    this.chainId = undefined;
    this.defaultAccount = undefined;
  }

  async initialize() {
    window.ethjs = new Eth(window.web3.currentProvider);
  }



}