const express = require("express");
const app = express();
const url = require("url");
var request = require("request");
const Busboy = require("busboy");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
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
app.get("/users", (req, res) => {
  db.collection("users")
    .get()
    .then(querySnapshot => {
      let userArray = [];
      querySnapshot.forEach(doc => {
        userArray.push(doc.data().name);
      });
      res.send(userArray);
      return null;
    })
    .catch(error => {
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
app.post("/users/signup", (req, res) => {
  const { body } = req;
  const { alias, name, email, password, ig, portfolio } = body;

  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then(data => {
      console.log("uid", data.user.uid);

      db.collection("users")
        .doc(data.user.uid)
        .set({
          alias,
          name,
          email,
          ig,
          portfolio,
          submissions: [],
          evaluations: []
        })
        .then(docRef => {
          console.log("User added! Document ID: ", docRef.id);
          res.redirect("/Discover.html");
          return null;
        })
        .catch(error => {
          console.error("Error writing document: ", error);
          res.redirect("/CreateAccount.html");
        });
      return null;
    })
    .catch(error => {
      var errorCode = error.code;
      var errorMessage = error.message;
      if (errorCode === "auth/weak-password") {
        console.log("The password is too weak.");
      } else {
        console.log(errorMessage);
      }
      console.log(error);

      res.send(error);
    });
});

// User log in
app.post("/users/login", (req, res) => {
  const { body } = req;
  const { email, password } = body;

  if (email === "admin@ucsd.edu") {
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then(data => {
        console.log("uid", data.user.uid);
        res.redirect("/Admin.html");
        return null;
      })
      .catch(error => {
        res.send(error);
      });
  } else {
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then(data => {
        console.log("uid", data.user.uid);
        res.redirect("/Discover.html");
        return null;
      })
      .catch(error => {
        res.send(error);
      });
  }
});

// User log out
app.post("/users/logout", (req, res) => {
  firebase
    .auth()
    .signOut()
    .then(() => {
      // Sign-out successful.
      res.redirect("/");
    })
    .catch(error => {
      // An error happened.
      res.send("You're not logged in!");
    });
});

// discover page, check if user is logged in
app.get("/profile", (req, res) => {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // User is signed in.
      res.json(user.uid);
    }
  });
});

// generate 3 prompts
app.get("/gen-prompts", (req, res) => {
   // update "lastweek" prompts to "archived"
   db.collection("prompts").where("status", "==", "lastweek").get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
         db.collection("prompts").doc(doc.id).update({ "status": "archived" });
      });
   });
   console.log("archived lastweek prompts");

   // update "thisweek" prompts to "lastweek"
   db.collection("prompts").where("status", "==", "thisweek").get().then(function (querySnapshot) {
      querySnapshot.forEach(function (doc) {
         db.collection("prompts").doc(doc.id).update({ "status": "lastweek" });
      });
   });
   console.log("this week prompts are now last week prompts");

   // choose top winners for each of "lastweek" prompts
   db.collection("prompts").where("status", "==", "lastweek").get().then(function (p_qs) {
      // for each prompt, get array of submissions
      p_qs.forEach(function (prompt) {
         // for each submission, get array of evaluations and calculate avgScore
         prompt.data().submissions.forEach(function (subId) {
            let sum = 0;
            let count = 0;
            db.collection("submissions").doc(subId).get().then(function (sub) {
               // for each evaluation, get overallScore
               sub.data().evaluations.forEach(function (evalId) {
                  db.collection("evaluations").doc(evalId).get().then(function (eval) {
                     sum += eval.data().overallScore;
                     count++;
                  });
               });
            });
            // calculate mean across all evals for this submission
            let avg;
            if (count === 0) {
               // if received no evals, avg is 0
               avg = 0;
            } else {
               avg = sum / count;
            }
            // update submission avgScore
            db.collection("submissions").doc(subId).update({ "avgScore": avg });
         });
         // identify top 3 winners
         db.collection("submissions").where("promptId", "==", prompt.id).orderBy("avgScore", "desc").limit(3).get().then(function (w_qs) {
            w_qs.forEach(function (winningSub) {
               // update prompt winners array
               db.collection("prompts").doc(prompt.id).update({ "winners": admin.firestore.FieldValue.arrayUnion(winningSub.id) });
            });
         });
      });
   });

   // randomly select a page number from 1 to 20
   let pageNum = Math.floor(Math.random() * 20) + 1;

   // add new prompts from unsplash to db, set status to "thisweek"
   request(
      `https://api.unsplash.com/collections/featured?page=${pageNum}&per_page=3&client_id=a2e61cfb25649bf508835bb5dcded3701a65033ede47fd307f6adfc23acaaf8c`,
      (error, response, body) => {
         if (!error && response.statusCode === 200) {
            JSON.parse(body).forEach(e => {
               console.log(e["title"]);
               console.log(e["cover_photo"]["urls"]["regular"]);

               db.collection("prompts")
                  .add({
                     title: e["title"],
                     coverUrl: e["cover_photo"]["urls"]["regular"],
                     entryDate: new Date().getTime(),
                     deadline: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
                     submissions: [],
                     status: "thisweek",
                     winners: []
                  })
                  .then(docRef => {
                     console.log("Prompt \"" + e["title"] + "\" added! Document ID: " + docRef.id);
                     return null;
                  })
                  .catch(error => {
                     console.error("Error writing document: ", error);
                  });
            });

            // res.json(JSON.parse(body));
            res.redirect("/Admin.html");
         } else {
            res.send(error);
         }
      }
   );
});

