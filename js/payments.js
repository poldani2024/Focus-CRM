import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let organizers = [];
let locations = [];
let courses = [];
let students = [];
let enrollments = [];

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
  fillYears();
  onOrganizerChange();
  loadGrid();
}

// =====================
// HELPERS
// =====================
function parseDate(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function getSelectedFilters() {
  return {
    organizerId: document.getElementById("filter-organizer").value,
    locationId: document.getElementById("filter-location").value,
    courseId: document.getElementById("filter-course").value,
    studentId: document.getElementById("filter-student").value,
    year: Number(document.getElementById("filter-year").value) || new Date().getFullYear()
  };
}

function getCoursesByFilters({ organizerId = "", locationId = "" } = {}) {
  return courses.filter(course => {
    if (organizerId && course.organizerId !== organizerId) return false;
    if (locationId && course.locationId !== locationId) return false;
    return true;
  });
}

function getStudentFullName(student = {}) {
  return [student.name, student.lastName || student.lastname]
    .filter(Boolean)
    .join(" ");
}

// =====================
// CARGA DATA
// =====================
async function loadData() {
  const [
    orgSnap,
    locSnap,
    courseSnap,
    studentSnap,
    enrollSnap,
    paymentsSnap,
    feesSnap
  ] = await Promise.all([
    getDocs(collection(db, "organizers")),
    getDocs(collection(db, "locations")),
    getDocs(collection(db, "courses")),
    getDocs(collection(db, "students")),
    getDocs(collection(db, "enrollments")),
    getDocs(collection(db, "payments")),
    getDocs(collection(db, "course_fees"))
  ]);

  organizers = orgSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  locations = locSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  courses = courseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  students = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  paymentsMap = {};
  paymentsSnap.forEach(d => {
    const payment = d.data();
    const paymentYear = Number(payment.year) || parseDate(payment.paymentDate)?.getFullYear();

    if (!paymentYear) return;

    paymentsMap[`${payment.enrollmentId}_${payment.month}_${paymentYear}`] = {
      id: d.id,
      ...payment,
      year: paymentYear
    };
  });

  feesMap = {};
  feesSnap.forEach(d => {
    const fee = d.data();
    feesMap[`${fee.courseId}_${fee.month}_${fee.year}`] = {
      id: d.id,
      ...fee
    };
  });
}

function fillYears() {
  const sel = document.getElementById("filter-year");
  const currentYear = new Date().getFullYear();
  const yearSet = new Set([currentYear]);

  courses.forEach(course => {
    const startYear = parseDate(course.startDate)?.getFullYear();
    const endYear = parseDate(course.endDate)?.getFullYear();

    if (startYear) yearSet.add(startYear);
    if (endYear) yearSet.add(endYear);
  });

  Object.values(feesMap).forEach(fee => {
    if (fee.year) yearSet.add(Number(fee.year));
  });

  const years = [...yearSet].sort((a, b) => a - b);

  sel.innerHTML = years
    .map(year => `<option value="${year}" ${year === currentYear ? "selected" : ""}>${year}</option>`)
    .join("");
}

// =====================
// FILTROS
// =====================
function fillOrganizers() {
  const sel = document.getElementById("filter-organizer");
  sel.innerHTML = "<option value=''>Organizador</option>";

  organizers.forEach(organizer => {
    sel.innerHTML += `<option value="${organizer.id}">${organizer.name}</option>`;
  });
}

function fillLocations(organizerId = "") {
  const sel = document.getElementById("filter-location");
  const visibleCourses = getCoursesByFilters({ organizerId });
  const locationIds = new Set(visibleCourses.map(course => course.locationId).filter(Boolean));

  const visibleLocations = organizerId
    ? locations.filter(location => locationIds.has(location.id))
    : locations;

  sel.innerHTML = "<option value=''>Sede</option>";

  visibleLocations.forEach(location => {
    sel.innerHTML += `<option value="${location.id}">${location.name}</option>`;
  });
}

function fillCourses(organizerId = "", locationId = "") {
  const sel = document.getElementById("filter-course");
  const visibleCourses = getCoursesByFilters({ organizerId, locationId });

  sel.innerHTML = "<option value=''>Curso</option>";

  visibleCourses.forEach(course => {
    sel.innerHTML += `<option value="${course.id}">${course.name}</option>`;
  });
}

function fillStudents(courseId = "") {
  const sel = document.getElementById("filter-student");
  let visibleStudents = students;

  if (courseId) {
    const studentIds = new Set(
      enrollments
        .filter(enrollment => enrollment.courseId === courseId)
        .map(enrollment => enrollment.studentId)
    );

    visibleStudents = students.filter(student => studentIds.has(student.id));
  }

  sel.innerHTML = "<option value=''>Alumno</option>";

  visibleStudents.forEach(student => {
    sel.innerHTML += `<option value="${student.id}">${getStudentFullName(student)}</option>`;
  });
}

window.onOrganizerChange = () => {
  const organizerId = document.getElementById("filter-organizer").value;
  fillLocations(organizerId);
  fillCourses(organizerId);
  fillStudents();
};

window.onLocationChange = () => {
  const { organizerId } = getSelectedFilters();
  const locationId = document.getElementById("filter-location").value;

  fillCourses(organizerId, locationId);
  fillStudents();
};

window.onCourseChange = () => {
  const courseId = document.getElementById("filter-course").value;
  fillStudents(courseId);
};

// =====================
// GRID
// =====================
window.loadGrid = async () => {
  await loadData();

  const { organizerId, locationId, courseId, studentId, year } = getSelectedFilters();
  const head = document.getElementById("payments-head");
  const body = document.getElementById("payments-body");

  let headerHtml = `<tr><th>Alumno</th><th>Curso</th>`;
  for (let month = 1; month <= 12; month++) {
    headerHtml += `<th>${month}/${year}</th>`;
  }
  headerHtml += "</tr>";
  head.innerHTML = headerHtml;

  const studentsMap = Object.fromEntries(students.map(student => [student.id, student]));
  const coursesMap = Object.fromEntries(courses.map(course => [course.id, course]));

  const filteredEnrollments = enrollments.filter(enrollment => {
    const course = coursesMap[enrollment.courseId];
    if (!course) return false;
    if (organizerId && course.organizerId !== organizerId) return false;
    if (locationId && course.locationId !== locationId) return false;
    if (courseId && enrollment.courseId !== courseId) return false;
    if (studentId && enrollment.studentId !== studentId) return false;
    return true;
  });

  let bodyHtml = "";

  filteredEnrollments.forEach(enrollment => {
    const student = studentsMap[enrollment.studentId];
    const course = coursesMap[enrollment.courseId];
    if (!student || !course) return;

    let row = `<tr><td>${getStudentFullName(student)}</td><td>${course.name || "-"}</td>`;

    for (let month = 1; month <= 12; month++) {
      const payment = paymentsMap[`${enrollment.id}_${month}_${year}`];

      row += `
        <td onclick="openPaymentModal('${enrollment.id}', ${month}, ${year})">
          ${renderCell(enrollment, month, year, payment)}
        </td>
      `;
    }

    row += "</tr>";
    bodyHtml += row;
  });

  body.innerHTML = bodyHtml || "<tr><td colspan='14'>No hay registros para los filtros seleccionados.</td></tr>";
};

// =====================
// CELDA
// =====================
function renderCell(enrollment, month, year, payment) {
  const fee = feesMap[`${enrollment.courseId}_${month}_${year}`];
  if (!fee?.dueDate) return "";

  const now = new Date();
  const dueDate = parseDate(fee.dueDate);
  if (!dueDate) return "";

  if (payment) {
    const paymentDate = parseDate(payment.paymentDate);

    if (paymentDate && paymentDate <= dueDate) {
      return `<span style="background:#22c55e;color:white;padding:4px 7px;border-radius:6px;">✔</span>`;
    }

    return `<span style="background:#ef4444;color:white;padding:4px 7px;border-radius:6px;">✔</span>`;
  }

  if (now > dueDate) {
    const sameMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
    return `<span style="color:${sameMonth ? "orange" : "red"};">●</span>`;
  }

  return "";
}

// =====================
// MODAL
// =====================
window.openPaymentModal = (enrollmentId, month, year) => {
  currentPayment = { enrollmentId, month, year };

  const key = `${enrollmentId}_${month}_${year}`;
  const existing = paymentsMap[key];
  const deleteButton = document.getElementById("delete-payment-btn");

  if (existing) {
    document.getElementById("pay-date").value = existing.paymentDate?.substring(0, 10) || "";
    document.getElementById("pay-method").value = existing.method || "Efectivo";
    document.getElementById("pay-amount").value = existing.amount || "";
    document.getElementById("pay-ref").value = existing.reference || "";
    currentPayment.id = existing.id;
    deleteButton.style.display = "block";
  } else {
    document.getElementById("pay-date").value = "";
    document.getElementById("pay-method").value = "Efectivo";
    document.getElementById("pay-amount").value = "";
    document.getElementById("pay-ref").value = "";
    currentPayment.id = null;
    deleteButton.style.display = "none";
  }

  document.getElementById("payment-modal").style.display = "flex";
};

window.closeModal = () => {
  document.getElementById("payment-modal").style.display = "none";
  document.getElementById("delete-payment-btn").style.display = "none";
};

window.savePayment = async () => {
  const paymentDate = document.getElementById("pay-date").value;
  const amountValue = document.getElementById("pay-amount").value;

  if (!paymentDate) return alert("Ingresar fecha de pago");
  if (!amountValue) return alert("Ingresar monto");

  const data = {
    enrollmentId: currentPayment.enrollmentId,
    month: currentPayment.month,
    year: currentPayment.year,
    paymentDate,
    method: document.getElementById("pay-method").value,
    amount: parseFloat(amountValue),
    reference: document.getElementById("pay-ref").value
  };

  if (currentPayment.id) {
    await updateDoc(doc(db, "payments", currentPayment.id), data);
  } else {
    await addDoc(collection(db, "payments"), data);
  }

  closeModal();
  await loadGrid();
};


window.deletePayment = async () => {
  if (!currentPayment.id) return;

  if (!confirm("¿Eliminar pago cargado?")) return;

  await deleteDoc(doc(db, "payments", currentPayment.id));

  closeModal();
  await loadGrid();
};
