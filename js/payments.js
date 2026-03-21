import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let feesMap = {};
let paymentsMap = {};

loadFilters();

// =====================
// FILTROS
// =====================
async function loadFilters() {

  const orgSnap = await getDocs(collection(db, "organizers"));
  const orgSel = document.getElementById("filter-organizer");

  orgSel.innerHTML = "<option value=''>Organizador</option>";
  orgSnap.forEach(d => {
    orgSel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
  });

  loadGrid();
}

// =====================
// GRID
// =====================
window.loadGrid = async () => {

  const head = document.getElementById("payments-head");
  const body = document.getElementById("payments-body");

  body.innerHTML = "";

  // =====================
  // HEADER (FIX 🔥)
  // =====================
  let headerHtml = "<tr><th>Alumno</th>";

  for (let m = 1; m <= 12; m++) {
    headerHtml += `<th>${m}</th>`;
  }

  headerHtml += "</tr>";

  head.innerHTML = headerHtml;

  // =====================
  // DATA
  // =====================
  const enrollSnap = await getDocs(collection(db, "enrollments"));
  const studentsSnap = await getDocs(collection(db, "students"));
  const paymentsSnap = await getDocs(collection(db, "payments"));
  const feesSnap = await getDocs(collection(db, "course_fees"));

  // =====================
  // MAPAS
  // =====================
  let studentsMap = {};
  studentsSnap.forEach(d => studentsMap[d.id] = d.data());

  paymentsMap = {};
  paymentsSnap.forEach(d => {
    const p = d.data();
    paymentsMap[`${p.enrollmentId}_${p.month}`] = { id: d.id, ...p };
  });

  feesMap = {};
  feesSnap.forEach(d => {
    const f = d.data();
    feesMap[`${f.courseId}_${f.month}_${f.year}`] = f;
  });

  // =====================
  // FILAS
  // =====================
  let bodyHtml = "";

  enrollSnap.forEach(docSnap => {

    const e = docSnap.data();
    const student = studentsMap[e.studentId];

    if (!student) return;

    let row = `<tr><td>${student.name} ${student.lastname}</td>`;

    for (let m = 1; m <= 12; m++) {

      const payment = paymentsMap[`${docSnap.id}_${m}`];

      row += `
        <td onclick="togglePayment('${docSnap.id}', ${m})">
          ${renderCell(docSnap.id, e.courseId, m, payment)}
        </td>
      `;
    }

    row += "</tr>";

    bodyHtml += row;
  });

  body.innerHTML = bodyHtml;
};

// =====================
// RENDER CELDA
// =====================
function renderCell(enrollmentId, courseId, month, payment) {

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const year = now.getFullYear();

  const fee = feesMap[`${courseId}_${month}_${year}`];
  if (!fee || !fee.dueDate) return "";

  const dueDate = new Date(fee.dueDate);

  // =====================
  // ✔ PAGO
  // =====================
  if (payment) {

    const paymentDate = new Date(payment.paymentDate);

    // ✔ en término (VERDE)
    if (paymentDate <= dueDate) {
      return `
        <span style="
          background:#22c55e;
          color:white;
          padding:4px 7px;
          border-radius:6px;
          font-weight:bold;
        ">✔</span>
      `;
    }

    // ✔ fuera de término (ROJO)
    return `
      <span style="
        background:#ef4444;
        color:white;
        padding:4px 7px;
        border-radius:6px;
        font-weight:bold;
      ">✔</span>
    `;
  }

  // =====================
  // DEUDA
  // =====================
  if (month < currentMonth && now > dueDate) {
    return `<span style="color:red;">●</span>`;
  }

  if (month === currentMonth && now > dueDate) {
    return `<span style="color:orange;">●</span>`;
  }

  return "";
}

// =====================
// TOGGLE PAGO SIMPLE
// =====================
window.togglePayment = async (enrollmentId, month) => {

  const key = `${enrollmentId}_${month}`;
  const existing = paymentsMap[key];

  if (existing) {
    await deleteDoc(doc(db, "payments", existing.id));
  } else {
    await addDoc(collection(db, "payments"), {
      enrollmentId,
      month,
      paymentDate: new Date().toISOString()
    });
  }

  loadGrid();
};
