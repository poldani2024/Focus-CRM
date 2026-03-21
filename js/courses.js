import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentCourseId = null;

// =====================
// INIT
// =====================
loadOrganizers();
loadLocations();
loadCourses();

// =====================
// LOAD SELECTS
// =====================
async function loadOrganizers() {
  const snap = await getDocs(collection(db, "organizers"));
  const sel = document.getElementById("course-organizer");

  sel.innerHTML = "<option value=''>Seleccionar</option>";

  snap.forEach(d => {
    sel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
  });
}

async function loadLocations() {
  const snap = await getDocs(collection(db, "locations"));
  const sel = document.getElementById("course-location");

  sel.innerHTML = "<option value=''>Seleccionar</option>";

  snap.forEach(d => {
    sel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
  });
}

// =====================
// GUARDAR
// =====================
window.saveCourse = async () => {

  const data = {
    organizerId: document.getElementById("course-organizer").value,
    locationId: document.getElementById("course-location").value,
    name: document.getElementById("course-name").value,
    startDate: document.getElementById("course-start").value,
    endDate: document.getElementById("course-end").value,
    price: parseFloat(document.getElementById("course-price").value),
    status: document.getElementById("course-status").value,
    createdAt: new Date()
  };

  if (!data.name) return alert("Nombre requerido");

  if (!currentCourseId) {
    await addDoc(collection(db, "courses"), data);
  } else {
    await updateDoc(doc(db, "courses", currentCourseId), data);
  }

  clearForm();
  loadCourses();
};

// =====================
// LISTA
// =====================
async function loadCourses() {

  const snap = await getDocs(collection(db, "courses"));
  const list = document.getElementById("courses-list");

  list.innerHTML = "";

  snap.forEach(d => {
    const c = d.data();

    const name = c.name || "Sin nombre";
    const status = c.status || "Sin estado";

    list.innerHTML += `
      <div class="course-item" onclick="editCourse('${d.id}')">
        <strong>${name}</strong>
        <p>${status}</p>
      </div>
    `;
  });
}

// =====================
// EDITAR
// =====================
window.editCourse = async (id) => {

  const snap = await getDocs(collection(db, "courses"));

  snap.forEach(d => {
    if (d.id === id) {
      const c = d.data();

      currentCourseId = id;

      document.getElementById("course-organizer").value = c.organizerId || "";
      document.getElementById("course-location").value = c.locationId || "";
      document.getElementById("course-name").value = c.name || "";
      document.getElementById("course-start").value = c.startDate || "";
      document.getElementById("course-end").value = c.endDate || "";
      document.getElementById("course-price").value = parseFloat(c.price) || 0;
      document.getElementById("course-status").value = c.status || "Plan";

      loadFees();
    }
  });
};

// =====================
// LIMPIAR
// =====================
function clearForm() {
  currentCourseId = null;
  document.querySelectorAll("input").forEach(i => i.value = "");
}

// =====================
// CUOTAS (ORDENADAS 🔥)
// =====================
async function loadFees() {

  if (!currentCourseId) return;

  const snap = await getDocs(
    query(
      collection(db, "course_fees"),
      where("courseId", "==", currentCourseId),
      orderBy("year"),
      orderBy("month")
    )
  );

  const tbody = document.getElementById("fees-body");
  tbody.innerHTML = "";

  snap.forEach(d => {
    const f = d.data();

    tbody.innerHTML += `
      <tr>
        <td>${f.month}</td>
        <td>${f.year}</td>
        <td><input value="${f.amount}" onchange="updateFee('${d.id}','amount',this.value)"></td>
        <td><input type="date" value="${f.dueDate}" onchange="updateFee('${d.id}','dueDate',this.value)"></td>
        <td><input value="${f.interestPercent}" onchange="updateFee('${d.id}','interestPercent',this.value)"></td>
        <td><button onclick="deleteFee('${d.id}')">🗑</button></td>
      </tr>
    `;
  });
}

// =====================
// GENERAR CUOTAS
// =====================
window.generateFees = async () => {

  if (!currentCourseId) return alert("Guardar curso primero");

  const start = new Date(document.getElementById("course-start").value);
  const end = new Date(document.getElementById("course-end").value);
  const price = parseFloat(document.getElementById("course-price").value);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return alert("Completar fecha de inicio y fin");
  }

  if (Number.isNaN(price)) {
    return alert("Completar precio base");
  }

  const existingFeesSnap = await getDocs(
    query(collection(db, "course_fees"), where("courseId", "==", currentCourseId))
  );

  const existingPeriods = new Set();
  existingFeesSnap.forEach(docSnap => {
    const fee = docSnap.data();
    existingPeriods.add(`${fee.month}_${fee.year}`);
  });

  let current = new Date(start);
  let createdCount = 0;

  while (current <= end) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    const periodKey = `${month}_${year}`;

    if (!existingPeriods.has(periodKey)) {
      await addDoc(collection(db, "course_fees"), {
        courseId: currentCourseId,
        month,
        year,
        amount: price,
        dueDate: new Date(year, current.getMonth(), 10)
          .toISOString().split("T")[0],
        interestPercent: 10
      });

      existingPeriods.add(periodKey);
      createdCount += 1;
    }

    current.setMonth(current.getMonth() + 1);
  }

  await loadFees();

  if (createdCount === 0) {
    alert("No se generaron cuotas nuevas porque los períodos ya existían");
  }
};

// =====================
// UPDATE
// =====================
window.updateFee = async (id, field, value) => {

  await updateDoc(doc(db, "course_fees", id), {
    [field]: field === "amount" || field === "interestPercent"
      ? parseFloat(value)
      : value
  });
};

// =====================
// DELETE
// =====================
window.deleteFee = async (id) => {

  if (!confirm("Eliminar?")) return;

  await deleteDoc(doc(db, "course_fees", id));
  loadFees();
};
