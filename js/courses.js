import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentCourseId = null;

// =====================
// GUARDAR CURSO
// =====================
window.saveCourse = async () => {

  const name = document.getElementById("course-name").value;
  const start = document.getElementById("course-start").value;
  const end = document.getElementById("course-end").value;
  const price = parseFloat(document.getElementById("course-price").value);

  if (!name) return alert("Nombre requerido");

  const data = {
    name,
    startDate: start,
    endDate: end,
    price,
    createdAt: new Date()
  };

  if (!currentCourseId) {
    const ref = await addDoc(collection(db, "courses"), data);
    currentCourseId = ref.id;
  } else {
    await updateDoc(doc(db, "courses", currentCourseId), data);
  }

  alert("Guardado");
};

// =====================
// GENERAR CUOTAS
// =====================
window.generateFees = async () => {

  if (!currentCourseId) return alert("Guardar curso primero");

  const start = document.getElementById("course-start").value;
  const end = document.getElementById("course-end").value;
  const price = parseFloat(document.getElementById("course-price").value);

  if (!start || !end || !price) {
    return alert("Completar datos");
  }

  let current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {

    await addDoc(collection(db, "course_fees"), {
      courseId: currentCourseId,
      month: current.getMonth() + 1,
      year: current.getFullYear(),
      amount: price,
      dueDate: new Date(current.getFullYear(), current.getMonth(), 10)
        .toISOString().split("T")[0],
      interestPercent: 10,
      createdAt: new Date()
    });

    current.setMonth(current.getMonth() + 1);
  }

  loadFees();
};

// =====================
// CARGAR CUOTAS
// =====================
async function loadFees() {

  if (!currentCourseId) return;

  const snap = await getDocs(
    query(collection(db, "course_fees"), where("courseId", "==", currentCourseId))
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

  if (!confirm("Eliminar cuota?")) return;

  await deleteDoc(doc(db, "course_fees", id));
  loadFees();
};
