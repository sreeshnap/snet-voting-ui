import Vue from 'vue';


function onAddCandidate(candidate) {

  if (this.voteComplete === true)
    return;

  const found = Object.values(this.votes).find(value => value === candidate.fullName)

  if (found) 
    return;

  this.votes.push(candidate.fullName);
  this.tier = this.tier + 1;

  if (this.tier > 2) {
    this.voteComplete = true;
  }

  console.log(this.votes)
}


new Vue({
  el: '#app',
  data: {
    candidates: [
      { fullName:"Tiero", description: "lorem ipsum" },
      { fullName:"Cassio", description: "lorem ipsum" },
      { fullName:"Alberto", description: "lorem ipsum" },
      { fullName:"Sophia", description: "lorem ipsum" },
      { fullName:"Ben", description: "lorem ipsum" },      
    ],
    tier:0, 
    voteComplete: false,
    votes: []
  },
  methods: { onAddCandidate }
}).$mount('#app')