import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const list = document.getElementById("students-list");

async function loadStudents() {
  const querySnapshot = await getDocs(collection(db, "enrollments"));

  list.innerHTML = "";
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const div = document.createElement("div");
    div.innerText = data.studentId + " - " + data.paymentStatus;
    list.appendChild(div);
  });
}

loadStudents();
