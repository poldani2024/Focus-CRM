import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const formBtn = document.querySelector(".btn-primary");
const nameInput = document.querySelector("input[type='text']");
const listContainer = document.querySelector(".box:last-child");

// GUARDAR
formBtn.addEventListener("click", async () => {
  const name = nameInput.value;

  if (!name) return alert("Completar nombre");

  await addDoc(collection(db, "locations"), {
    name,
    status: "Activo",
    createdAt: new Date()
  });

  nameInput.value = "";
  loadLocations();
});

// LISTAR
async function loadLocations() {
  const querySnapshot = await getDocs(collection(db, "locations"));

  listContainer.innerHTML = "<h3>Listado</h3>";

  querySnapshot.forEach(doc => {
    const data = doc.data();

    listContainer.innerHTML += `
      <div class="course-item">
        <strong>${data.name}</strong>
        <span class="tag green">${data.status}</span>
      </div>
    `;
  });
}

loadLocations();
