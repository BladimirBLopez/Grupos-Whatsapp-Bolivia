// ============================================
// SISTEMA DE ADMINISTRACIÓN - OPCIÓN D
// ============================================

// 🔐 CONFIGURACIÓN - ¡CAMBIA ESTOS DATOS POR LOS TUYOS!
const ADMIN_CONFIG = {
  usuario: "admin",
  password: "Bolivia2024",
  sessionHours: 24  // Duración de la sesión en horas
};

let isAdminLogged = false;

// ============================================
// FUNCIONES DE SESIÓN
// ============================================

function loginAdmin(usuario, password) {
  if (usuario === ADMIN_CONFIG.usuario && password === ADMIN_CONFIG.password) {
    isAdminLogged = true;
    const expires = Date.now() + (ADMIN_CONFIG.sessionHours * 60 * 60 * 1000);
    localStorage.setItem("adminLogged", "true");
    localStorage.setItem("adminExpires", expires.toString());
    actualizarUIAdmin(true);
    return true;
  }
  return false;
}

function logoutAdmin() {
  isAdminLogged = false;
  localStorage.removeItem("adminLogged");
  localStorage.removeItem("adminExpires");
  actualizarUIAdmin(false);
  // Opcional: recargar la página para resetear
  // window.location.reload();
}

function checkAdminSession() {
  const logged = localStorage.getItem("adminLogged");
  const expires = localStorage.getItem("adminExpires");
  
  if (logged === "true" && expires && Date.now() < parseInt(expires)) {
    isAdminLogged = true;
    actualizarUIAdmin(true);
    return true;
  }
  
  logoutAdmin();
  return false;
}

// ============================================
// ACTUALIZAR INTERFAZ SEGÚN ESTADO ADMIN
// ============================================

function actualizarUIAdmin(isLogged) {
  const subirBtn = document.getElementById("subirGrupoBtn");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  
  if (isLogged) {
    if (subirBtn) subirBtn.style.display = "inline-flex";
    if (adminLoginBtn) adminLoginBtn.style.display = "none";
    if (adminLogoutBtn) adminLogoutBtn.style.display = "inline-flex";
    
    // Mostrar notificación de bienvenida (solo la primera vez)
    if (!sessionStorage.getItem("adminWelcomed")) {
      mostrarToast("✅ Has iniciado sesión como administrador", "#25D366");
      sessionStorage.setItem("adminWelcomed", "true");
    }
  } else {
    if (subirBtn) subirBtn.style.display = "none";
    if (adminLoginBtn) adminLoginBtn.style.display = "inline-flex";
    if (adminLogoutBtn) adminLogoutBtn.style.display = "none";
  }
}

// ============================================
// MODALES
// ============================================

function mostrarLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) {
    modal.style.display = "flex";
    // Limpiar campos
    document.getElementById("loginUser").value = "";
    document.getElementById("loginPass").value = "";
    // Enfocar el primer campo
    setTimeout(() => document.getElementById("loginUser").focus(), 100);
  }
}

function cerrarLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "none";
}

function mostrarAgregarGrupoModal() {
  if (!isAdminLogged) {
    mostrarToast("⚠️ Necesitas iniciar sesión como administrador", "#dc3545");
    mostrarLoginModal();
    return;
  }
  const modal = document.getElementById("subirModal");
  if (modal) {
    modal.style.display = "flex";
    // Limpiar campos
    document.getElementById("modalGroupName").value = "";
    document.getElementById("modalGroupDesc").value = "";
    document.getElementById("modalGroupLink").value = "";
    document.getElementById("modalCity").value = "";
    document.getElementById("modalMembers").value = "1";
  }
}

function cerrarAgregarModal() {
  const modal = document.getElementById("subirModal");
  if (modal) modal.style.display = "none";
}

// ============================================
// TOAST NOTIFICACIONES
// ============================================

function mostrarToast(mensaje, color = "#25D366") {
  const toast = document.createElement("div");
  toast.textContent = mensaje;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: ${color};
    color: white;
    padding: 12px 24px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    animation: fadeInUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "fadeOutDown 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Añadir animaciones si no existen
if (!document.querySelector("#toastAnimations")) {
  const style = document.createElement("style");
  style.id = "toastAnimations";
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes fadeOutDown {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// INICIALIZAR EVENTOS
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // Verificar sesión al cargar
  checkAdminSession();
  
  // Botones de admin
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  const subirBtn = document.getElementById("subirGrupoBtn");
  
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener("click", mostrarLoginModal);
  }
  
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
      logoutAdmin();
      mostrarToast("🔓 Sesión cerrada", "#6c757d");
    });
  }
  
  if (subirBtn) {
    subirBtn.addEventListener("click", mostrarAgregarGrupoModal);
  }
  
  // Modal de login
  const loginBtn = document.getElementById("loginBtn");
  const closeLoginBtn = document.getElementById("closeLoginBtn");
  
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const user = document.getElementById("loginUser").value;
      const pass = document.getElementById("loginPass").value;
      if (loginAdmin(user, pass)) {
        cerrarLoginModal();
        mostrarToast("✅ Bienvenido administrador", "#25D366");
      } else {
        mostrarToast("❌ Usuario o contraseña incorrectos", "#dc3545");
      }
    });
  }
  
  if (closeLoginBtn) {
    closeLoginBtn.addEventListener("click", cerrarLoginModal);
  }
  
  // Modal de agregar grupo
  const modalConfirm = document.getElementById("modalConfirmBtn");
  const modalClose = document.getElementById("modalCloseBtn");
  
  if (modalClose) {
    modalClose.addEventListener("click", cerrarAgregarModal);
  }
  
  // Cerrar modales al hacer clic fuera
  window.addEventListener("click", (e) => {
    const loginModal = document.getElementById("loginModal");
    const subirModal = document.getElementById("subirModal");
    if (e.target === loginModal) cerrarLoginModal();
    if (e.target === subirModal) cerrarAgregarModal();
  });
  
  // Atajo de teclado: Ctrl + Shift + L (abrir login)
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      if (isAdminLogged) {
        mostrarAgregarGrupoModal();
      } else {
        mostrarLoginModal();
      }
    }
  });
  
  // Si viene con ?admin en URL, mostrar login
  if (window.location.search.includes("admin")) {
    mostrarLoginModal();
  }
});

// Exportar funciones para usar desde main.js
window.adminFunctions = {
  agregarGrupo: function(grupo) {
    // Esta función será llamada desde main.js
    if (isAdminLogged && window.gruposData) {
      window.gruposData.push(grupo);
      if (window.actualizarContadores) window.actualizarContadores();
      if (window.renderGrupos) window.renderGrupos();
      cerrarAgregarModal();
      mostrarToast("✅ Grupo agregado correctamente", "#25D366");
      return true;
    }
    return false;
  },
  isLogged: () => isAdminLogged
};