import { getLibrary } from "../../utils/web3";
import { ethers } from "ethers";
import { parseInt } from "lodash";
import web3 from 'web3'

const web3ModalStore = {
  state: {
    web3Modal: null,

    library: getLibrary(),
    active: false,
    account: null,
    chainId: 0,
    provider: null,
  },
  mutations: {
    setWeb3Modal(state, web3Modal) {
      state.web3Modal = web3Modal;
    },
    setLibrary(state, library) {
      state.library = library;
    },
    setActive(state, active) {
      state.active = active;
    },
    setAccount(state, account) {
      state.account = account?.toLowerCase() || null;
    },
    setChainId(state, chainId) {
      state.chainId = chainId;
    },
    setProvider(state, provider) {
      state.provider = provider;
    },
  },
  actions: {
    async connect({ state, commit, dispatch }) {
      const provider = await state.web3Modal.connect();
      commit("setProvider", provider);
        
      const library = new ethers.providers.Web3Provider(provider);

      library.pollingInterval = 12000;
      commit("setLibrary", library);

      const accounts = await library.listAccounts();
      console.log("=======accounts===",accounts)
      if (accounts.length > 0) {
        commit("setAccount", accounts[0]);
      }
      const network = await library.getNetwork();

      try{
        const isExpectedNetwork = Number(network.chainId) === Number(process.env.CHAIN_ID);
        if (!isExpectedNetwork) {
          const hexifiedChainId = web3.utils.toHex(process.env.CHAIN_ID);
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexifiedChainId }]
          });
        }
      }catch(err){
        console.error("error of network change",err)
      }
      
      commit("setChainId", network.chainId);
      commit("setActive", true);

      provider.on("connect", async (info) => {
        let chainId = parseInt(info.chainId);
        commit("setChainId", chainId);
        window.location.reload();
        console.log("connect====", info);
      });

      provider.on("accountsChanged", async (accounts) => {
        if (accounts.length > 0) {
          commit("setAccount", accounts[0]);
        } else {
          console.log("===reset===");
          await dispatch("resetApp");
        }
        console.log("accountsChanged");
        window.location.reload();
      });
      provider.on("chainChanged", async (chainId) => {
        chainId = parseInt(chainId);
        commit("setChainId", chainId);
        console.log("chainChanged", chainId);
        window.location.reload();
      });
      provider.on("disconnect", (code, reason) => {
        console.log(code, reason);
      });
    },
    async resetApp({ state, commit }) {
      try {
        await state.web3Modal.clearCachedProvider();
        await state.provider.disconnect();
      } catch (error) {
        console.error(error);
      }
      commit("setAccount", null);
      commit("setProvider", null);
      commit("setActive", false);
      commit("setLibrary", getLibrary());
    },
  },
};

export default web3ModalStore;
