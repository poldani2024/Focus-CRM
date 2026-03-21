import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const YEAR = new Date().getFullYear();

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// SELECTS
const orgSel = document.getElementById("filter-organizer");
const locSel = document.getElementById("filter-location");
const courseSel = document.getElementById("filter-course");
const studentSel = document.getElementById("filter-student");

// GRID
const head = document.getElementById("payments-head");
const body = document.getElementById("payments-body");

// =====================
// INIT
// =====================
loadOrganizers();

// =====================
// ORGANIZADORES
// =====================
async function loadOrganizers() {
  const snap = await getDocs(collection(db, "organizers"));

  orgSel.innerHTML = "<option value=''>Organizador</option>";

  snap.forEach(d => {
    orgSel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
  });
}

// =====================
// SEDES
// =====================
orgSel.addEventListener("change", async () => {

  const coursesSnap = await getDocs(collection(db, "courses"));
  const locationsSet = new Set();

  coursesSnap.forEach(d => {
    const c = d.data();
    if (c.organizerId === orgSel.value) {
      locationsSet.add(c.locationId);
    }
  });

  const locSnap = await getDocs(collection(db, "locations"));

  locSel.innerHTML = "<option value=''>Sede</option>";

  locSnap.forEach(l => {
    if (locationsSet.has(l.id)) {
      locSel.innerHTML += `<option value="${l.id}">${l.data().name}</option>`;
    }
  });

  courseSel.innerHTML = "<option value=''>Curso</option>";
  studentSel.innerHTML = "<option value=''>Alumno</option>";
});

// =====================
// CURSOS
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

  studentSel.innerHTML = "<option value=''>Alumno</option>";
});

// =====================
// ALUMNOS + GRID
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
    paymentsMap[`${p.enrollmentId}_${p.month}_${p.year}`] = {
      id: d.id,
      ...p
    };
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
      const payment = paymentsMap[key];

      row += `
        <td onclick="handlePaymentClick('${docSnap.id}', ${m})"
            style="cursor:pointer;">
          ${payment ? "✔" : ""}
        </td>
      `;
    }

    row += "</tr>";
    body.innerHTML += row;
  });
}

// =====================
// CLICK EN CELDA
// =====================
window.handlePaymentClick = async (enrollmentId, month) => {

  const q = query(
    collection(db, "payments"),
    where("enrollmentId", "==", enrollmentId),
    where("month", "==", month),
    where("year", "==", YEAR)
  );

  const snap = await getDocs(q);

  // 👉 YA EXISTE → eliminar
  if (!snap.empty) {
    if (confirm("¿Eliminar pago?")) {
      await deleteDoc(doc(db, "payments", snap.docs[0].id));
      loadGrid();
    }
    return;
  }

  // 👉 NO EXISTE → abrir modal
  document.getElementById("modal-enrollment").value = enrollmentId;
  document.getElementById("modal-month").value = month;

  document.getElementById("modal-date").value =
    new Date().toISOString().split("T")[0];

  document.getElementById("modal-amount").value = "";

  document.getElementById("payment-modal").classList.remove("hidden");
};

// =====================
// MODAL
// =====================
window.closeModal = () => {
  document.getElementById("payment-modal").classList.add("hidden");
};

window.savePayment = async () => {

  const enrollmentId = document.getElementById("modal-enrollment").value;
  const month = parseInt(document.getElementById("modal-month").value);

  const paymentDate = document.getElementById("modal-date").value;
  const method = document.getElementById("modal-method").value;
  const amount = parseFloat(document.getElementById("modal-amount").value);
  const receipt = document.getElementById("modal-receipt").value;

  if (!amount || !paymentDate) {
    return alert("Completar datos");
  }

  await addDoc(collection(db, "payments"), {
    enrollmentId,
    month,
    year: YEAR,
    paymentDate,
    method,
    amount,
    receiptNumber: receipt,
    status: "Pagado",
    createdAt: new Date()
  });

  closeModal();
  loadGrid();
};
