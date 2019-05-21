const express = require('express');
const app = express();
const admin = require("firebase-admin");
const functions = require('firebase-functions');
const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");

const firebaseConfig = {
   apiKey: "AIzaSyC6FPXu3_bOHpHr7AelgBKAMbGiIUPZ2Vo",
   authDomain: "pandaexpressjs.firebaseapp.com",
   databaseURL: "https://pandaexpressjs.firebaseio.com",
   projectId: "pandaexpressjs",
   storageBucket: "pandaexpressjs.appspot.com",
   messagingSenderId: "718178135759",
   appId: "1:718178135759:web:69fa40d070d7b12e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Admin
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
   }).catch((error) => {
      console.error("Error: ", error);
      res.send("Error: " + error);
   });
});

// Display a user's data when userid is specified
// app.get('/users/:userid', (req, res) => {
//    const userId = req.params.userid;

//    db.collection("users").doc(userId).get().then((doc) => {
//       if (doc.exists) {
//          console.log("Document data:", doc.data());
//          res.send(doc.data());
//       } else {
//          // doc.data() will be undefined in this case
//          console.log("No such document!");
//          res.send("No such document!");
//       }
//       return doc;
//    }).catch((error) => {
//       console.error("Error getting document:", error);
//    });
// });

// User sign up
app.post('/users/signup', (req, res) => {
   const { body } = req;
   const { alias, name, email, password, ig, portfolio } = body;

   firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(function (data) {
         console.log('uid', data.user.uid)

         db.collection("users").doc(data.user.uid).set({
            alias,
            name,
            email,
            ig,
            portfolio
         })
            .then((docRef) => {
               console.log("User added! Document ID: ", docRef.id);
               res.redirect("/Discover.html");
            })
            .catch((error) => {
               console.error("Error writing document: ", error);
               res.redirect("/CreateAccount.html");
            });
      })
      .catch(function (error) {
         var errorCode = error.code;
         var errorMessage = error.message;
         if (errorCode == 'auth/weak-password') {
            console.log('The password is too weak.');
         } else {
            console.log(errorMessage);
         }
         console.log(error);

         res.send(error);
      });
})

// User log in
app.post('/users/login', (req, res) => {
   const { body } = req;
   const { email, password } = body;

   firebase.auth().signInWithEmailAndPassword(email, password)
      .then(function (data) {
         console.log('uid', data.user.uid);
         res.redirect('/Discover.html');
      })
      .catch(function (error) {
         res.send(error);
      });
})

// User log out
app.post('/users/logout', (req, res) => {
   if (firebase.auth().currentUser) {
      firebase.auth().signOut();
      res.redirect('/');
   } else {
      res.send("You're not logged in!");
   }
})

// discover page, check if user is logged in
app.get('/profile', (req, res) => {
   firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
         // User is signed in.
         res.json(user.uid);
      }
   })
})

// generate 3 prompts once a week
// https://firebase.google.com/docs/functions/schedule-functions?hl=en

// submit photos to firebase storage
// https://firebase.google.com/docs/storage/web/start
// let storage = firebase.storage();
var path = require('path');
var os = require('os');
var fs = require('fs');
var Busboy = require('busboy');

app.post('/submit-form', (req, res) => {
   const busboy = new Busboy({ headers: req.headers });
   const tmpdir = os.tmpdir();

   // This object will accumulate all the fields, keyed by their name
   const fields = {};

   // This object will accumulate all the uploaded files, keyed by their name.
   const uploads = {};

   // This code will process each non-file field in the form.
   busboy.on('field', (fieldname, val) => {
      // TODO(developer): Process submitted field values here
      console.log(`Processed field ${fieldname}: ${val}.`);
      fields[fieldname] = val;
   });

   const fileWrites = [];

   // This code will process each file uploaded.
   busboy.on('file', (fieldname, file, filename) => {
      // Note: os.tmpdir() points to an in-memory file system on GCF
      // Thus, any files in it must fit in the instance's memory.
      console.log(`Processed file ${filename}`);
      const filepath = path.join(tmpdir, filename);
      uploads[fieldname] = filepath;

      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);

      // File was processed by Busboy; wait for it to be written to disk.
      const promise = new Promise((resolve, reject) => {
         file.on('end', () => {
            writeStream.end();
         });
         writeStream.on('finish', resolve);
         writeStream.on('error', reject);
      });
      fileWrites.push(promise);
   });

   // Triggered once all uploaded files are processed by Busboy.
   // We still need to wait for the disk writes (saves) to complete.
   busboy.on('finish', () => {
      Promise.all(fileWrites).then(() => {
         // TODO(developer): Process saved files here
         for (const name in uploads) {
            const file = uploads[name];
            fs.unlinkSync(file);
         }
         res.send();
      });
   });

   busboy.end(req.rawBody);
})

// submit evaluation for a submission

exports.app = functions.https.onRequest(app);
