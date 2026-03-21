import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ELEMENTOS
const organizerSelect = document.getElementById("course-organizer");
const locationSelect = document.getElementById("course-location");
const nameInput = document.getElementById("course-name");
const descInput = document.getElementById("course-description");
const hoursInput = document.getElementById("course-hours");
const startInput = document.getElementById("course-start");
const endInput = document.getElementById("course-end");
const priceInput = document.getElementById("course-price");
const statusSelect = document.getElementById("course-status");
const idInput = document.getElementById("course-id");
const saveBtn = document.getElementById("save-course");

const listBox = document.querySelector(".box:last-child");

// CARGAR SELECTS
async function loadSelectors() {
  // ORGANIZADORES
  const orgSnap = await getDocs(collection(db, "organizers"));
  organizerSelect.innerHTML = "<option value=''>Seleccionar</option>";

  orgSnap.forEach(docSnap => {
    organizerSelect.innerHTML += `
      <option value="${docSnap.id}">${docSnap.data().name}</option>
    `;
  });

  // SEDES
  const locSnap = await getDocs(collection(db, "locations"));
  locationSelect.innerHTML = "<option value=''>Seleccionar</option>";

  locSnap.forEach(docSnap => {
    locationSelect.innerHTML += `
      <option value="${docSnap.id}">${docSnap.data().name}</option>
    `;
  });
}

// OBTENER DÍAS
function getDays() {
  const checks = document.querySelectorAll(".days input:checked");
  return Array.from(checks).map(c => c.value);
}

// GUARDAR / EDITAR
saveBtn.addEventListener("click", async () => {

  const data = {
    organizerId: organizerSelect.value,
    locationId: locationSelect.value,
    name: nameInput.value,
    description: descInput.value,
    hours: hoursInput.value,
    days: getDays(),
    start: startInput.value,
    end: endInput.value,
    price: priceInput.value,
    status: statusSelect.value,
    createdAt: new Date()
  };

  if (!data.name) return alert("Completar nombre");

  if (idInput.value) {
    await updateDoc(doc(db, "courses", idInput.value), data);
  } else {
    await addDoc(collection(db, "courses"), data);
  }

  resetForm();
  loadCourses();
});

// LISTAR
async function loadCourses() {
  const snap = await getDocs(collection(db, "courses"));

  listBox.innerHTML = "<h3>Cursos</h3>";

  snap.forEach(docSnap => {
    const c = docSnap.data();

    listBox.innerHTML += `
      <div class="course-item">
        <div>
          <strong>${c.name}</strong>
          <p>${c.days?.join(", ")} · ${c.status}</p>
        </div>
        <div>
          <button onclick="editCourse('${docSnap.id}')">✏️</button>
          <button onclick="deleteCourse('${docSnap.id}')">🗑</button>
        </div>
      </div>
    `;
  });
}

// EDITAR
window.editCourse = async (id) => {
  const snap = await getDocs(collection(db, "courses"));

  snap.forEach(docSnap => {
    if (docSnap.id === id) {
      const c = docSnap.data();

      idInput.value = id;
      organizerSelect.value = c.organizerId;
      locationSelect.value = c.locationId;
      nameInput.value = c.name;
      descInput.value = c.description;
      hoursInput.value = c.hours;
      startInput.value = c.start;
      endInput.value = c.end;
      priceInput.value = c.price;
      statusSelect.value = c.status;

      // días
      document.querySelectorAll(".days input").forEach(ch => {
        ch.checked = c.days?.includes(ch.value);
      });
    }
  });
};

// ELIMINAR
window.deleteCourse = async (id) => {
  if (!confirm("Eliminar curso?")) return;
  await deleteDoc(doc(db, "courses", id));
  loadCourses();
};

// RESET
function resetForm() {
  document.querySelectorAll("input, textarea").forEach(i => i.value = "");
  document.querySelectorAll(".days input").forEach(i => i.checked = false);
  idInput.value = "";
}

// INIT
loadSelectors();
loadCourses();
