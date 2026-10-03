// import { auth, db } from "../firebase-config.js";
// import { 
//     createUserWithEmailAndPassword, 
//     signInWithEmailAndPassword, 
//     GoogleAuthProvider, 
//     signInWithPopup 
// } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// const signUpForm = document.getElementById('signUpForm');
// const signInForm = document.getElementById('signInForm');
// const googleSignInBtn = document.getElementById('googleSignInBtn');
// const errorBox = document.getElementById('errorBox');

// function showError(message) {
//     if (errorBox) {
//         errorBox.style.display = 'block';
//         errorBox.textContent = message;
//     }
// }

// // Sign Up Handler
// if (signUpForm) {
//     signUpForm.addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const fullName = document.getElementById('fullName').value;
//         const email = document.getElementById('email').value;
//         const password = document.getElementById('password').value;

//         try {
//             const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//             const user = userCredential.user;

//             // Save user profile in Firestore
//             await setDoc(doc(db, "users", user.uid), {
//                 fullName: fullName,
//                 email: email,
//                 createdAt: new Date().toISOString()
//             });

//             // Persist session in localStorage
//             localStorage.setItem('kolorise_user', JSON.stringify({ uid: user.uid, email: email, name: fullName }));

//             // Redirect to home/dashboard
//             window.location.href = '../index.html';
//         } catch (error) {
//             showError(error.message);
//         }
//     });
// }

// // Sign In Handler
// if (signInForm) {
//     signInForm.addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const email = document.getElementById('email').value;
//         const password = document.getElementById('password').value;

//         try {
//             const userCredential = await signInWithEmailAndPassword(auth, email, password);
//             const user = userCredential.user;

//             // Fetch user name from Firestore if available
//             let fullName = user.displayName || "";
//             const userDoc = await getDoc(doc(db, "users", user.uid));
//             if (userDoc.exists()) {
//                 fullName = userDoc.data().fullName || fullName;
//             }

//             // Persist session in localStorage
//             localStorage.setItem('kolorise_user', JSON.stringify({ uid: user.uid, email: user.email, name: fullName }));

//             // Redirect to home/dashboard
//             window.location.href = '../index.html';
//         } catch (error) {
//             showError(error.message);
//         }
//     });
// }

// // Google Sign In / Sign Up Handler
// if (googleSignInBtn) {
//     googleSignInBtn.addEventListener('click', async () => {
//         const provider = new GoogleAuthProvider();
//         try {
//             const result = await signInWithPopup(auth, provider);
//             const user = result.user;

//             // Check if user already exists in Firestore, if not create record
//             const userRef = doc(db, "users", user.uid);
//             const userSnap = await getDoc(userRef);

//             if (!userSnap.exists()) {
//                 await setDoc(userRef, {
//                     fullName: user.displayName || "KoloRise User",
//                     email: user.email,
//                     createdAt: new Date().toISOString()
//                 });
//             }

//             const userData = userSnap.exists() ? userSnap.data() : { fullName: user.displayName };

//             // Persist session in localStorage
//             localStorage.setItem('kolorise_user', JSON.stringify({ 
//                 uid: user.uid, 
//                 email: user.email, 
//                 name: userData.fullName || user.displayName 
//             }));

//             // Redirect to home/dashboard
//             window.location.href = '../index.html';
//         } catch (error) {
//             showError(error.message);
//         }
//     });
// }