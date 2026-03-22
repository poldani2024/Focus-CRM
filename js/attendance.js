import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  attachDateInputFormatting,
  toDisplayDate,
  toStorageDate
} from "./date-utils.js";

let organizers = [];
let locations = [];
let courses = [];
let students = [];
let enrollments = [];
let attendanceRecords = [];

const dateInput = document.getElementById("attendance-date");
attachDateInputFormatting(dateInput);
dateInput.value = toDisplayDate(new Date());

init();

async function init() {
  await loadData();
  fillOrganizers();
  onAttendanceOrganizerChange();
}

async function loadData() {
  const [
    organizersSnap,
    locationsSnap,
    coursesSnap,
    studentsSnap,
    enrollmentsSnap,
    attendanceSnap
  ] = await Promise.all([
    getDocs(collection(db, "organizers")),
    getDocs(collection(db, "locations")),
    getDocs(collection(db, "courses")),
    getDocs(collection(db, "students")),
    getDocs(collection(db, "enrollments")),
    getDocs(collection(db, "attendance"))
  ]);

  organizers = organizersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  locations = locationsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  courses = coursesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  students = studentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  enrollments = enrollmentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  attendanceRecords = attendanceSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

function getSelectedFilters() {
  return {
    organizerId: document.getElementById("attendance-organizer").value,
    locationId: document.getElementById("attendance-location").value,
    courseId: document.getElementById("attendance-course").value,
    classDate: toStorageDate(document.getElementById("attendance-date").value)
  };
}

function getActiveCourseOptions({ organizerId = "", locationId = "" } = {}) {
  return courses.filter(course => {
    if (String(course.status || "").toLowerCase() !== "activo") return false;
    if (organizerId && course.organizerId !== organizerId) return false;
    if (locationId && course.locationId !== locationId) return false;
    return true;
  });
}

function getStudentName(student = {}) {
  return [student.name, student.lastName || student.lastname]
    .filter(Boolean)
    .join(" ");
}

function fillOrganizers() {
  const select = document.getElementById("attendance-organizer");
  select.innerHTML = "<option value=''>Organizador</option>";

  organizers.forEach(organizer => {
    select.innerHTML += `<option value="${organizer.id}">${organizer.name}</option>`;
  });
}

function fillLocations(organizerId = "") {
  const select = document.getElementById("attendance-location");
  const visibleCourses = getActiveCourseOptions({ organizerId });
  const locationIds = new Set(visibleCourses.map(course => course.locationId).filter(Boolean));
  const visibleLocations = organizerId
    ? locations.filter(location => locationIds.has(location.id))
    : locations;

  select.innerHTML = "<option value=''>Sede</option>";

  visibleLocations.forEach(location => {
    select.innerHTML += `<option value="${location.id}">${location.name}</option>`;
  });
}

function fillCourses(organizerId = "", locationId = "") {
  const select = document.getElementById("attendance-course");
  const visibleCourses = getActiveCourseOptions({ organizerId, locationId });

  select.innerHTML = "<option value=''>Curso</option>";

  visibleCourses.forEach(course => {
    select.innerHTML += `<option value="${course.id}">${course.name}</option>`;
  });
}

window.onAttendanceOrganizerChange = () => {
  const organizerId = document.getElementById("attendance-organizer").value;
  fillLocations(organizerId);
  fillCourses(organizerId);
};

window.onAttendanceLocationChange = () => {
  const organizerId = document.getElementById("attendance-organizer").value;
  const locationId = document.getElementById("attendance-location").value;
  fillCourses(organizerId, locationId);
};

window.loadAttendanceGrid = async () => {
  await loadData();

  const { courseId, classDate } = getSelectedFilters();
  const subtitle = document.getElementById("attendance-subtitle");
  const body = document.getElementById("attendance-body");

  if (!courseId) {
    subtitle.textContent = "Seleccioná un curso y una fecha para comenzar.";
    body.innerHTML = "<tr><td colspan='3' class='attendance-empty'>Elegí un curso para cargar asistencia.</td></tr>";
    updateAttendanceSummary();
    return;
  }

  if (!classDate) {
    alert("Ingresar fecha en formato DD/MM/YYYY");
    return;
  }

  const course = courses.find(item => item.id === courseId);
  const studentsMap = Object.fromEntries(students.map(student => [student.id, student]));
  const attendanceMap = Object.fromEntries(
    attendanceRecords
      .filter(record => record.courseId === courseId && record.classDate === classDate)
      .map(record => [`${record.enrollmentId}_${record.classDate}`, record])
  );

  const courseEnrollments = enrollments.filter(enrollment => (
    enrollment.courseId === courseId &&
    String(enrollment.status || "").toLowerCase() === "activo"
  ));

  subtitle.textContent = `${course?.name || "Curso"} · Clase del ${toDisplayDate(classDate)}`;

  if (!courseEnrollments.length) {
    body.innerHTML = "<tr><td colspan='3' class='attendance-empty'>No hay alumnos activos inscriptos en este curso.</td></tr>";
    updateAttendanceSummary();
    return;
  }

  body.innerHTML = courseEnrollments.map(enrollment => {
    const student = studentsMap[enrollment.studentId] || {};
    const attendance = attendanceMap[`${enrollment.id}_${classDate}`] || {};
    const status = attendance.status || "Pendiente";
    const notes = attendance.notes || "";

    return `
      <tr data-enrollment-id="${enrollment.id}" data-attendance-id="${attendance.id || ""}">
        <td>${getStudentName(student) || "Alumno sin nombre"}</td>
        <td>
          <select class="attendance-status" onchange="updateAttendanceSummary()">
            <option ${status === "Pendiente" ? "selected" : ""}>Pendiente</option>
            <option ${status === "Presente" ? "selected" : ""}>Presente</option>
            <option ${status === "Ausente" ? "selected" : ""}>Ausente</option>
            <option ${status === "Justificado" ? "selected" : ""}>Justificado</option>
          </select>
        </td>
        <td>
          <input class="attendance-notes" value="${notes}" placeholder="Observación opcional">
        </td>
      </tr>
    `;
  }).join("");

  updateAttendanceSummary();
};

window.updateAttendanceSummary = () => {
  const rows = [...document.querySelectorAll("#attendance-body tr[data-enrollment-id]")];
  const counts = {
    Presente: 0,
    Ausente: 0,
    Justificado: 0,
    Pendiente: 0
  };

  rows.forEach(row => {
    const status = row.querySelector(".attendance-status")?.value || "Pendiente";
    counts[status] += 1;
  });

  document.getElementById("attendance-present-count").textContent = counts.Presente;
  document.getElementById("attendance-absent-count").textContent = counts.Ausente;
  document.getElementById("attendance-justified-count").textContent = counts.Justificado;
  document.getElementById("attendance-pending-count").textContent = counts.Pendiente;
};

window.markAllAttendance = status => {
  document.querySelectorAll(".attendance-status").forEach(select => {
    select.value = status;
  });

  updateAttendanceSummary();
};

window.saveAttendance = async () => {
  const { courseId, classDate } = getSelectedFilters();
  if (!courseId) return alert("Seleccionar curso");
  if (!classDate) return alert("Ingresar fecha en formato DD/MM/YYYY");

  const rows = [...document.querySelectorAll("#attendance-body tr[data-enrollment-id]")];
  if (!rows.length) return alert("No hay alumnos para guardar asistencia");

  let savedCount = 0;

  for (const row of rows) {
    const enrollmentId = row.dataset.enrollmentId;
    const attendanceId = row.dataset.attendanceId;
    const enrollment = enrollments.find(item => item.id === enrollmentId);
    const status = row.querySelector(".attendance-status").value;
    const notes = row.querySelector(".attendance-notes").value.trim();

    const data = {
      enrollmentId,
      courseId,
      studentId: enrollment?.studentId || "",
      classDate,
      status,
      notes
    };

    if (attendanceId) {
      await updateDoc(doc(db, "attendance", attendanceId), data);
      savedCount += 1;
      continue;
    }

    if (status !== "Pendiente" || notes) {
      await addDoc(collection(db, "attendance"), data);
      savedCount += 1;
    }
  }

  await loadAttendanceGrid();
  alert(`Asistencia guardada (${savedCount} registros).`);
};
