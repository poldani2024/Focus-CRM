import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const courseFilter = document.getElementById("filter-course");
const head = document.getElementById("payments-head");
const body = document.getElementById("payments-body");

const YEAR = new Date().getFullYear();

// LOAD COURSES
async function loadCourses() {
  const snap = await getDocs(collection(db, "courses"));

  courseFilter.innerHTML = "<option value=''>Seleccionar</option>";

  snap.forEach(doc => {
    courseFilter.innerHTML += `
      <option value="${doc.id}">${doc.data().name}</option>
    `;
  });
}

courseFilter.addEventListener("change", loadGrid);

// LOAD GRID
async function loadGrid() {

  const courseId = courseFilter.value;
  if (!courseId) return;

  // ENROLLMENTS
  const enrollSnap = await getDocs(
    query(collection(db, "enrollments"), where("courseId", "==", courseId))
  );

  // STUDENTS
  const studentsSnap = await getDocs(collection(db, "students"));
  const studentsMap = {};
  studentsSnap.forEach(d => {
    const s = d.data();
    studentsMap[d.id] = `${s.name} ${s.lastName}`;
  });

  // PAYMENTS
  const paymentsSnap = await getDocs(collection(db, "payments"));
  const paymentsMap = {};

  paymentsSnap.forEach(d => {
    const p = d.data();
    const key = `${p.enrollmentId}_${p.month}_${p.year}`;
    paymentsMap[key] = p;
  });

  // HEADER
  head.innerHTML = "<tr><th>Alumno</th>";

  for (let m = 1; m <= 12; m++) {
    head.innerHTML += `<th>${m}</th>`;
  }

  head.innerHTML += "</tr>";

  // BODY
  body.innerHTML = "";

  enrollSnap.forEach(docSnap => {
    const e = docSnap.data();

    let row = `<tr><td>${studentsMap[e.studentId]}</td>`;

    for (let m = 1; m <= 12; m++) {

      const key = `${docSnap.id}_${m}_${YEAR}`;
      const paid = paymentsMap[key];

      row += `
        <td>
          <input type="checkbox"
            ${paid ? "checked" : ""}
            onchange="togglePayment('${docSnap.id}', ${m})"
          >
        </td>
      `;
    }

    row += "</tr>";
    body.innerHTML += row;
  });
}

// TOGGLE PAGO
window.togglePayment = async (enrollmentId, month) => {

  const keyQuery = query(
    collection(db, "payments"),
    where("enrollmentId", "==", enrollmentId),
    where("month", "==", month),
    where("year", "==", YEAR)
  );

  const snap = await getDocs(keyQuery);

  if (snap.empty) {
    // CREAR
    await addDoc(collection(db, "payments"), {
      enrollmentId,
      month,
      year: YEAR,
      status: "Pagado",
      createdAt: new Date()
    });
  } else {
    // (simple MVP: no borrar, podrías eliminar después)
    alert("Ya registrado");
  }
};

// INIT
loadCourses();
