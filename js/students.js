import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  attachDateInputFormatting,
  toDisplayDate,
  toStorageDate
} from "./date-utils.js";

// ELEMENTOS
const idInput = document.getElementById("student-id");
const nameInput = document.getElementById("student-name");
const lastNameInput = document.getElementById("student-lastname");
const phoneInput = document.getElementById("student-phone");
const emailInput = document.getElementById("student-email");
const addressInput = document.getElementById("student-address");
const birthInput = document.getElementById("student-birth");
const statusInput = document.getElementById("student-status");
const notesInput = document.getElementById("student-notes");

const saveBtn = document.getElementById("save-student");
const listBox = document.querySelector(".box:last-child");

attachDateInputFormatting(birthInput);

// GUARDAR / EDITAR
saveBtn.addEventListener("click", async () => {
  const birth = birthInput.value ? toStorageDate(birthInput.value) : "";
  if (birthInput.value && !birth) return alert("Ingresar fecha en formato DD/MM/YYYY");

  const data = {
    name: nameInput.value,
    lastName: lastNameInput.value,
    phone: phoneInput.value,
    email: emailInput.value,
    address: addressInput.value,
    birth,
    status: statusInput.value,
    notes: notesInput.value,
    createdAt: new Date()
  };

  if (!data.name) return alert("Completar nombre");

  if (idInput.value) {
    await updateDoc(doc(db, "students", idInput.value), data);
  } else {
    await addDoc(collection(db, "students"), data);
  }

  resetForm();
  loadStudents();
});

// LISTAR
async function loadStudents() {
  const snap = await getDocs(collection(db, "students"));

  listBox.innerHTML = "<h3>Alumnos</h3>";

  snap.forEach(docSnap => {
    const s = docSnap.data();

    listBox.innerHTML += `
      <div class="course-item">
        <div>
          <strong>${s.name} ${s.lastName}</strong>
          <p>${s.phone || ""} · ${s.status}</p>
        </div>
        <div>
          <button onclick="editStudent('${docSnap.id}')">✏️</button>
          <button onclick="deleteStudent('${docSnap.id}')">🗑</button>
        </div>
      </div>
    `;
  });
}

// EDITAR
window.editStudent = async (id) => {
  const snap = await getDocs(collection(db, "students"));

  snap.forEach(docSnap => {
    if (docSnap.id === id) {
      const s = docSnap.data();

      idInput.value = id;
      nameInput.value = s.name;
      lastNameInput.value = s.lastName;
      phoneInput.value = s.phone;
      emailInput.value = s.email;
      addressInput.value = s.address;
      birthInput.value = toDisplayDate(s.birth);
      statusInput.value = s.status;
      notesInput.value = s.notes;
    }
  });
};

// ELIMINAR
window.deleteStudent = async (id) => {
  if (!confirm("Eliminar alumno?")) return;
  await deleteDoc(doc(db, "students", id));
  loadStudents();
};

// RESET
function resetForm() {
  document.querySelectorAll("input, textarea").forEach(i => i.value = "");
  idInput.value = "";
}

// INIT
loadStudents();
