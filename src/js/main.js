import Vue from 'vue';
import VueResource from 'vue-resource';

import Eth from 'ethjs';

const candidates = require('../api.json');

const BASE_API_URI = `https://snet-voting.herokuapp.com`
//const BASE_API_URI = `http://localhost:8000`
const BASE_HEADERS = { "Content-Type": "application/json" }


function onAddCandidate(candidate) {


  const vindex = this.votes.findIndex(c => c === candidate.fullName);
  const cindex = this.candidates.findIndex(c => c.fullName === candidate.fullName);
  //Delete from votes
  if (vindex > -1) {
    //Untoggle
    this.candidates.forEach((c,cindex) => { 
      this.candidates[cindex].hasVote = false
      this.tier = 0;
      this.votes = [];
    });
  } else {
    this.votes.push(candidate.fullName);
    this.tier = this.tier + 1;
    //Toggle 
    this.candidates[cindex].hasVote = true;
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

function notification(ctx, type, message) {
  setTimeout(function () { ctx.error = null }, 1000)
  ctx.message = message;
  ctx.messageType = type;
}

Vue.use(VueResource);

new Vue({
  el: '#app',
  data: {
    candidates,
    tier: 0,
    votes: [],
    from: undefined,
    signed: undefined,
    message: null,
    messageType: undefined
  },
  methods: { onAddCandidate, voteForCandidate },
  mounted: function () {
    window.ethjs = new Eth(window.web3.currentProvider);
  }
}).$mount('#app')