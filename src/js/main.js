import Vue from "vue";
import VueResource from "vue-resource";
import Web3 from "web3";

import Eth from "ethjs";
import { closeSelectedProposal, getMessageToSign, getProposals, saveProposal } from "./proposals";


const networks = {
  1: "Mainnet",
  3: "Ropsten",
};

const BASE_API_URI = process.env.BASE_API_URI;
const BASE_HEADERS = { "Content-Type": "application/json" };
const EVENT_ID = process.env.EVENT_ID;

function scrollToTop() {
  setTimeout(function () {
    window.scrollTo(0, 0);
  }, 0);
}

function formattedDateComponentsNumber(number) {
  return ("0" + number).slice(-2);
}

// function onAddOption(question, answer) {
//   let qstn = this.event.questions.find((quest) => quest.ques_id === question.ques_id);

//   const options = qstn.options.map((option) => {
//     if (option.text === answer.text) {
//       option.selected = true;
//     } else {
//       option.selected = false;
//     }
//     return option;
//   });
//   qstn.options = options;
//   this.selectedCandidates = true;
// }

function getTimeRemaining(endTime) {
  const endtimeEpoch = parseInt(endTime);
  var deadline = new Date(endtimeEpoch * 1000);
  var t = Date.parse(deadline) - Date.parse(new Date());
  var seconds = Math.floor((t / 1000) % 60);
  var minutes = Math.floor((t / 1000 / 60) % 60);
  var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
  var days = Math.floor(t / (1000 * 60 * 60 * 24));
  return {
    total: t,
    days: days,
    hours: formattedDateComponentsNumber(hours),
    minutes: formattedDateComponentsNumber(minutes),
    seconds: formattedDateComponentsNumber(seconds),
  };
}

function getChainId() {
  let chainIdHex = window.ethereum.chainId;
  let chainId = parseInt(chainIdHex, 16);
  return chainId;
}

function submitVote() {
  this.loading.submitVote = true;
  let chainId = getChainId();
  if (`${chainId}` !== process.env.CHAIN_ID) {
    let allowedNetwork = networks[process.env.CHAIN_ID];
    this.loading.submitVote = false;
    return notification(this, "error", `Please switch to ${allowedNetwork} network.`);
  }

  const msg = getMessageToSign(this.selectedProposal, this.selectedOption);

  const from = window.ethereum.selectedAddress;
  if (!from) {
    this.loading.submitVote = false;
    return notification(this, "error", "Connect or Unlock Metamask and reload the page");
  }

  this.from = from;
  console.log("message to sign", msg.string);
  window.web3.eth.personal
    .sign(msg.string, from)
    .then((signed) => {
      this.signed = signed;
      return {
        message: msg.string,
        signature: signed,
      };
    })
    .then((body) => {
      console.log("signature", body);
      // return this.$http.post(BASE_API_URI + `voting/answers/save?event_id=${EVENT_ID}`, body, BASE_HEADERS);
      return saveProposal(from, msg.raw, body.signature);
    })
    .then((response) => {
      console.log("repsonse.....", response);
      if (response.status === "failed") {
        this.loading.submitVote = false;
        return notification(this, "error", response.error.message);
      }
      this.loading.submitVote = false;
      this.proposals.active.map(item => {
        if(item.question_id === this.selectedProposal.question_id){
          item.user_response_key = this.selectedOption;
        }
      })
      return notification(this, "success", "Your vote has been recorded successfully!");
    })
    .catch((error) => {
      this.loading.submitVote = false;
      return notification(
        this,
        "error",
        error.message ? error.message : "Unable to submit the vote. Please try again."
      );
    });
}

function toHex(str) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
}

function toPaddedHex(string, bit = 32) {
  const hex = toHex(string);
  const hexLength = hex.length;
  const paddedHex = window.web3.utils.padRight(hex, bit * (Math.floor(hexLength / bit) + 1));
  return paddedHex;
}

function notification(ctx, type, message) {
  setTimeout(function () {
    ctx.message = undefined;
  }, 2000);
  ctx.message = message;
  ctx.messageType = type;
  scrollToTop();
}

