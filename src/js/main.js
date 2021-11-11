import Vue from "vue";
import VueResource from "vue-resource";
import Web3 from "web3";

import Eth from "ethjs";

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

function onAddOption(question, answer) {
  let qstn = this.event.questions.find(
    (quest) => quest.ques_id === question.ques_id
  );

  const options = qstn.options.map((option) => {
    if (option.text === answer.text) {
      option.selected = true;
    } else {
      option.selected = false;
    }
    return option;
  });
  qstn.options = options;
  this.selectedCandidates = true;
}

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

function generatePlainMessageFromSelectedOptions(questions) {
  const questionsAndAnswers = questions
    .map((question) => {
      const selectedOption = question.options.filter(
        (option) => option.selected
      );
      if (selectedOption.length > 0) {
        const [option] = selectedOption;
        return {
          ques_id: question.ques_id,
          answer: option.value,
          text: option.text,
        };
      }
    })
    .filter(Boolean);

  return JSON.stringify(questionsAndAnswers).toString().replace(/\\/g, "");
}

function voteForCandidate(votes) {
  this.isLoading = true;
  let chainId = getChainId();
  if (`${chainId}` !== process.env.CHAIN_ID) {
    let allowedNetwork = networks[process.env.CHAIN_ID];
    this.isLoading = false;
    return notification(
      this,
      "error",
      `Please switch to ${allowedNetwork} network.`
    );
  }

  const msg = generatePlainMessageFromSelectedOptions(this.event.questions);

  const from = window.ethereum.selectedAddress;
  if (!from) {
    this.isLoading = false;
    return notification(
      this,
      "error",
      "Connect or Unlock Metamask and reload the page"
    );
  }

  this.from = from;

  window.web3.eth.personal
    .sign(msg, from)
    .then((signed) => {
      this.signed = signed;
      return {
        message: msg,
        signature: signed,
      };
    })
    .then((body) => {
      return this.$http.post(
        BASE_API_URI + `voting/answers/save?event_id=${EVENT_ID}`,
        body,
        BASE_HEADERS
      );
    })
    .then((response) => {
      if (response.body.status === "failed") {
        this.isLoading = false;
        return notification(this, "error", response.body.error.message);
      }
      this.isLoading = false;
      return notification(
        this,
        "success",
        "Your vote has been recorded successfully!"
      );
    })
    .catch((error) => {
      this.isLoading = false;
      return notification(
        this,
        "error",
        error.message
          ? error.message
          : "Unable to submit the vote. Please try again."
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
  const paddedHex = window.web3.utils.padRight(
    hex,
    bit * (Math.floor(hexLength / bit) + 1)
  );
  return paddedHex;
}

function notification(ctx, type, message) {
  setTimeout(function () {
    ctx.error = null;
  }, 1000);
  ctx.message = message;
  ctx.messageType = type;
  scrollToTop();
}

async function beforeMount() {
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
    console.log(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }
}

function handleAccountsChanged(that) {
  window.ethereum.on("accountsChanged", function (accounts) {
    that.from = accounts[0];
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

function getQuestions(that) {
  that.$http
    .get(BASE_API_URI + `voting/questions?event_id=${EVENT_ID}`, BASE_HEADERS)
    .then((response) => {
      let event = response.data.data;
      event.questions.forEach((question) => {
        question.options.forEach((option) => {
          option.selected = false;
        });
      });
      event.eventName = event.event_name;
      event.endPeriod = event.end_period;
      event.startPeriod = event.start_period;
      that.event = event;
    });
}

async function mounted() {
  startCountdownTimer(this);
  if (!window.ethereum) {
    return notification(
      this,
      "error",
      "Connect or Unlock Metamask and reload the page"
    );
  }

  getQuestions(this);

  const accounts = await ethereum.request({ method: "eth_accounts" });
  const from = accounts[0];

  if (!from) {
    return notification(
      this,
      "error",
      "Connect or Unlock Metamask and reload the page"
    );
  }

  let chainId = getChainId();
  if (`${chainId}` !== process.env.CHAIN_ID) {
    let allowedNetwork = networks[process.env.CHAIN_ID];
    return notification(
      this,
      "error",
      `Please switch to ${allowedNetwork} network.`
    );
  }
  this.isMetamaskConnected = true;
  handleAccountsChanged(this);
  handleNetworkChanged();
  this.from = from;
  this.$http
    .get(BASE_API_URI + `/vote/` + from)
    .then((response) => response.json())
    .then((receipt) => {
      if (receipt.hasOwnProperty("error")) throw receipt.error;

      this.alreadyVoted = true;
      this.receipt = receipt;
    })
    .catch(console.log);
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
    isLoading: false,
    countdownTime: "00 Hr 00 Mn 00 s",
  },
  methods: {
    voteForCandidate,
    onAddOption,
  },
  computed: { isVotingTime },
  beforeMount: beforeMount,
  mounted: mounted,
}).$mount("#app");
