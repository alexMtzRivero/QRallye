import Vue from 'vue'
import App from './App.vue'
import router from './router'
import firebase from "firebase";

var config = {
  apiKey: "AIzaSyDXTcJH4PZUKWqNG9MMqDbGWafOZWzWZ40",
  projectId: "q-rallye",
  authDomain: "q-rallye.firebaseapp.com",
  databaseURL: "https://q-rallye.firebaseio.com",
};
firebase.initializeApp(config);

Vue.config.productionTip = false

new Vue({
  router,
  render: function (h) { return h(App) },
}).$mount('#app')