// Handle passing uId from Search to Prompt
app.post("/select-user", (req, res) => {
  let uid = req.body.userId;
  res.redirect(
    url.format({
      pathname: "/OtherProfile.html",
      query: {
        uid: uid
      }
    })
  );
});

// Handle passing promptId from Discover to Prompt
app.post("/select-prompt", (req, res) => {
  let pid = req.body.promptId;
  res.redirect(
    url.format({
      pathname: "/Prompt.html",
      query: {
        pid: pid
      }
    })
  );
});

// Handle passing promptId from Prompt to Submission
app.post("/pass-prompt", (req, res) => {
  let pid = req.body.promptId;
  res.redirect(
    url.format({
      pathname: "/Submission.html",
      query: {
        pid: pid
      }
    })
  );
});

// submit photos to firebase storage
// https://firebase.google.com/docs/storage/web/start
var bucket = admin.storage().bucket();

// Write submission to db
app.post("/submit-form", (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  // This object will accumulate all the fields, keyed by their name
  const fields = {};
  // This object will accumulate all the uploaded files, keyed by their name.
  const uploads = {};

  // This code will process each non-file field in the form.
  busboy.on("field", (fieldname, val) => {
    console.log(`Processed field ${fieldname}: ${val}.`);
    fields[fieldname] = val;
  });

  // This code will process each file uploaded.
  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(`Processed file ${filename}`);
    if (mimetype.includes("image") && filename) {
      let fileExt = mimetype.replace("image/", "");
      let imageName = fields["uid"] + "." + fileExt;
      let tempImgUrl = "submissions/" + fields["promptId"] + "/" + imageName;
      let bucketFile = bucket.file(tempImgUrl);
      file.pipe(
        bucketFile.createWriteStream({ metadata: { contentType: mimetype } })
      );
      uploads[fieldname] = tempImgUrl;
    }
  });

  // Triggered once all uploaded files are processed by Busboy.
  // We still need to wait for the disk writes (saves) to complete.
  busboy.on("finish", () => {
    db.collection("submissions")
      .add({
        candidateId: fields["uid"],
        promptId: fields["promptId"],
        title: fields["title"],
        description: fields["desc"],
        file: uploads["document"],
        entryDate: new Date().getTime(),
        evaluations: []
      })
      .then(docRef => {
        console.log("Submission added! Document ID: ", docRef.id);

        // Push submissionId to array of submissions in the corresponding user.
        db.collection("users")
          .doc(fields["uid"])
          .update({
            submissions: admin.firestore.FieldValue.arrayUnion(docRef.id)
          });

        // Push submissionId to array of submissions in the corresponding prompt.
        db.collection("prompts")
          .doc(fields["promptId"])
          .update({
            submissions: admin.firestore.FieldValue.arrayUnion(docRef.id)
          });
        // redirect to prompts page
        res.redirect(
          url.format({
            pathname: "/Prompt.html",
            query: {
              pid: fields["promptId"]
            }
          })
        );

        return null;
      })
      .catch(error => {
        console.error("Error writing document: ", error);
        res.redirect("/Submission.html");
      });
  });

  busboy.end(req.rawBody);
});

