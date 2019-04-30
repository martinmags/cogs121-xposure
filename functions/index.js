const functions = require('firebase-functions');
var admin = require("firebase-admin");
const express = require('express');

const app = express();

var serviceAccount = require("./ServiceAccountKey.json");

admin.initializeApp({
   credential: admin.credential.cert(serviceAccount),
   databaseURL: "https://pandaexpressjs.firebaseio.com"
});

const db = admin.firestore();

// Display all users' names
app.get('/users', (req, res) => {
   db.collection("users").get().then((querySnapshot) => {
      let userArray = [];
      querySnapshot.forEach((doc) => {
         userArray.push(doc.data().name);
      });
      res.send(userArray);
      return userArray;
   }).catch((error) => {
      console.error("Error: ", error);
   });
});

// Display a user's data when userid is specified
app.get('/users/:userid', (req, res) => {
   const userId = req.params.userid;

   db.collection("users").doc(userId).get().then((doc) => {
      if (doc.exists) {
         console.log("Document data:", doc.data());
         res.send(doc.data());
      } else {
         // doc.data() will be undefined in this case
         console.log("No such document!");
         res.send("No such document!");
      }
      return doc;
   }).catch((error) => {
      console.error("Error getting document:", error);
   });
});

// Add a user
app.post('/users', (req, res) => {
   const { body } = req;
   const { name, email, isTeacher } = body;

   db.collection("users").add({
      name,
      email,
      isTeacher,
      level: 1
   })
   .then((docRef) => {
      console.log("User added! Document ID: ", docRef.id);
      res.redirect("/users");
      return docRef;
   })
   .catch((error) => {
      console.error("Error writing document: ", error);
   });
})

exports.app = functions.https.onRequest(app);
