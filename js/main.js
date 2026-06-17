// ============================================
// VARIABLES GLOBALES
// ============================================
let gruposData = [];
let ciudadSeleccionada = 'todos';
let plataformaSeleccionada = 'whatsapp';

// ============================================
// CARGAR GRUPOS DESDE LA API
// ============================================
async function cargarGrupos() {
  console.log('🔄 Cargando grupos...');
  
  try {
    const response = await fetch('/api/grupos');
    
    if (response.ok) {
      const data = await response.json();
      gruposData = data.grupos || [];
      console.log(`✅ ${gruposData.length} grupos cargados desde la API`);
    } else {
      console.warn('⚠️ Fallback a JSON local');
      const localResponse = await fetch('data/grupos.json');
      const data = await localResponse.json();
      gruposData = data.grupos || [];
      console.log(`✅ ${gruposData.length} grupos cargados desde JSON local`);
    }
    
    iniciarPagina();
    
  } catch (error) {
    console.error('❌ Error al cargar grupos:', error);
    
    try {
      const localResponse = await fetch('data/grupos.json');
      const data = await localResponse.json();
      gruposData = data.grupos || [];
      console.log(`✅ ${gruposData.length} grupos cargados desde JSON (fallback)`);
      iniciarPagina();
    } catch (fallbackError) {
      console.error('❌ Error crítico:', fallbackError);
      const container = document.getElementById('gruposContainer');
      if (container) {
        container.innerHTML = `<div class="empty-message">
          <i class="fas fa-exclamation-triangle"></i>
          Error al cargar los grupos. Por favor, recarga la página.
        </div>`;
      }
    }
  }
}

// ============================================
// INICIAR PÁGINA
// ============================================
function iniciarPagina() {
  console.log('🚀 Iniciando página con', gruposData.length, 'grupos');
  
  // Mostrar grupos en consola para debugging
  console.log('📋 Datos de grupos:', gruposData);
  
  actualizarContadoresCiudades();
  renderizarGrupos();
  configurarEventListeners();
}

