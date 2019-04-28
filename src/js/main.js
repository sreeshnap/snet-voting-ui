import Vue from 'vue';
import Ethereum from './ethereum';

const candidates = require('../api.json');

const BASE_API_URI = `https://a173jkxkw5.execute-api.eu-west-1.amazonaws.com/production`;

function onAddCandidate(candidate) {

  if (this.voteComplete === true) {
    notification(this, "error", "Info: Limit reached");
    return;
  }

  const found = Object.values(this.votes).find(value => value === candidate.fullName)

  if (found) {
    notification(this, "error", "Invalid: Double Entry");
    return;
  }

  this.votes.push(candidate.fullName);
  this.tier = this.tier + 1;

  if (this.tier > 2) {
    this.voteComplete = true;
  }

}

function voteForCandidate(votes) {
  const msg = votes.toString();
  const msgHash = toHex(msg);
  const from = window.web3.eth.accounts[0]
  if (!from)
    return notification(this, "error", "Connect or Unlock Metamask and try again")

  this.from = from;

  window.ethjs.personal_sign(msgHash, from)
    .then((signed) => {
      this.signed = signed;

      return {
        message: msg,
        signature: signed
      };
    })
    .then(body => {
      return fetch(BASE_API_URI + `/upload`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body)
      });
    })
    .then(response => response.json())
    .then(() => notification(this, 'success', 'Signed! ' + this.signed))
    .catch(error => notification(this, 'error', error))
}

function mounted() {
  const eth = new Ethereum()
  eth.initialize().catch(err => {
    console.error(err);
  })
}

function toHex(str) {
  var result = '';
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
}

function notification(ctx, type, message) {
  setTimeout(function () { ctx.error = null }, 1000)
  ctx.message = message;
  ctx.messageType = type;
}

new Vue({
  el: '#app',
  data: {
    candidates,
    tier: 0,
    voteComplete: false,
    votes: [],
    from: undefined,
    signed: undefined,
    message: null,
    messageType: undefined
  },
  methods: { onAddCandidate, voteForCandidate },
  mounted
}).$mount('#app')