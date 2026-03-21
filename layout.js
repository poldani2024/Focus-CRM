async function loadSidebar() {
  const res = await fetch("sidebar.html");
  const html = await res.text();
  document.getElementById("sidebar-container").innerHTML = html;

  // Activar menú actual
  const currentPage = window.location.pathname.split("/").pop();
  const links = document.querySelectorAll(".menu-item");

  links.forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
}

loadSidebar();
const currentPage = window.location.pathname.split("/").pop();

if (
  currentPage === "config-institutes.html" ||
  currentPage === "config-organizers.html"
) {
  const submenu = document.getElementById("submenu-config");
  if (submenu) submenu.style.display = "block";
}
function toggleSubmenu() {
  const submenu = document.getElementById("submenu-config");
  submenu.style.display =
    submenu.style.display === "block" ? "none" : "block";
}
