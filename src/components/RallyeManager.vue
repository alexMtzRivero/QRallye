<template>
  <div class="form-style-6">
    <img class="logo" src="../assets/logo_appli.png" />
    <button class="refresh_button" @click="logPlayers()"> Rafraîchir</button>
    <br>
    <br>
    <br>
     <div id="mapid" class="mapid"> </div>
    <div v-for="(team,indexT) in teams" v-bind:key="team.name">
      <div>
           <h1 @click="changeDisplay(indexT)">{{team.name}}  {{team.timeText}}      status : {{team.stats.status}}</h1>
      </div>
     
      <div v-if="team.displayed"  style="display: grid;">
          <h2> Mauvaises réponses: {{team.stats.badAnswers}} , pénalité : {{team.stats.badAnswers}}x{{penaltyForBad}} = {{team.stats.badAnswers*penaltyForBad}} sec</h2>
          <h2> Temps des Quiz: {{team.stats.quizTime}} sec</h2>
          <h2> Temps global: {{team.stats.ralleyTime}} sec</h2>
          <h2> Lieu non visité: {{team.stats.nonAnswered}} , pénalité : {{team.stats.nonAnswered}}x{{penaltyForCheckpoint}} = {{team.stats.nonAnswered*penaltyForCheckpoint}} sec</h2>
          <h2> Rallye terminé: {{team.stats.finished ? "oui" : "non"}}</h2>
        <div v-for="(answer,index) in team.answers" v-bind:key="team.name+index" class="horizontal">
           <h2 class = "listSection">{{getAnsweredQuizName(answer.id)}}</h2>
           <h2 class = "listSection">{{(answer.endQuiz && answer.startQuiz)?(answer.endQuiz.seconds-answer.startQuiz.seconds):0}} sec</h2>
           <table>
             <tr>
                <th v-for="(n,index) in answer.choices" :key="team.name+'in1'+index">{{index}} </th>
             </tr>
             <tr>
                <td v-for="(n,index) in answer.choices" :key="team.name+'in2'+index">
                  {{n}}
                  <img src="../assets/correct.png" class="answerStateImg" v-if="isAnswerCorrect(n, answer.id, index)"/>
                  <img src="../assets/false.png" class="answerStateImg" v-if="!isAnswerCorrect(n, answer.id, index)"/>
                </td>
             </tr>
           </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import firebase from "firebase";

