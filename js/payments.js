import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const YEAR = new Date().getFullYear();

const orgSel = document.getElementById("filter-organizer");
const locSel = document.getElementById("filter-location");
const courseSel = document.getElementById("filter-course");
const studentSel = document.getElementById("filter-student");

const head = document.getElementById("payments-head");
const body = document.getElementById("payments-body");

// =======================
// LOAD ORGANIZERS
// =======================
async function loadOrganizers() {
  const snap = await getDocs(collection(db, "organizers"));
  orgSel.innerHTML = "<option value=''>Organizador</option>";

  snap.forEach(d => {
    orgSel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
  });
}

// =======================
// LOAD LOCATIONS
// =======================
orgSel.addEventListener("change", async () => {
  const snap = await getDocs(collection(db, "courses"));

  locSel.innerHTML = "<option value=''>Sede</option>";

  snap.forEach(d => {
    const c = d.data();
    if (c.organizerId === orgSel.value) {
      locSel.innerHTML += `<option value="${c.locationId}">${c.locationId}</option>`;
    }
  });
});

// =======================
// LOAD COURSES
// =======================
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

// =======================
// LOAD STUDENTS
// =======================
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

// =======================
// GRID
// =======================
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

// =======================
// TOGGLE
// =======================
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
