import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const YEAR = new Date().getFullYear();

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const orgSel = document.getElementById("filter-organizer");
const locSel = document.getElementById("filter-location");
const courseSel = document.getElementById("filter-course");
const studentSel = document.getElementById("filter-student");

const head = document.getElementById("payments-head");
const body = document.getElementById("payments-body");

// =====================
// LOAD ORGANIZERS
// =====================
async function loadOrganizers() {
  const snap = await getDocs(collection(db, "organizers"));

  orgSel.innerHTML = "<option value=''>Organizador</option>";

  snap.forEach(d => {
    orgSel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
  });
}

// =====================
// LOAD LOCATIONS (desde cursos)
// =====================
orgSel.addEventListener("change", async () => {

  const coursesSnap = await getDocs(collection(db, "courses"));

  const locationsSet = new Set();

  locSel.innerHTML = "<option value=''>Sede</option>";

  coursesSnap.forEach(d => {
    const c = d.data();

    if (c.organizerId === orgSel.value) {
      locationsSet.add(c.locationId);
    }
  });

  // traer nombres reales
  const locSnap = await getDocs(collection(db, "locations"));

  locSnap.forEach(l => {
    if (locationsSet.has(l.id)) {
      locSel.innerHTML += `<option value="${l.id}">${l.data().name}</option>`;
    }
  });
});

// =====================
// LOAD COURSES
// =====================
locSel.addEventListener("change", async () => {

  const snap = await getDocs(collection(db, "courses"));

  courseSel.innerHTML = "<option value=''>Curso</option>";

  snap.forEach(d => {
    const c = d.data();

    if (
      c.organizerId === orgSel.value &&
      c.locationId === locSel.value
    ) {
      courseSel.innerHTML += `<option value="${d.id}">${c.name}</option>`;
    }
  });
});

// =====================
// LOAD STUDENTS + GRID
// =====================
courseSel.addEventListener("change", async () => {

  const enrollSnap = await getDocs(
    query(collection(db, "enrollments"), where("courseId", "==", courseSel.value))
  );

  const studentsSnap = await getDocs(collection(db, "students"));

  const studentsMap = {};
  studentsSnap.forEach(d => {
    const s = d.data();
    studentsMap[d.id] = `${s.name} ${s.lastName}`;
  });

  studentSel.innerHTML = "<option value=''>Alumno</option>";

  enrollSnap.forEach(e => {
    const data = e.data();
    studentSel.innerHTML += `
      <option value="${e.id}">
        ${studentsMap[data.studentId]}
      </option>
    `;
  });

  loadGrid();
});

// =====================
// GRID
// =====================
async function loadGrid() {

  const enrollSnap = await getDocs(
    query(collection(db, "enrollments"), where("courseId", "==", courseSel.value))
  );

  const paymentsSnap = await getDocs(collection(db, "payments"));
  const studentsSnap = await getDocs(collection(db, "students"));

  const studentsMap = {};
  studentsSnap.forEach(d => {
    const s = d.data();
    studentsMap[d.id] = `${s.name} ${s.lastName}`;
  });

  const paymentsMap = {};
  paymentsSnap.forEach(d => {
    const p = d.data();
    paymentsMap[`${p.enrollmentId}_${p.month}_${p.year}`] = true;
  });

  // HEADER
  let headerHTML = "<tr><th>Alumno</th>";

  MONTHS.forEach(m => {
    headerHTML += `<th>${m}</th>`;
  });

  headerHTML += "</tr>";
  head.innerHTML = headerHTML;

  // BODY
  body.innerHTML = "";

  enrollSnap.forEach(docSnap => {
    const e = docSnap.data();

    let row = `<tr><td>${studentsMap[e.studentId]}</td>`;

    for (let m = 1; m <= 12; m++) {

      const key = `${docSnap.id}_${m}_${YEAR}`;
      const checked = paymentsMap[key];

      row += `
        <td>
          <input type="checkbox"
            ${checked ? "checked" : ""}
            onchange="togglePayment('${docSnap.id}', ${m})"
          >
        </td>
      `;
    }

    row += "</tr>";
    body.innerHTML += row;
  });
}

// =====================
// TOGGLE
// =====================
window.togglePayment = async (enrollmentId, month) => {

  await addDoc(collection(db, "payments"), {
    enrollmentId,
    month,
    year: YEAR,
    status: "Pagado",
    createdAt: new Date()
  });

  loadGrid();
};

// INIT
loadOrganizers();