export default {
  name: 'RallyeManager',
  components: {

  },
  props: {


  },
  data() {
    return {
      teams: [],
      quizzes: [],
      mymap:"",
      penaltyForBad:10
    }
  },
  methods: {
 timeOfTeam: function (team) {
   var duration = team.stats.points*1000;
    var minutes = Math.floor((duration / (1000 * 60)) % 60);
    var hours = Math.floor((duration / (1000 * 60 * 60)));
    var seconds = Math.floor((duration / 1000) % 60);
    var result = hours+"H "+minutes+"m "+seconds+"s";
    return result
    },
    changeDisplay:function (index) {
      this.zoomInTeam(this.teams[index].path);
      this.teams[index].displayed = !this.teams[index].displayed;
    },
    logPlayers: function () {
      this.updatePoints();
      this.updatePaths();
      this.$forceUpdate();
    },
    
    updatePoints: function(){
      for (let i = 0; i < this.teams.length; i++) {
        this.teams[i].stats = this.getStatsOf(this.teams[i]);
        this.teams[i].timeText = this.timeOfTeam(this.teams[i])
      }
      this.teams.sort((a,b)=>{return a.stats.points-b.stats.points});
       
    },
    getStatsOf:function(team){
      var totQuiz = Object.keys(this.quizzes).length
      var stats = {};
      stats.points = 0;
      stats.badAnswers = 0;
      stats.quizTime = 0;
      stats.ralleyTime = 0;
      stats.nonAnswered = 0;
      stats.finished = true;
      stats.status = "pas commencé";
      
      if( team.answers!= null){
        // for all the quizz
        stats.nonAnswered = totQuiz - team.answers.length;
        for (let i = 0; i < team.answers.length; i++) {
          const quiz = team.answers[i];
          // we check the bad choices
          if( quiz.choices != null){
            for (let i = 0; i < quiz.choices.length; i++) {
              // if its bad answer we add to the counter
              if(this.quizzes[quiz.id] != null)
              if(this.quizzes[quiz.id].questions[i] && quiz.choices[i]!= this.quizzes[quiz.id].questions[i].goodAnswer)
                  stats.badAnswers += 1;
             // console.log(quiz.choices[i],this.quizzes[quiz.id].questions[i].goodAnswer,quiz.choices[i]!= this.quizzes[quiz.id].questions[i].goodAnswer);
                  
            }
          }
            // we add the time they took to complet the quiz
          if(quiz.endQuiz!=null && quiz.startQuiz!=null){
              stats.quizTime += quiz.endQuiz.seconds - quiz.startQuiz.seconds;
          }
            
        }
      }
      if(team.endRallye && team.startRallye){
        stats.ralleyTime = team.endRallye.seconds - team.startRallye.seconds;
        stats.status = "terminé";
      }else if(team.startRallye != null && team.endRallye == null){
        stats.ralleyTime = Math.round(Date.now()/1000 - team.startRallye.seconds);
        stats.status = "en cours";
        stats.finished = false;
      }else{
        stats.status = "pas commencé";
        stats.finished = false;
      }
      stats.points = (stats.badAnswers * this.penaltyForBad) + stats.quizTime + stats.ralleyTime + (stats.quizTime != 0 ? stats.nonAnswered * this.penaltyForCheckpoint : 0);
      return stats;
    },
    updatePaths: function(){
        
        for (let i = 0; i < this.teams.length; i++) {
          const team = this.teams[i];
          var path =[]
          for (let i = 0; i < team.answers.length; i++) {
            const answer = team.answers[i].id;
            const latLong = this.quizzes[answer].position;
            path.push([latLong.latitude,latLong.longitude]);


          }
        var polyline = L.polyline(path, {color: `${team.color}`}).addTo(this.mymap);
           team.path = path;   
                  
        }
    },
    getAnswersOf: function (teamList) {
      var db = firebase.firestore();

      for (let i = 0; i < teamList.length; i++) {
        const team = teamList[i];

        db.collection(`Groups/${team.name}/Answers`).orderBy("startQuiz").get().then((querySnapshot) => {
        if (team.answers==null) {
              team.answers = [];
           }
          querySnapshot.docs.forEach(element => {
            
            var toPush = element.data();
            toPush.id = element.id;
            team.answers.push(toPush)
          });
          
        })
      }

    },
    getPlayers: function () {
      var db = firebase.firestore();
      var teams = [];
      db.collection('Groups').get().then((querySnapshot) => {

        querySnapshot.docs.forEach(element => {
          // the same but reactive this.teams[element.id] = element.data();
          var toPush = element.data();
          toPush.name = element.id;
          toPush.displayed = false;
          this.teams.push(toPush);
        });

        this.getAnswersOf(this.teams);
      })
    },
    getGoodAnswers:function (list) {
      var db = firebase.firestore();

      var quizList = Object.keys(list);
      for (let i = 0; i < quizList.length; i++) {
        const quiz = quizList[i];

        db.collection(`Quizzes/${quiz}/Questions`).get().then((querySnapshot) => {
          if(!this.quizzes[quiz].questions){
            this.quizzes[quiz].questions = []
          }
          querySnapshot.docs.forEach(element => {
            var toPush = element.data();
            toPush.id = element.id;
            this.quizzes[quiz].questions.push(toPush);
          });
          //console.log("respuestas",this.quizzes[quiz]);
          
          
        })
      }

    },
    getQuestions: function () {
      var db = firebase.firestore();

      db.collection('Quizzes').get().then((querySnapshot) => {
        querySnapshot.docs.forEach(element => {
          this.quizzes[element.id] = element.data()
        });
        
        this.getGoodAnswers(this.quizzes);

        this.getPlayers();
      })
    },
    zoomInTeam: function (path) {
      if(path && path.length>0)
        this.mymap.fitBounds(path);
    },
    mapInit: function () {
      this.mymap = L.map('mapid', {
        center: [45.188096, 5.718452],
        zoom: 13
      })
      // conects the map with the open street maps data
      this.tileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      );
      this.tileLayer.addTo(this.mymap);

      
    },
    getAnsweredQuizName: function(answerId){
      var res = this.quizzes[answerId];
      if(res != null){
        return res.nomQuiz;
      }else
        return answerId;
    },
    isAnswerCorrect: function(answer, id, index){
      return (this.quizzes[id].questions[index].goodAnswer == answer);
    }


  },
  // on create
  mounted() {
    this.$parent.testLogin();
    this.mapInit()
    let db = firebase.firestore();
          db.collection('Rules').get().then((querySnapshot) => {
              querySnapshot.docs.forEach(element => {
                var malus = element.data().malusReponse;
                this.penaltyForCheckpoint = Number(element.data().malusCheckpoint);
                this.penaltyForBad = Number(malus);
              });
          });
    // gets the data of the teams
    this.getQuestions();
    
    

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.logo {
  width: 5%;
  float: left;
}
#mapid { 
  display: -webkit-inline-box;
  height: 50vw;
  width: 90%;

}
.horizontal{
  display: -webkit-inline-box;
      width: -webkit-fill-available;
}
.listSection{
  padding-right: 4%;
}
table{
  width: 70%;
  border-spacing: 0px;
  border-collapse: collapse;
}
th{
  border: solid 1px;
  background: #f2f2f2;
}

