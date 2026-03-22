import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { parseFlexibleDate } from "./date-utils.js";

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();
const searchInput = document.getElementById("dashboard-search");

let dashboardState = null;

init();

async function init() {
  await loadDashboard();

  searchInput?.addEventListener("input", () => {
    renderDashboard(dashboardState, searchInput.value.trim().toLowerCase());
  });
}

function parseDate(value) {
  return parseFlexibleDate(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDate(value) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(date)
    : "Sin fecha";
}

function getPaymentYear(payment) {
  return Number(payment.year) || parseDate(payment.paymentDate)?.getFullYear();
}

function getFullName(student = {}) {
  return [student.name, student.lastName || student.lastname]
    .filter(Boolean)
    .join(" ");
}

function isActiveStatus(value) {
  return String(value || "").toLowerCase() === "activo";
}

async function loadDashboard() {
  const [
    coursesSnap,
    studentsSnap,
    enrollmentsSnap,
    paymentsSnap,
    feesSnap
  ] = await Promise.all([
    getDocs(collection(db, "courses")),
    getDocs(collection(db, "students")),
    getDocs(collection(db, "enrollments")),
    getDocs(collection(db, "payments")),
    getDocs(collection(db, "course_fees"))
  ]);

  const courses = coursesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  const students = studentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  const enrollments = enrollmentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  const payments = paymentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  const fees = feesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

  const studentsMap = Object.fromEntries(students.map(student => [student.id, student]));
  const coursesMap = Object.fromEntries(courses.map(course => [course.id, course]));
  const enrollmentsMap = Object.fromEntries(enrollments.map(enrollment => [enrollment.id, enrollment]));
  const currentMonthFeesByCourse = new Map();
  const currentMonthPaymentsByCourse = new Map();

  fees.forEach(fee => {
    if (Number(fee.month) === currentMonth && Number(fee.year) === currentYear) {
      currentMonthFeesByCourse.set(fee.courseId, fee);
    }
  });

  const paymentsByPeriod = {};
  let monthCollected = 0;
  const recentPayments = [];

  payments.forEach(payment => {
    const paymentYear = getPaymentYear(payment);
    if (!paymentYear) return;

    paymentsByPeriod[`${payment.enrollmentId}_${payment.month}_${paymentYear}`] = payment;

    const paymentDate = parseDate(payment.paymentDate);
    if (paymentDate) {
      recentPayments.push(payment);
    }

    if (paymentDate && paymentDate.getMonth() + 1 === currentMonth && paymentDate.getFullYear() === currentYear) {
      monthCollected += Number(payment.amount) || 0;
    }
  });

  const activeCourses = courses.filter(course => isActiveStatus(course.status));
  const activeStudents = students.filter(student => isActiveStatus(student.status));
  const activeEnrollments = enrollments.filter(enrollment => isActiveStatus(enrollment.status));

  const monthlyEnrollmentStatus = activeEnrollments
    .map(enrollment => {
      const course = coursesMap[enrollment.courseId];
      if (!course || !isActiveStatus(course.status)) return null;

      const fee = currentMonthFeesByCourse.get(enrollment.courseId);
      if (!fee) return null;

      const payment = paymentsByPeriod[`${enrollment.id}_${currentMonth}_${currentYear}`];
      const dueDate = parseDate(fee.dueDate);
      const isPaid = Boolean(payment);
      const isOverdue = !isPaid && dueDate && dueDate < now;
      const isDueThisMonth = !isPaid && dueDate && dueDate >= now;

      if (payment) {
        currentMonthPaymentsByCourse.set(
          enrollment.courseId,
          (currentMonthPaymentsByCourse.get(enrollment.courseId) || 0) + (Number(payment.amount) || 0)
        );
      }

      return {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        studentId: enrollment.studentId,
        expectedAmount: Number(fee.amount) || 0,
        dueDate: fee.dueDate,
        interestPercent: Number(fee.interestPercent) || 0,
        isPaid,
        isOverdue,
        isDueThisMonth,
        payment
      };
    })
    .filter(Boolean);

  const totalMonthFees = monthlyEnrollmentStatus.length;
  const paidFees = monthlyEnrollmentStatus.filter(item => item.isPaid).length;
  const dueThisMonth = monthlyEnrollmentStatus.filter(item => item.isDueThisMonth).length;
  const overdueFees = monthlyEnrollmentStatus.filter(item => item.isOverdue).length;
  const pendingPayments = dueThisMonth + overdueFees;

  const coursePerformance = activeCourses
    .map(course => {
      const courseStatuses = monthlyEnrollmentStatus.filter(item => item.courseId === course.id);
      if (courseStatuses.length === 0) return null;

      const paidCount = courseStatuses.filter(item => item.isPaid).length;
      const totalCount = courseStatuses.length;
      const expectedAmount = courseStatuses.reduce((sum, item) => sum + item.expectedAmount, 0);
      const collectedAmount = currentMonthPaymentsByCourse.get(course.id) || 0;
      const progress = totalCount ? Math.round((paidCount / totalCount) * 100) : 0;

      return {
        courseId: course.id,
        name: course.name || "Sin nombre",
        paidCount,
        totalCount,
        progress,
        expectedAmount,
        collectedAmount,
        isPaid: totalCount > 0 && paidCount === totalCount
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.progress - a.progress || b.collectedAmount - a.collectedAmount);

  const paidCourses = coursePerformance.filter(course => course.isPaid).length;
  const partialCourses = coursePerformance.filter(course => !course.isPaid && course.paidCount > 0).length;

  recentPayments.sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""));

  dashboardState = {
    activeCourses: activeCourses.length,
    activeStudents: activeStudents.length,
    activeEnrollments: activeEnrollments.length,
    monthCollected,
    paidCourses,
    partialCourses,
    pendingPayments,
    totalMonthFees,
    paidFees,
    dueThisMonth,
    overdueFees,
    coursePerformance,
    recentPayments: recentPayments.slice(0, 8),
    studentsMap,
    coursesMap,
    enrollmentsMap
  };

  renderDashboard(dashboardState, searchInput?.value.trim().toLowerCase() || "");
}

function renderDashboard(state, searchTerm = "") {
  if (!state) return;

  const monthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric"
  }).format(now);

  document.getElementById("dashboard-subtitle").textContent = `Vista de cobranzas y actividad para ${monthLabel}.`;
  document.getElementById("kpi-active-courses").textContent = state.activeCourses;
  document.getElementById("kpi-active-students").textContent = state.activeStudents;
  document.getElementById("kpi-active-enrollments").textContent = state.activeEnrollments;
  document.getElementById("kpi-month-collected").textContent = formatCurrency(state.monthCollected);
  document.getElementById("kpi-paid-courses").textContent = state.paidCourses;
  document.getElementById("kpi-pending-payments").textContent = state.pendingPayments;

  document.getElementById("summary-month-fees").textContent = state.totalMonthFees;
  document.getElementById("summary-paid-fees").textContent = state.paidFees;
  document.getElementById("summary-due-this-month").textContent = state.dueThisMonth;
  document.getElementById("summary-overdue").textContent = state.overdueFees;

  renderCoursePerformance(state, searchTerm);
  renderPendingTasks(state);
  renderRecentMovements(state, searchTerm);
}