// ============================================
// RENDERIZAR GRUPOS
// ============================================
function renderizarGrupos() {
  const container = document.getElementById('gruposContainer');
  if (!container) {
    console.error('❌ No se encontró #gruposContainer');
    return;
  }
  
  console.log('🔍 Renderizando con ciudad:', ciudadSeleccionada, 'plataforma:', plataformaSeleccionada);
  
  let gruposFiltrados = [...gruposData];
  
  // Filtrar por plataforma
  if (plataformaSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g => 
      g.plataforma && g.plataforma.toLowerCase() === plataformaSeleccionada.toLowerCase()
    );
  }
  
  // Filtrar por ciudad
  if (ciudadSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g => 
      g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()
    );
  }
  
  console.log('📊 Grupos después de filtrar:', gruposFiltrados.length);
  
  // Separar destacados
  const destacados = gruposFiltrados.filter(g => g.destacado === true);
  const normales = gruposFiltrados.filter(g => g.destacado !== true);
  const gruposOrdenados = [...destacados, ...normales];
  
  // Actualizar contador
  const resultCount = document.getElementById('resultCount');
  if (resultCount) {
    resultCount.textContent = gruposOrdenados.length;
  }
  
  // Si no hay grupos
  if (gruposOrdenados.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        <i class="fas fa-search" style="font-size:2rem; display:block; margin-bottom:0.5rem;"></i>
        No se encontraron grupos para esta búsqueda
      </div>
    `;
    return;
  }
  
  // Renderizar tarjetas
  container.innerHTML = gruposOrdenados.map(grupo => `
    <div class="grupo-card ${grupo.destacado ? 'destacado-card' : ''}">
      ${grupo.destacado ? `
        <div class="destacado-ribbon">
          <i class="fas fa-star"></i> GRUPO DESTACADO
        </div>
      ` : ''}
      <div class="card-header">
        <h3>${grupo.nombre || 'Sin nombre'}</h3>
        <span class="badge-whatsapp"><i class="fab fa-whatsapp"></i> ${grupo.plataforma || 'WhatsApp'}</span>
      </div>
      ${grupo.descripcion ? `<div class="descripcion">${grupo.descripcion}</div>` : ''}
      <div class="ubicacion">
        <i class="fas fa-map-marker-alt"></i> ${grupo.ubicacion || 'Ubicación no especificada'}
      </div>
      <div class="stats">
        <span class="stat-item"><i class="fas fa-users"></i> ${grupo.miembros || 0} miembros</span>
        <span class="stat-item"><i class="fas fa-chart-line"></i> ${grupo.activos || 0} activos</span>
      </div>
      <a href="${grupo.link || '#'}" target="_blank" rel="noopener noreferrer" class="join-btn">
        <i class="fab fa-whatsapp"></i> Unirse al grupo
      </a>
    </div>
  `).join('');
  
  console.log('✅ Renderizados', gruposOrdenados.length, 'grupos');
}

// ============================================
// ACTUALIZAR CONTADORES DE CIUDADES
// ============================================
function actualizarContadoresCiudades() {
  const ciudades = ['todos', 'Santa Cruz', 'La Paz', 'Cochabamba', 'Sucre', 'Tarija', 'Potosí', 'Oruro', 'Beni', 'Pando'];
  
  ciudades.forEach(ciudad => {
    let count;
    if (ciudad === 'todos') {
      count = gruposData.length;
    } else {
      count = gruposData.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudad.toLowerCase()).length;
    }
    
    const elementId = ciudad === 'todos' ? 'modalTotalCount' : `modal${ciudad.replace(/ /g, '')}Count`;
    const element = document.getElementById(elementId);
    if (element) element.textContent = count;
  });
  
  const badge = document.getElementById('selectedCityCount');
  if (badge) {
    let count;
    if (ciudadSeleccionada === 'todos') {
      count = gruposData.length;
    } else {
      count = gruposData.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()).length;
    }
    badge.textContent = `(${count})`;
  }
}

// ============================================
// LOGIN PARA ADMIN
// ============================================
const ADMIN_CREDENTIALS = {
  usuario: 'admin',
  password: 'admin123'
};

// ============================================
// CONFIGURAR EVENT LISTENERS
// ============================================
function configurarEventListeners() {
  console.log('🔧 Configurando event listeners...');
  
  // --- Botón Admin (login) ---
  const btnAdmin = document.getElementById('btnAdminLogin');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', function() {
      document.getElementById('loginModal').classList.add('show');
      document.getElementById('loginForm').reset();
      document.getElementById('loginError').classList.remove('show');
      document.getElementById('loginUser').focus();
    });
  }
  
  // --- Cerrar modal login ---
  const closeLogin = document.getElementById('closeLoginBtn');
  if (closeLogin) {
    closeLogin.addEventListener('click', function() {
      document.getElementById('loginModal').classList.remove('show');
    });
  }
  
  // --- Cerrar login clic fuera ---
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('show');
      }
    });
  }
  
  // --- Enviar login ---
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value.trim();
      const error = document.getElementById('loginError');
      const btn = document.getElementById('loginSubmitBtn');
      
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
      
      setTimeout(() => {
        if (user === ADMIN_CREDENTIALS.usuario && pass === ADMIN_CREDENTIALS.password) {
          window.location.href = 'admin.html';
        } else {
          error.classList.add('show');
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
          document.getElementById('loginPass').value = '';
          document.getElementById('loginPass').focus();
          setTimeout(() => error.classList.remove('show'), 3000);
        }
      }, 800);
    });
  }
  
  // --- Filtros de plataforma ---
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      plataformaSeleccionada = this.dataset.platform;
      renderizarGrupos();
    });
  });
  
  // --- Abrir modal de ciudades ---
  const openBtn = document.getElementById('openCityModalBtn');
  if (openBtn) {
    openBtn.addEventListener('click', function() {
      document.getElementById('cityModal').style.display = 'flex';
    });
  }
  
  // --- Cerrar modal de ciudades ---
  const closeBtn = document.getElementById('closeCityModalBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      document.getElementById('cityModal').style.display = 'none';
    });
  }
  
  // --- Cerrar ciudades clic fuera ---
  const cityModal = document.getElementById('cityModal');
  if (cityModal) {
    cityModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.style.display = 'none';
      }
    });
  }
  
  // --- Seleccionar ciudad ---
  document.querySelectorAll('.city-item').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.city-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      const ciudad = this.dataset.city;
      ciudadSeleccionada = ciudad;
      
      const nameSpan = document.getElementById('selectedCityName');
      if (nameSpan) {
        nameSpan.textContent = ciudad === 'todos' ? 'Todos los departamentos' : ciudad;
      }
      
      document.getElementById('cityModal').style.display = 'none';
      renderizarGrupos();
      actualizarContadoresCiudades();
    });
  });
  
  // --- Buscador de ciudades ---
  const citySearch = document.getElementById('citySearchInput');
  if (citySearch) {
    citySearch.addEventListener('input', function() {
      const busqueda = this.value.toLowerCase().trim();
      document.querySelectorAll('.city-item').forEach(item => {
        const text = item.querySelector('.city-info span')?.textContent?.toLowerCase() || '';
        item.style.display = text.includes(busqueda) ? '' : 'none';
      });
    });
  }
  
  // --- Logo reset ---
  const logoBtn = document.getElementById('logoResetBtn');
  if (logoBtn) {
    logoBtn.addEventListener('click', function() {
      ciudadSeleccionada = 'todos';
      plataformaSeleccionada = 'whatsapp';
      
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      const whatsappChip = document.querySelector('.filter-chip[data-platform="whatsapp"]');
      if (whatsappChip) whatsappChip.classList.add('active');
      
      document.getElementById('selectedCityName').textContent = 'Todos los departamentos';
      
      renderizarGrupos();
      actualizarContadoresCiudades();
    });
  }
  
  console.log('✅ Event listeners configurados');
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Qigrupos Bolivia iniciado');
  cargarGrupos();
});