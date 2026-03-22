import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  attachDateInputFormatting,
  toStorageDate
} from "./date-utils.js";

const studentSelect = document.getElementById("enroll-student");
const courseSelect = document.getElementById("enroll-course");
const dateInput = document.getElementById("enroll-date");
const statusInput = document.getElementById("enroll-status");
const saveBtn = document.getElementById("save-enroll");

const listBox = document.querySelector(".box:last-child");

attachDateInputFormatting(dateInput);

// 🔥 CARGAR SELECTS
async function loadSelectors() {
  const students = await getDocs(collection(db, "students"));
  studentSelect.innerHTML = "<option value=''>Seleccionar</option>";

  students.forEach(docSnap => {
    const s = docSnap.data();
    studentSelect.innerHTML += `
      <option value="${docSnap.id}">
        ${s.name} ${s.lastName}
      </option>
    `;
  });

  const courses = await getDocs(collection(db, "courses"));
  courseSelect.innerHTML = "<option value=''>Seleccionar</option>";

  courses.forEach(docSnap => {
    const c = docSnap.data();
    courseSelect.innerHTML += `
      <option value="${docSnap.id}">
        ${c.name}
      </option>
    `;
  });
}

// GUARDAR
saveBtn.addEventListener("click", async () => {
  const startDate = dateInput.value ? toStorageDate(dateInput.value) : "";
  if (dateInput.value && !startDate) return alert("Ingresar fecha en formato DD/MM/YYYY");

  const data = {
    studentId: studentSelect.value,
    courseId: courseSelect.value,
    startDate,
    status: statusInput.value,
    createdAt: new Date()
  };

  if (!data.studentId || !data.courseId) {
    return alert("Seleccionar alumno y curso");
  }

  await addDoc(collection(db, "enrollments"), data);

  dateInput.value = "";
  loadEnrollments();
});

// LISTAR
async function loadEnrollments() {
  const enrollSnap = await getDocs(collection(db, "enrollments"));
  const studentsSnap = await getDocs(collection(db, "students"));
  const coursesSnap = await getDocs(collection(db, "courses"));

  const studentsMap = {};
  studentsSnap.forEach(d => {
    const s = d.data();
    studentsMap[d.id] = `${s.name} ${s.lastName}`;
  });

  const coursesMap = {};
  coursesSnap.forEach(d => {
    coursesMap[d.id] = d.data().name;
  });

  listBox.innerHTML = "<h3>Inscripciones</h3>";

  enrollSnap.forEach(docSnap => {
    const e = docSnap.data();

    listBox.innerHTML += `
      <div class="course-item">
        <div>
          <strong>${studentsMap[e.studentId]}</strong>
          <p>${coursesMap[e.courseId]} · ${e.status}</p>
        </div>
        <button onclick="deleteEnroll('${docSnap.id}')">🗑</button>
      </div>
    `;
  });
}

// ELIMINAR
window.deleteEnroll = async (id) => {
  if (!confirm("Eliminar inscripción?")) return;
  await deleteDoc(doc(db, "enrollments", id));
  loadEnrollments();
};

// INIT
loadSelectors();
loadEnrollments();
