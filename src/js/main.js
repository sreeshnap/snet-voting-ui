import Vue from 'vue';
import VueResource from 'vue-resource';
import Web3 from "web3"

import Eth from 'ethjs';

const networks  = {
  1 : "Mainnet",
  3 : "Ropsten"
}

const candidates = require('../api.json');

const BASE_API_URI = process.env.BASE_API_URI
const BASE_HEADERS = { "Content-Type": "application/json" }
const START_TIME   = process.env.START_TIME
const END_TIME     = process.env.END_TIME




function onAddCandidate(candidate) {

    const vindex = this.votes.findIndex(c => c === candidate.fullName);
    const cindex = this.candidates.findIndex(c => c.fullName === candidate.fullName);

      this.candidates.forEach((_, cindex) => {
        this.candidates[cindex].hasVote = false
        this.tier = 0;
        this.votes = [];
      });

      this.votes = [candidate.fullName];
      this.candidates[cindex].hasVote = true;
}

function getChainId() {
  let chainIdHex = window.ethereum.chainId
  let chainId = parseInt(chainIdHex, 16)
  return chainId
}

function voteForCandidate(votes) {
  let chainId = getChainId()
  if (chainId !== process.env.CHAIN_ID) {
    let allowedNetwork = networks[process.env.CHAIN_ID]
    return notification(this, "error", `Please switch to ${allowedNetwork} network.`)
  }
  console.log("process.network.", process.env.CHAIN_ID)
  const msg = votes.toString()
  // const msgHex = `0x${toPaddedHex(msg)}`;
  
  const from = window.ethereum.selectedAddress
  if (!from)
    return notification(this, "error", "Connect or Unlock Metamask and reload the page")

  this.from = from;

  window.web3.eth.personal.sign(msg, from)
    .then((signed) => {
      this.signed = signed;
      console.log("signature",signed)
      return {
        message: msg,
        signature: signed
      };
    })
    .then(body => this.$http.post(BASE_API_URI + `/upload`, body, BASE_HEADERS))
    .then(response => response.json())
    .then(() => notification(this, 'success', 'Signed! ' + this.signed))
    .catch(error => notification(this, 'error', error))
}


function toHex(str) {
  var result = '';
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
}

function toPaddedHex(string, bit = 32) {
  const hex = toHex(string);
  const hexLength = hex.length;
  console.log("hexlenght", hexLength)
  const paddedHex = window.web3.utils.padRight(hex, bit * (Math.floor(hexLength / bit) + 1));
  console.log("padded hex", paddedHex)
  return paddedHex;
}

function notification(ctx, type, message) {
  setTimeout(function () { ctx.error = null }, 1000)
  ctx.message = message;
  ctx.messageType = type;
}



async function beforeMount() {
  if (window.ethereum) {
    console.log('Modern dapp browsers...')
    try {
      // Request account access if needed
      await window.ethereum.enable();
      // Acccounts now exposed
      window.ethjs = new Eth(window.web3.currentProvider);
      window.web3 = new Web3(window.web3.currentProvider);
    } catch (error) {
      // User denied account access...
      console.log('User denied account access...!');
    }
  } else if (window.web3) {
    console.log('Legacy dapp browsers...')
    window.web3 = new Web3(window.web3.currentProvider);
    // Acccounts always exposed
    provider = window.web3.currentProvider
    window.ethjs = new Eth(window.web3.currentProvider);
  } else {
    // Non-dapp browsers...
    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }

}

function handleAccountsChanged() {
  window.ethereum.on('accountsChanged', (_accounts) => window.location.reload());
}

function handleNetworkChanged() {
  window.ethereum.on('chainChanged', (_chainId) => window.location.reload());
}

function mounted() {
  if (!window.ethereum) {
    return notification(this, "error", "Connect or Unlock Metamask and reload the page");
  }
  const from = window.ethereum.selectedAddress;
  if (!from)
    return notification(this, "error", "Connect or Unlock Metamask and reload the page");
  handleAccountsChanged()
  handleNetworkChanged()
  this.from = from;
  this.$http.get(BASE_API_URI + `/vote/` + from)
    .then(response => response.json())
    .then(receipt => {
      if (receipt.hasOwnProperty('error'))
        throw receipt.error;

      this.alreadyVoted = true;
      this.receipt = receipt;
    })
    .catch(console.log);

}


function isVotingTime() {
  const now = parseInt(new Date().getTime()/1000);
  const ret = now > START_TIME && now < END_TIME; 
  return ret;
}

Vue.use(VueResource);

new Vue({
  el: '#app',
  data: {
    alreadyVoted: false,
    receipt: undefined,
    candidates,
    tier: 0,
    votes: [],
    from: undefined,
    signed: undefined,
    message: null,
    messageType: undefined,
    isShowModal: false
  },
  methods: { onAddCandidate, voteForCandidate },
  computed: { isVotingTime },
  beforeMount: beforeMount,
  mounted: mounted,
}).$mount('#app')