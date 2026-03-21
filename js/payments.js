import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let organizers = [];
let locations = [];
let courses = [];
let students = [];

let feesMap = {};
let paymentsMap = {};

let currentPayment = {};

init();

// =====================
// INIT
// =====================
async function init() {
  await loadData();
  fillOrganizers();
  loadGrid();
}

// =====================
// CARGA DATA
// =====================
async function loadData() {

  const orgSnap = await getDocs(collection(db, "organizers"));
  const locSnap = await getDocs(collection(db, "locations"));
  const courseSnap = await getDocs(collection(db, "courses"));
  const studentSnap = await getDocs(collection(db, "students"));

  organizers = orgSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  locations = locSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  courses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  students = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// =====================
// FILTROS
// =====================
function fillOrganizers() {
  const sel = document.getElementById("filter-organizer");

  sel.innerHTML = "<option value=''>Organizador</option>";
  organizers.forEach(o => {
    sel.innerHTML += `<option value="${o.id}">${o.name}</option>`;
  });
}

window.onOrganizerChange = () => {
  const orgId = document.getElementById("filter-organizer").value;

  const sel = document.getElementById("filter-location");
  sel.innerHTML = "<option value=''>Sede</option>";

  locations
    .filter(l => l.organizerId === orgId)
    .forEach(l => {
      sel.innerHTML += `<option value="${l.id}">${l.name}</option>`;
    });
};

window.onLocationChange = () => {
  const locId = document.getElementById("filter-location").value;

  const sel = document.getElementById("filter-course");
  sel.innerHTML = "<option value=''>Curso</option>";

  courses
    .filter(c => c.locationId === locId)
    .forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
};

window.onCourseChange = () => {
  const sel = document.getElementById("filter-student");
  sel.innerHTML = "<option value=''>Alumno</option>";

  students.forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });
};

// =====================
// GRID
// =====================
window.loadGrid = async () => {

  const head = document.getElementById("payments-head");
  const body = document.getElementById("payments-body");

  // HEADER
  let headerHtml = "<tr><th>Alumno</th>";
  for (let m = 1; m <= 12; m++) {
    headerHtml += `<th>${m}</th>`;
  }
  headerHtml += "</tr>";
  head.innerHTML = headerHtml;

  body.innerHTML = "";

  const enrollSnap = await getDocs(collection(db, "enrollments"));
  const studentsSnap = await getDocs(collection(db, "students"));
  const paymentsSnap = await getDocs(collection(db, "payments"));
  const feesSnap = await getDocs(collection(db, "course_fees"));

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

  let bodyHtml = "";

  enrollSnap.forEach(docSnap => {

    const e = docSnap.data();
    const student = studentsMap[e.studentId];
    if (!student) return;

    let row = `<tr><td>${student.name} ${student.lastname}</td>`;

    for (let m = 1; m <= 12; m++) {

      const payment = paymentsMap[`${docSnap.id}_${m}`];

      row += `
        <td onclick="openPaymentModal('${docSnap.id}', ${m})">
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
// CELDA
// =====================
function renderCell(enrollmentId, courseId, month, payment) {

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const year = now.getFullYear();

  const fee = feesMap[`${courseId}_${month}_${year}`];
  if (!fee || !fee.dueDate) return "";

  const dueDate = new Date(fee.dueDate);

  if (payment) {

    const paymentDate = new Date(payment.paymentDate);

    if (paymentDate <= dueDate) {
      return `<span style="background:#22c55e;color:white;padding:4px 7px;border-radius:6px;">✔</span>`;
    }

    return `<span style="background:#ef4444;color:white;padding:4px 7px;border-radius:6px;">✔</span>`;
  }

  if (month < currentMonth && now > dueDate) {
    return `<span style="color:red;">●</span>`;
  }

  if (month === currentMonth && now > dueDate) {
    return `<span style="color:orange;">●</span>`;
  }

  return "";
}

// =====================
// MODAL
// =====================
window.openPaymentModal = (enrollmentId, month) => {

  currentPayment = { enrollmentId, month };

  const key = `${enrollmentId}_${month}`;
  const existing = paymentsMap[key];

  // 🧠 SI EXISTE → CARGAR DATOS
  if (existing) {
    document.getElementById("pay-date").value = existing.paymentDate?.substring(0,10) || "";
    document.getElementById("pay-method").value = existing.method || "Efectivo";
    document.getElementById("pay-amount").value = existing.amount || "";
    document.getElementById("pay-ref").value = existing.reference || "";

    currentPayment.id = existing.id; // 👈 IMPORTANTE
  } else {
    // 🧼 LIMPIAR FORM
    document.getElementById("pay-date").value = "";
    document.getElementById("pay-method").value = "Efectivo";
    document.getElementById("pay-amount").value = "";
    document.getElementById("pay-ref").value = "";

    currentPayment.id = null;
  }

  document.getElementById("payment-modal").style.display = "flex";
};

window.closeModal = () => {
  document.getElementById("payment-modal").style.display = "none";
};

window.savePayment = async () => {

  await addDoc(collection(db, "payments"), {
    ...currentPayment,
    paymentDate: document.getElementById("pay-date").value,
    method: document.getElementById("pay-method").value,
    amount: parseFloat(document.getElementById("pay-amount").value),
    reference: document.getElementById("pay-ref").value
  });

  closeModal();
  loadGrid();
};