td{
  border: solid 1px;
  background: #f2f2f2;

}

.answerStateImg{
  width: 20px;
  height: 20px;
  margin: 5px;
  margin: auto;
}





.form-style-6{
	font: 95% Arial, Helvetica, sans-serif;
	max-width: 75%;
	margin: 10px auto;
	padding: 16px;
	background: #F7F7F7;
}
.form-style-6 h1{
background: linear-gradient(90deg, rgba(255,221,88,1) 0%,rgba(100,205,129,1) 33%, rgba(16,174,161,1) 67%,rgba(1,136,168,1) 100%);	padding: 20px 0;
	font-size: 140%;
	font-weight: 300;
	text-align: center;
	color: #fff;
	margin: 0px 0px 3px 0px;
}
.form-style-6 h1:hover{
  cursor: pointer;
}

.form-style-6 input[type="text"],
.form-style-6 input[type="date"],
.form-style-6 input[type="datetime"],
.form-style-6 input[type="email"],
.form-style-6 input[type="number"],
.form-style-6 input[type="search"],
.form-style-6 input[type="time"],
.form-style-6 input[type="url"],
.form-style-6 textarea,
.form-style-6 select 
{
	-webkit-transition: all 0.30s ease-in-out;
	-moz-transition: all 0.30s ease-in-out;
	-ms-transition: all 0.30s ease-in-out;
	-o-transition: all 0.30s ease-in-out;
	outline: none;
	box-sizing: border-box;
	-webkit-box-sizing: border-box;
	-moz-box-sizing: border-box;
	width: 70%;
	background: #fff;
	margin-bottom: 4%;
	border: 1px solid #ccc;
	padding: 5px;
	color: #555;
	font: 95% Arial, Helvetica, sans-serif;
}
.form-style-6 input[type="text"]:focus,
.form-style-6 input[type="date"]:focus,
.form-style-6 input[type="datetime"]:focus,
.form-style-6 input[type="email"]:focus,
.form-style-6 input[type="number"]:focus,
.form-style-6 input[type="search"]:focus,
.form-style-6 input[type="time"]:focus,
.form-style-6 input[type="url"]:focus,
.form-style-6 textarea:focus,
.form-style-6 select:focus
{
	box-shadow: 0 0 5px #43D1AF;
	border: 1px solid #43D1AF;
}

.form-style-6 button[type="submit"],
.form-style-6 button[type="button"],
.form-style-6 button {
	width: 20%;
	padding: 5px;
	background: rgba(16,174,161,1) 33%;
	color: #fff;
  padding: 10px;
  border:none;
  border-radius: 3px;
}
.form-style-6 button[type="submit"]:hover,
.form-style-6 button[type="button"]:hover,
.form-style-6 button:hover{
  background: #0E988D;
  cursor: pointer;
}
.refresh_button {
  float: right;
}

@media screen and (min-width: 200px) and (max-width: 640px) {
  .logo {
  width: 15%;
  float: left;
  }

  h1{
    background: linear-gradient(90deg, rgba(255,221,88,1) 0%,rgba(100,205,129,1) 33%, rgba(16,174,161,1) 67%,rgba(1,136,168,1) 100%);	font-size: 140%;
    padding: 20px 0;
    font-size: 140%;
    font-weight: 300;
    text-align: center;
    color: #fff;
    margin: -16px -16px 16px -16px;
    max-width: 60vh;
    margin: 10px auto;
    padding: 16px;
  }

  .form-style-6 button[type="submit"],
  .form-style-6 button[type="button"],
  .form-style-6 button {
    width: 30%;
    padding: 5px;
    background: rgba(16,174,161,1) 33%;
    color: #fff;
    padding: 10px;
    border:none;
    border-radius: 3px;
  }

  .form-style-6{
	font: 95% Arial, Helvetica, sans-serif;
	max-width: 60vh;
	margin: 10px auto;
	background: #F7F7F7;
  margin-left: 65px;
  margin-right: 5px;
  }

  #mapid { 
    z-index: 1;
  }
}

</style>
