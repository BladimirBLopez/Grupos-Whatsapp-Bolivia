// ============================================
// LOGIN PARA ADMIN
// ============================================
const ADMIN_CREDENTIALS = {
  usuario: 'admin',
  password: 'admin123'
};

// Abrir modal de login al hacer clic en Admin
document.addEventListener('DOMContentLoaded', function() {
  // ... tu código existente ...
  
  // Botón Admin
  const btnAdmin = document.getElementById('btnAdminLogin');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', function() {
      document.getElementById('loginModal').classList.add('show');
      document.getElementById('loginForm').reset();
      document.getElementById('loginError').classList.remove('show');
      document.getElementById('loginUser').focus();
    });
  }
  
  // Cerrar modal de login
  const closeLogin = document.getElementById('closeLoginBtn');
  if (closeLogin) {
    closeLogin.addEventListener('click', function() {
      document.getElementById('loginModal').classList.remove('show');
    });
  }
  
  // Cerrar al hacer clic fuera
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('show');
      }
    });
  }
  
  // Enviar formulario de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value.trim();
      const error = document.getElementById('loginError');
      const btn = document.getElementById('loginSubmitBtn');
      
      // Deshabilitar botón temporalmente
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
      
      setTimeout(() => {
        if (user === ADMIN_CREDENTIALS.usuario && pass === ADMIN_CREDENTIALS.password) {
          // Login exitoso - redirigir a admin.html
          window.location.href = 'admin.html';
        } else {
          error.classList.add('show');
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
          document.getElementById('loginPass').value = '';
          document.getElementById('loginPass').focus();
          
          // Ocultar error después de 3s
          setTimeout(() => error.classList.remove('show'), 3000);
        }
      }, 800);
    });
  }
  
  // Enter para enviar
  document.getElementById('loginPass').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
  });
});