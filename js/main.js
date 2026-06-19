// ============================================
// VARIABLES GLOBALES
// ============================================
let gruposData = [];
let ciudadSeleccionada = 'todos';
let plataformaSeleccionada = 'whatsapp';

// ============================================
// HELPER: ÍCONO Y COLOR POR PLATAFORMA
// ============================================
function iconoPlataforma(plataforma) {
  const iconos = {
    whatsapp: 'fab fa-whatsapp',
    telegram:  'fab fa-telegram',
    facebook:  'fab fa-facebook',
    discord:   'fab fa-discord',
    otro:      'fas fa-link'
  };
  return iconos[(plataforma || 'whatsapp').toLowerCase()] || 'fab fa-whatsapp';
}

function colorPlataforma(plataforma) {
  const colores = {
    whatsapp: '#25D366',
    telegram:  '#229ED9',
    facebook:  '#1877F2',
    discord:   '#5865F2',
    otro:      '#8ba0ae'
  };
  return colores[(plataforma || 'whatsapp').toLowerCase()] || '#25D366';
}

function labelPlataforma(plataforma) {
  const labels = {
    whatsapp: 'WhatsApp',
    telegram:  'Telegram',
    facebook:  'Facebook',
    discord:   'Discord',
    otro:      'Otro'
  };
  return labels[(plataforma || 'whatsapp').toLowerCase()] || 'WhatsApp';
}

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

  mostrarGrupoDestacado();
  actualizarContadoresCiudades();
  renderizarGrupos();
  configurarEventListeners();
}

// ============================================
// BANNER GRUPO DESTACADO - DISEÑO PREMIUM
// ============================================
function mostrarGrupoDestacado() {
  const banner = document.getElementById('grupoDestacadoFijo');
  if (!banner) return;
  const destacado = gruposData.find(g => g.destacado === true);
  if (!destacado) { banner.innerHTML = ''; return; }

  const plat  = destacado.plataforma || 'whatsapp';
  const icono = iconoPlataforma(plat);
  const color = colorPlataforma(plat);
  const label = labelPlataforma(plat);

  banner.innerHTML = `
    <div style="
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 1.2rem;
      background: linear-gradient(135deg, #0f2027, #1a3a2a, #0f2027);
      box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06);
    ">
      <!-- Glow de fondo -->
      <div style="
        position: absolute;
        top: -40px; right: -40px;
        width: 180px; height: 180px;
        background: radial-gradient(circle, ${color}55 0%, transparent 70%);
        pointer-events: none;
      "></div>

      <!-- Header con corona -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        background: linear-gradient(90deg, transparent, rgba(255,215,0,0.12), transparent);
        border-bottom: 1px solid rgba(255,215,0,0.2);
      ">
        <i class="fas fa-crown" style="color:#FFD700; font-size:0.8rem;"></i>
        <span style="
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 3px;
          color: #FFD700;
          text-transform: uppercase;
        ">Grupo destacado de la semana</span>
        <i class="fas fa-crown" style="color:#FFD700; font-size:0.8rem;"></i>
      </div>

      <!-- Cuerpo -->
      <div style="padding: 1.1rem 1.3rem 1.3rem;">

        <!-- Nombre + badge plataforma -->
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:0.6rem;">
          <h3 style="
            margin: 0;
            font-size: 1.15rem;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.2;
            flex: 1;
          ">${destacado.nombre}</h3>
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: ${color}22;
            color: ${color};
            border: 1px solid ${color}55;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 20px;
            white-space: nowrap;
            flex-shrink: 0;
          ">
            <i class="${icono}"></i> ${label}
          </span>
        </div>

        <!-- Descripción -->
        ${destacado.descripcion ? `
        <p style="
          margin: 0 0 0.8rem;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.4;
        ">${destacado.descripcion}</p>` : ''}

        <!-- Ciudad + badge caliente -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:0.9rem;">
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 0.78rem;
            font-weight: 600;
            color: ${color};
          ">
            <i class="fas fa-map-marker-alt"></i> ${destacado.ubicacion || 'Bolivia'}
          </span>
          <span style="
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          ">🔥 +50 miembros/semana</span>
        </div>

        <!-- Separador -->
        <div style="height:1px; background:rgba(255,255,255,0.08); margin-bottom:0.9rem;"></div>

        <!-- Stats -->
        <div style="display:flex; gap:1.5rem; margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="
              width: 30px; height: 30px;
              background: rgba(255,255,255,0.07);
              border-radius: 8px;
              display: flex; align-items: center; justify-content: center;
            ">
              <i class="fas fa-users" style="color:rgba(255,255,255,0.5); font-size:0.75rem;"></i>
            </div>
            <div>
              <div style="font-size:0.95rem; font-weight:800; color:#fff;">${destacado.miembros || 0}</div>
              <div style="font-size:0.62rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px;">Miembros</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="
              width: 30px; height: 30px;
              background: rgba(255,255,255,0.07);
              border-radius: 8px;
              display: flex; align-items: center; justify-content: center;
            ">
              <i class="fas fa-chart-line" style="color:rgba(255,255,255,0.5); font-size:0.75rem;"></i>
            </div>
            <div>
              <div style="font-size:0.95rem; font-weight:800; color:#fff;">${destacado.activos || 0}</div>
              <div style="font-size:0.62rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px;">Activos</div>
            </div>
          </div>
        </div>

        <!-- Botón unirse -->
        <a href="${destacado.link}" target="_blank" rel="noopener noreferrer" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, ${color}, ${color}cc);
          color: white;
          padding: 13px 20px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 4px 20px ${color}55;
          transition: all 0.2s;
          letter-spacing: 0.2px;
        "
        onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 28px ${color}88';"
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 20px ${color}55';"
        >
          <i class="${icono}" style="font-size:1.1rem;"></i>
          Unirme ahora
          <i class="fas fa-arrow-right" style="font-size:0.8rem; opacity:0.8;"></i>
        </a>

      </div>
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
      (g.plataforma || 'whatsapp').toLowerCase() === plataformaSeleccionada.toLowerCase()
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

  container.innerHTML = gruposOrdenados.map(grupo => {
    const plat  = grupo.plataforma || 'whatsapp';
    const icono = iconoPlataforma(plat);
    const color = colorPlataforma(plat);
    const label = labelPlataforma(plat);

    return `
    <div class="grupo-card ${grupo.destacado ? 'destacado-card' : ''}">
      ${grupo.destacado ? `
        <div class="destacado-ribbon">
          <i class="fas fa-star"></i> GRUPO DESTACADO
        </div>` : ''}
      <div class="card-header">
        <h3>${grupo.nombre || 'Sin nombre'}</h3>
        <span class="badge-whatsapp" style="background:${color}20; color:${color}; border:1px solid ${color}40;">
          <i class="${icono}"></i> ${label}
        </span>
      </div>
      ${grupo.descripcion ? `<div class="descripcion">${grupo.descripcion}</div>` : ''}
      <div class="ubicacion">
        <i class="fas fa-map-marker-alt"></i> ${grupo.ubicacion || 'Ubicación no especificada'}
      </div>
      <div class="stats">
        <span class="stat-item"><i class="fas fa-users"></i> ${grupo.miembros || 0} miembros</span>
        <span class="stat-item"><i class="fas fa-chart-line"></i> ${grupo.activos || 0} activos</span>
      </div>
      <a href="${grupo.link || '#'}" target="_blank" rel="noopener noreferrer"
         class="join-btn" style="background:${color};">
        <i class="${icono}"></i> Unirse al grupo
      </a>
    </div>`;
  }).join('');
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
