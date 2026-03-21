import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const input = document.querySelector("input");
const btn = document.querySelector(".btn-primary");
const list = document.querySelector(".box:last-child");

btn.addEventListener("click", async () => {
  const name = input.value;

  if (!name) return alert("Completar nombre");

  await addDoc(collection(db, "organizers"), {
    name,
    status: "Activo",
    createdAt: new Date()
  });

  input.value = "";
  load();
});

async function load() {
  const snapshot = await getDocs(collection(db, "organizers"));

  list.innerHTML = "<h3>Listado</h3>";

  snapshot.forEach(doc => {
    const data = doc.data();

    list.innerHTML += `
      <div class="course-item">
        <strong>${data.name}</strong>
        <span class="tag green">${data.status}</span>
      </div>
    `;
  });
}

load();
