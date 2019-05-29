const express = require('express');
const app = express();
const url = require('url');
var request = require('request');
const Busboy = require('busboy');
const admin = require("firebase-admin");
const functions = require('firebase-functions');
const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
require("firebase/firestore");

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
   storageBucket: "pandaexpressjs.appspot.com",
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
            portfolio,
            submissions: [],
            evaluations: []
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

   if (email === "admin@ucsd.edu") {
      firebase.auth().signInWithEmailAndPassword(email, password)
         .then(function (data) {
            console.log('uid', data.user.uid);
            res.redirect('/Admin.html');
         })
         .catch(function (error) {
            res.send(error);
         });
   } else {
      firebase.auth().signInWithEmailAndPassword(email, password)
         .then(function (data) {
            console.log('uid', data.user.uid);
            res.redirect('/Discover.html');
         })
         .catch(function (error) {
            res.send(error);
         });
   }
})

// User log out
app.post('/users/logout', (req, res) => {
   firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
         // User is signed in.
         firebase.auth().signOut();
         res.redirect('/');
      } else {
         // No user is signed in.
         res.send("You're not logged in!");
      }
   });
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

// generate 3 prompts
app.get('/gen-prompts', (req, res) => {

   request("https://api.unsplash.com/collections/featured?page=8&per_page=3&client_id=a2e61cfb25649bf508835bb5dcded3701a65033ede47fd307f6adfc23acaaf8c",
      function (error, response, body) {
         if (!error && response.statusCode === 200) {
            JSON.parse(body).forEach((e) => {
               console.log(e["title"]);
               console.log(e["cover_photo"]["urls"]["regular"]);

               db.collection("prompts").add({
                  title: e["title"],
                  coverUrl: e["cover_photo"]["urls"]["regular"],
                  entryDate: new Date().getTime(),
                  deadline: new Date().getTime() + (7 * 24 * 60 * 60 * 1000),
                  submissions: []
               })
                  .then((docRef) => {
                     console.log("Prompt " + "\"" + e["title"] + "\"" + " added! Document ID: " + docRef.id);
                  })
                  .catch((error) => {
                     console.error("Error writing document: ", error);
                  });
            });

            res.json(JSON.parse(body));
         } else {
            res.json(error);
         }
      }
   );

})

// Handle passing promptId from Discover to Prompt
app.post('/select-prompt', (req, res) => {
   let pid = req.body.promptId;
   res.redirect(url.format({
      pathname: "/Prompt.html",
      query: {
         "pid": pid
      },
   }));
});

// Handle passing promptId from Prompt to Submission
app.post('/pass-prompt', (req, res) => {
   let pid = req.body.promptId;
   res.redirect(url.format({
      pathname: "/Submission.html",
      query: {
         "pid": pid
      },
   }));
});

// submit photos to firebase storage
// https://firebase.google.com/docs/storage/web/start
var bucket = admin.storage().bucket();

// Write submission to db
app.post('/submit-form', (req, res) => {
   const busboy = new Busboy({ headers: req.headers });
   // This object will accumulate all the fields, keyed by their name
   const fields = {};
   // This object will accumulate all the uploaded files, keyed by their name.
   const uploads = {};

   // This code will process each non-file field in the form.
   busboy.on('field', (fieldname, val) => {
      console.log(`Processed field ${fieldname}: ${val}.`);
      fields[fieldname] = val;
   });

   // This code will process each file uploaded.
   busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(`Processed file ${filename}`);
      if (mimetype.includes('image') && filename) {
         let fileExt = mimetype.replace('image/', '');
         let imageName = fields["uid"] + '.' + fileExt;
         let tempImgUrl = 'submissions/' + fields["promptId"] + '/' + imageName;
         let bucketFile = bucket.file(tempImgUrl);
         file.pipe(bucketFile.createWriteStream({ metadata: { contentType: mimetype } }));
         uploads[fieldname] = tempImgUrl;
      }
   });

   // Triggered once all uploaded files are processed by Busboy.
   // We still need to wait for the disk writes (saves) to complete.
   busboy.on('finish', () => {
      db.collection("submissions").add({
         candidateId: fields["uid"],
         promptId: fields["promptId"],
         title: fields["title"],
         description: fields["desc"],
         file: uploads["document"],
         entryDate: new Date().getTime(),
         evaluations: []
      })
         .then((docRef) => {
            console.log("Submission added! Document ID: ", docRef.id);

            // Push submissionId to array of submissions in the corresponding user.
            db.collection("users").doc(fields["uid"]).update({
               submissions: admin.firestore.FieldValue.arrayUnion(docRef.id)
            });

            // Push submissionId to array of submissions in the corresponding prompt.
            db.collection("prompts").doc(fields["promptId"]).update({
               submissions: admin.firestore.FieldValue.arrayUnion(docRef.id)
            });

            res.redirect("/Evaluate.html");
         })
         .catch((error) => {
            console.error("Error writing document: ", error);
            res.redirect("/Submission.html");
         });
   });

   busboy.end(req.rawBody);
})

// submit evaluation for a submission

exports.app = functions.https.onRequest(app);
