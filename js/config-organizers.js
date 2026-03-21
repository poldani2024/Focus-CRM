import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const input = document.getElementById("organizer-name");
const idInput = document.getElementById("organizer-id");
const btn = document.getElementById("save-btn");
const list = document.querySelector(".box:last-child");

// GUARDAR / EDITAR
btn.addEventListener("click", async () => {
  const name = input.value;
  const id = idInput.value;

  if (!name) return alert("Completar nombre");

  if (id) {
    await updateDoc(doc(db, "organizers", id), {
      name
    });
  } else {
    await addDoc(collection(db, "organizers"), {
      name,
      status: "Activo",
      createdAt: new Date()
    });
  }

  resetForm();
  load();
});

// LISTAR
async function load() {
  const snapshot = await getDocs(collection(db, "organizers"));

  list.innerHTML = "<h3>Listado</h3>";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    list.innerHTML += `
      <div class="course-item">
        <div>
          <strong>${data.name}</strong>
        </div>
        <div>
          <button onclick="edit('${docSnap.id}', '${data.name}')">✏️</button>
          <button onclick="removeItem('${docSnap.id}')">🗑</button>
        </div>
      </div>
    `;
  });
}

// EDITAR
window.edit = (id, name) => {
  idInput.value = id;
  input.value = name;
};

// ELIMINAR
window.removeItem = async (id) => {
  if (!confirm("Eliminar?")) return;

  await deleteDoc(doc(db, "organizers", id));
  load();
};

// RESET
function resetForm() {
  input.value = "";
  idInput.value = "";
}

load();