function renderCoursePerformance(state, searchTerm) {
  const container = document.getElementById("course-performance");
  const filteredCourses = state.coursePerformance.filter(course => {
    if (!searchTerm) return true;
    return course.name.toLowerCase().includes(searchTerm);
  });

  if (!filteredCourses.length) {
    container.innerHTML = '<div class="chart-placeholder">No hay cursos que coincidan con la búsqueda.</div>';
    return;
  }

  container.innerHTML = filteredCourses
    .map(course => `
      <div class="dashboard-row">
        <div class="dashboard-row-head">
          <div>
            <strong>${course.name}</strong>
            <p>${course.paidCount}/${course.totalCount} cuotas cobradas · ${formatCurrency(course.collectedAmount)} / ${formatCurrency(course.expectedAmount)}</p>
          </div>
          <span class="dashboard-badge ${course.isPaid ? "success" : "info"}">${course.progress}%</span>
        </div>
        <div class="dashboard-bar">
          <div class="dashboard-bar-fill" style="width:${course.progress}%;"></div>
        </div>
      </div>
    `)
    .join("");
}

function renderPendingTasks(state) {
  const container = document.getElementById("pending-tasks");
  const tasks = [
    {
      className: "task task-blue",
      text: `🟡 ${state.dueThisMonth} cuotas pendientes de vencer este mes`
    },
    {
      className: "task",
      text: `🔴 ${state.overdueFees} cuotas vencidas para seguimiento inmediato`
    },
    {
      className: "task task-green",
      text: `🟢 ${state.paidCourses} cursos están completamente al día este mes`
    },
    {
      className: "task task-yellow",
      text: `🟠 ${state.partialCourses} cursos tienen cobranza parcial en curso`
    }
  ];

  container.innerHTML = tasks
    .map(task => `<div class="${task.className}">${task.text}</div>`)
    .join("");
}

function renderRecentMovements(state, searchTerm) {
  const container = document.getElementById("recent-movements");
  const payments = state.recentPayments.filter(payment => {
    if (!searchTerm) return true;

    const enrollment = state.enrollmentsMap[payment.enrollmentId];
    const student = enrollment ? state.studentsMap[enrollment.studentId] : null;
    const course = enrollment ? state.coursesMap[enrollment.courseId] : null;
    const text = [getFullName(student), course?.name, payment.reference, payment.method]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(searchTerm);
  });

  if (!payments.length) {
    container.innerHTML = "<p>No hay movimientos para mostrar.</p>";
    return;
  }

  container.innerHTML = payments
    .map(payment => {
      const enrollment = state.enrollmentsMap[payment.enrollmentId];
      const student = enrollment ? state.studentsMap[enrollment.studentId] : null;
      const course = enrollment ? state.coursesMap[enrollment.courseId] : null;
      const studentName = getFullName(student) || "Alumno sin nombre";
      const courseName = course?.name || "Curso sin nombre";

      return `
        <div class="dashboard-movement">
          <strong>${studentName}</strong>
          <p>${courseName} · ${formatCurrency(Number(payment.amount) || 0)} · ${payment.method || "Sin medio"}</p>
          <span>${formatDate(payment.paymentDate)}${payment.reference ? ` · ${payment.reference}` : ""}</span>
        </div>
      `;
    })
    .join("");
}