async function beforeMount() {
  history.pushState(null, null, null);
  window.addEventListener('popstate', function () {
    history.pushState(null, null, null);
    window.location.reload()  
  });
  if (window.ethereum) {
    console.log("Modern dapp browsers...");
    try {
      // Request account access if needed
      await ethereum.request({ method: "eth_requestAccounts" });
      // Acccounts now exposed
      window.ethjs = new Eth(window.web3.currentProvider);
      window.web3 = new Web3(window.web3.currentProvider);
    } catch (error) {
      // User denied account access...
      console.log("User denied account access...!");
    }
  } else if (window.web3) {
    console.log("Legacy dapp browsers...");
    window.web3 = new Web3(window.web3.currentProvider);
    // Acccounts always exposed
    provider = window.web3.currentProvider;
    window.ethjs = new Eth(window.web3.currentProvider);
  } else {
    // Non-dapp browsers...
    console.log("Non-Ethereum browser detected. You should consider trying MetaMask!");
  }
}

function handleAccountsChanged(that) {
  window.ethereum.on("accountsChanged", function (accounts) {
    that.from = accounts[0];
    getProposals(that, accounts[0]);
    window.location.reload();
    return;
  });
}
function handleNetworkChanged() {
  window.ethereum.on("chainChanged", (_chainId) => window.location.reload());
}

function startCountdownTimer(that) {
  setInterval(() => {
    const timeRemaining = getTimeRemaining(that.event.end_period);
    const { days, hours, minutes, seconds } = timeRemaining;
    const hoursIncludingDays = parseInt(hours) + parseInt(days) * 24;
    that.countdownTime = `${hoursIncludingDays} Hr -  ${minutes} Min  - ${seconds} Sec`;
  }, 1000);
}
function selectionOptionChange(activeProposal) {
  this.selectedProposal = activeProposal;
  setTimeout(() => {
    if (this.selectedProposal.question_type === "DROP_DOWN")
      if (this.selectedProposal.user_response_key){
        document.getElementById("dropdown").disabled = true;
        this.selectedOption = this.selectedProposal.user_response_key
      }
      else document.getElementById("dropdown").disabled = false;
  }, 500);
}

async function mounted() {
  getProposals(this);
  startCountdownTimer(this);
  if (!window.ethereum) {
    return notification(this, "error", "Connect or Unlock Metamask and reload the page");
  }

  const accounts = await ethereum.request({ method: "eth_accounts" });
  const from = accounts[0];

  if (!from) {
    return notification(this, "error", "Connect or Unlock Metamask and reload the page");
  }
  getProposals(this, from);
  let chainId = getChainId();
  if (`${chainId}` !== process.env.CHAIN_ID) {
    let allowedNetwork = networks[process.env.CHAIN_ID];
    return notification(this, "error", `Please switch to ${allowedNetwork} network.`);
  }
  this.isMetamaskConnected = true;
  handleAccountsChanged(this);
  handleNetworkChanged();
  this.from = from;
}

function isVotingTime() {
  const now = parseInt(new Date().getTime() / 1000);
  const ret = now > this.event.startPeriod && now < this.event.endPeriod;
  return ret;
}

Vue.use(VueResource);

new Vue({
  el: "#app",
  data: {
    event: {
      eventName: "",
      startPeriod: 0,
      endPeriod: 0,
      questions: [],
    },
    selectedCandidates: false,
    alreadyVoted: false,
    receipt: undefined,
    tier: 0,
    votes: [],
    from: undefined,
    signed: undefined,
    message: null,
    messageType: undefined,
    isShowModal: false,
    isMetamaskConnected: false,
    countdownTime: "00 Hr 00 Mn 00 s",
    proposals: undefined,
    selectedProposal: undefined,
    selectedOption: undefined,
    loading: { proposals: false, submitVote: false },
  },
  methods: {
    submitVote,
    closeSelectedProposal() {
      closeSelectedProposal(this);
    },
    selectionOptionChange,
    // onAddOption,
  },
  computed: { isVotingTime },
  beforeMount: beforeMount,
  mounted: mounted,
}).$mount("#app");
