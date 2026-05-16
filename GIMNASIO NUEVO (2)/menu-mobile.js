/* ============================================================
   menu-mobile.js — Lógica compartida del menú hamburguesa
   Importar en todas las páginas que tengan #menu-toggle
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const menuToggle = document.getElementById('menu-toggle');
  const sidebar    = document.querySelector('.sidebar');
  const overlay    = document.getElementById('sidebar-overlay');

  if (!menuToggle || !sidebar || !overlay) return; // seguridad

  // Abrir / cerrar sidebar al tocar la hamburguesa
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('abierto');
    overlay.classList.toggle('abierto');
  });

  // Cerrar sidebar al tocar el overlay oscuro
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('abierto');
    overlay.classList.remove('abierto');
  });

  // Cerrar sidebar al navegar a otra sección (clic en cualquier enlace del menú)
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('abierto');
      overlay.classList.remove('abierto');
    });
  });

});
