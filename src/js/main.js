import Vue from "vue";
import VueResource from "vue-resource";
import Web3ModalVue from "web3modal-vue";
import WalletConnectProvider from "@walletconnect/web3-provider";
import {web3Modal} from "../config/mixins";
import store from '../store'
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

function submitVote() {
  this.loading.submitVote = true;
  let chainId = this.web3Modal.chainId;
  if (`${chainId}` !== process.env.CHAIN_ID) {
    let allowedNetwork = networks[process.env.CHAIN_ID];
    this.loading.submitVote = false;
    return notification(this, "error", `Please switch to ${allowedNetwork} network.`);
  }

  const msg = getMessageToSign(this.selectedProposal, this.selectedOption);

  const from = this.web3Modal.account;
  if (!from) {
    this.loading.submitVote = false;
    return notification(this, "error", "Connect or Unlock Metamask and reload the page");
  }

  this.from = from;
  console.log("message to sign", msg.string);
  const signer = this.web3Modal.library.getSigner();
  signer.signMessage(msg.string)
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
  this.$nextTick(async () => {
    const web3modal = this.$refs.web3modal;
    this.$store.commit('setWeb3Modal', web3modal)
    if (web3modal.cachedProvider) {
      this.connect()
    }
  })
  getProposals(this);
  startCountdownTimer(this);

  setTimeout(() => {
    const from = this.web3Modal.account;
    if(!from){
      return notification(this, "error", "Connect or Unlock Metamask and reload the page");
    }

    getProposals(this, from);
    let chainId = this.web3Modal.chainId;
    if (`${chainId}` !== process.env.CHAIN_ID) {
      let allowedNetwork = networks[process.env.CHAIN_ID];
      return notification(this, "error", `Please switch to ${allowedNetwork} network.`);
    }
    this.from = from;

  }, 1000);
}

function isVotingTime() {
  const now = parseInt(new Date().getTime() / 1000);
  const ret = now > this.event.startPeriod && now < this.event.endPeriod;
  return ret;
}

Vue.use(VueResource);

new Vue({
  el: "#app",
  store,
  components: {
    Web3ModalVue
  },
  mixins: [web3Modal],
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
    theme: 'light',
    providerOptions: {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.INFURA_KEY,
        },
      },
      },
    number: 0,
    balance: 0
  },
  methods: {
    connect() {
      this.$store.dispatch('connect')
    },
    submitVote,
    closeSelectedProposal() {
      closeSelectedProposal(this);
    },
    selectionOptionChange,
    // onAddOption,
  },
  computed: { isVotingTime },
  beforeMount: beforeMount,
  created() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.theme = 'dark'
    }
  },
  mounted: mounted,
}).$mount("#app");