// Handle passing candidateId from Prompt to Evaluate
app.post("/evaluate-prompt", (req, res) => {
  console.log(req.body);
  let evalInfo = req.body.evalInfo;
  console.log(evalInfo);
  res.redirect(
    url.format({
      pathname: "/Evaluate.html",
      query: {
        evalInfo: evalInfo,
        subId: req.body.subId
      }
    })
  );
});

app.post("/submit-evaluation", (req, res) => {
  console.log(req.body);
  const busboy = new Busboy({ headers: req.headers });
  // This object will accumulate all the fields, keyed by their name
  const fields = {};
  // This object will accumulate all the uploaded files, keyed by their name.
  const uploads = {};

  // This code will process each non-file field in the form.
  busboy.on("field", (fieldname, val) => {
    console.log(`Processed field ${fieldname}: ${val}.`);
    fields[fieldname] = val;
  });

  // Triggered once all uploaded files are processed by Busboy.
  // We still need to wait for the disk writes (saves) to complete.
  busboy.on("finish", () => {
    let newDocRef = db.collection("evaluations").doc();
    newDocRef
      .set({
        userId: fields["uid"],
        submissionId: fields["subId"],
        promptId: fields["promptId"],
        overallScore: fields["overallScore"],
        originality: fields["originalityScore"],
        technique: fields["techniqueScore"],
        theme: fields["themeScore"],
        interpretation: fields["interpretation"],
        entryDate: fields["date"]
      })
      .then(whatever => {
        db.collection("submissions")
          .doc(fields["subId"])
          .update({
            evaluations: admin.firestore.FieldValue.arrayUnion(newDocRef.id)
          });
        // redirect to prompts page
        res.redirect(
          url.format({
            pathname: "/Prompt.html",
            query: {
              pid: fields["promptId"]
            }
          })
        );

        return null;
      })
      .catch(error => console.log(error));
  });

  busboy.end(req.rawBody);
});

//Handle edit profile
app.post("/update-profile", (req, res) => {
  console.log(req.body);
  const busboy = new Busboy({ headers: req.headers });
  // This object will accumulate all the fields, keyed by their name
  const fields = {};

  // This code will process each non-file field in the form.
  busboy.on("field", (fieldname, val) => {
    console.log(`Processed field ${fieldname}: ${val}.`);
    fields[fieldname] = val;
  });

  // Triggered once all uploaded files are processed by Busboy.
  // We still need to wait for the disk writes (saves) to complete.
  busboy.on("finish", () => {
    let newDocRef = db.collection("users").doc(fields["uid"]);
    newDocRef
      .update({
        alias: fields["alias"],
        name: fields["name"],
        ig: fields["ig"],
        email: fields["email"],
        portfolio: fields["portfolio"]
      })
      .then(docRef => {
        // redirect to prompts page
        res.redirect(
          url.format({
            pathname: "/Profile.html",
            query: {
              uid: fields["uid"]
            }
          })
        );

        return null;
      })
      .catch(error => {
        console.error("Error writing document: ", error);
      });
  });

  busboy.end(req.rawBody);
});

exports.app = functions.https.onRequest(app);
