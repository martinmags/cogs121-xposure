// Initialize Cloud Firestore through Firebase
firebase.initializeApp({
  apiKey: "AIzaSyC6FPXu3_bOHpHr7AelgBKAMbGiIUPZ2Vo",
  authDomain: "pandaexpressjs.firebaseapp.com",
  projectId: "pandaexpressjs"
});

var db = firebase.firestore();

$(document).ready( () => {
  db.collection("submissions").get(). then((querySnapshot) => {
    let imageArray = [];
    querySnapshot.forEach( (doc) =>{
      imageArray.push(doc.data().file);
    });
    console.log(imageArray);
  }).catch((error) => {
    console.error("Error: ", error);
  });
});