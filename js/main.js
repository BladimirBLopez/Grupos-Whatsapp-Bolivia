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
    }
    
    iniciarPagina();
    
  } catch (error) {
    console.error('❌ Error al cargar grupos:', error);
    try {
      const localResponse = await fetch('data/grupos.json');
      const data = await localResponse.json();
      gruposData = data.grupos || [];
      iniciarPagina();
    } catch (fallbackError) {
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
  console.log('📋 Datos de grupos:', gruposData);

  mostrarGrupoDestacado();
  actualizarContadoresCiudades();
  renderizarGrupos();
  configurarEventListeners();
}

// ============================================
// BANNER GRUPO DESTACADO
// ============================================
function mostrarGrupoDestacado() {
  const banner = document.getElementById('grupoDestacadoFijo');
  if (!banner) return;

  const destacado = gruposData.find(g => g.destacado === true);
  if (!destacado) { banner.innerHTML = ''; return; }

  banner.innerHTML = `
    <div style="background:#F5A623;;border-radius:16px;padding:1rem 1.2rem;margin-bottom:1rem;box-shadow:0 4px 20px rgba(255,165,0,0.3);">
      <div style="font-size:0.7rem;font-weight:800;letter-spacing:2px;color:#5a3e00;margin-bottom:0.5rem;">👑 GRUPO DESTACADO DE LA SEMANA</div>
      <div style="font-weight:700;font-size:1rem;color:#1a1a1a;margin-bottom:0.3rem;">${destacado.nombre}</div>
      ${destacado.descripcion ? `<div style="font-size:0.8rem;color:#3a3a3a;margin-bottom:0.5rem;">${destacado.descripcion}</div>` : ''}
      <div style="font-size:0.8rem;color:#5a3e00;margin-bottom:0.8rem;">
        📍 ${destacado.ubicacion} · 👥 ${destacado.miembros} miembros · 📈 ${destacado.activos} activos
      </div>
      <a href="${destacado.link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:white;padding:8px 18px;border-radius:50px;font-weight:700;font-size:0.85rem;text-decoration:none;">
        <i class="fab fa-whatsapp"></i> Unirme ahora
      </a>
    </div>
  `;
}

// ============================================
// RENDERIZAR GRUPOS
// ============================================
function renderizarGrupos() {
  const container = document.getElementById('gruposContainer');
  if (!container) return;

  let gruposFiltrados = [...gruposData];

  if (plataformaSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g =>
      g.plataforma && g.plataforma.toLowerCase() === plataformaSeleccionada.toLowerCase()
    );
  }

  if (ciudadSeleccionada !== 'todos') {
    gruposFiltrados = gruposFiltrados.filter(g =>
      g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()
    );
  }

  const gruposOrdenados = gruposFiltrados.filter(g => g.destacado !== true);

  const resultCount = document.getElementById('resultCount');
  if (resultCount) resultCount.textContent = gruposOrdenados.length;

  if (gruposOrdenados.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        <i class="fas fa-search" style="font-size:2rem; display:block; margin-bottom:0.5rem;"></i>
        No se encontraron grupos para esta búsqueda
      </div>`;
    return;
  }

  container.innerHTML = gruposOrdenados.map(grupo => `
    <div class="grupo-card ${grupo.destacado ? 'destacado-card' : ''}">
      ${grupo.destacado ? `
        <div class="destacado-ribbon">
          <i class="fas fa-star"></i> GRUPO DESTACADO
        </div>` : ''}
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
}

// ============================================
// ACTUALIZAR CONTADORES DE CIUDADES
// ============================================
function actualizarContadoresCiudades() {
  const ciudades = ['todos', 'Santa Cruz', 'La Paz', 'Cochabamba', 'Sucre', 'Tarija', 'Potosí', 'Oruro', 'Beni', 'Pando'];

  ciudades.forEach(ciudad => {
    let count = ciudad === 'todos'
      ? gruposData.length
      : gruposData.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudad.toLowerCase()).length;

    const elementId = ciudad === 'todos' ? 'modalTotalCount' : `modal${ciudad.replace(/ /g, '')}Count`;
    const element = document.getElementById(elementId);
    if (element) element.textContent = count;
  });

  const badge = document.getElementById('selectedCityCount');
  if (badge) {
    const count = ciudadSeleccionada === 'todos'
      ? gruposData.length
      : gruposData.filter(g => g.ubicacion && g.ubicacion.toLowerCase() === ciudadSeleccionada.toLowerCase()).length;
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
  // --- Botón Admin ---
  document.getElementById('btnAdminLogin')?.addEventListener('click', function() {
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('loginUser').focus();
  });

  // --- Cerrar modal login ---
  document.getElementById('closeLoginBtn')?.addEventListener('click', function() {
    document.getElementById('loginModal').classList.remove('show');
  });

  // --- Cerrar login clic fuera ---
  document.getElementById('loginModal')?.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });

  // --- Enviar login ---
  document.getElementById('loginForm')?.addEventListener('submit', function(e) {
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

  // --- Filtros de plataforma ---
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      plataformaSeleccionada = this.dataset.platform;
      renderizarGrupos();
    });
  });

  // --- Abrir modal ciudades ---
  document.getElementById('openCityModalBtn')?.addEventListener('click', function() {
    document.getElementById('cityModal').style.display = 'flex';
  });

  // --- Cerrar modal ciudades ---
  document.getElementById('closeCityModalBtn')?.addEventListener('click', function() {
    document.getElementById('cityModal').style.display = 'none';
  });

  // --- Cerrar ciudades clic fuera ---
  document.getElementById('cityModal')?.addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
  });

  // --- Seleccionar ciudad ---
  document.querySelectorAll('.city-item').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.city-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      ciudadSeleccionada = this.dataset.city;
      document.getElementById('selectedCityName').textContent =
        ciudadSeleccionada === 'todos' ? 'Todos los departamentos' : ciudadSeleccionada;
      document.getElementById('cityModal').style.display = 'none';
      renderizarGrupos();
      actualizarContadoresCiudades();
    });
  });

  // --- Buscador de ciudades ---
  document.getElementById('citySearchInput')?.addEventListener('input', function() {
    const busqueda = this.value.toLowerCase().trim();
    document.querySelectorAll('.city-item').forEach(item => {
      const text = item.querySelector('.city-info span')?.textContent?.toLowerCase() || '';
      item.style.display = text.includes(busqueda) ? '' : 'none';
    });
  });

  // --- Logo reset ---
  document.getElementById('logoResetBtn')?.addEventListener('click', function() {
    ciudadSeleccionada = 'todos';
    plataformaSeleccionada = 'whatsapp';
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-platform="whatsapp"]')?.classList.add('active');
    document.getElementById('selectedCityName').textContent = 'Todos los departamentos';
    renderizarGrupos();
    actualizarContadoresCiudades();
  });
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Qigrupos Bolivia iniciado');
  cargarGrupos();
});
