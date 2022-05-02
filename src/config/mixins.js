import {mapGetters, mapState} from "vuex";

const web3Modal = {
    computed: {
        ...mapState(['web3Modal']),
        ...mapGetters(['predictionsContract'])
    },
    active() {
        return this.web3Modal.active
    },
    account() {
        return this.web3Modal.account
    },
    chainId() {
        return this.web3Modal.chainId
    }
}

export {
    web3Modal,
}