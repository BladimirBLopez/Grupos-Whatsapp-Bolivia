// ============================================
// VARIABLES GLOBALES
// ============================================
let gruposData = [];
let ciudadSeleccionada = 'todos';
let plataformaSeleccionada = 'whatsapp';
let gruposMostrados = 5;
const GRUPOS_POR_PAGINA = 5;

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
  try {
    const response = await fetch('/api/grupos');
    if (response.ok) {
      const data = await response.json();
      gruposData = data.grupos || [];
    } else {
      const localResponse = await fetch('data/grupos.json');
      const data = await localResponse.json();
      gruposData = data.grupos || [];
    }
    iniciarPagina();
  } catch (error) {
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
  mostrarGrupoDestacado();
  actualizarContadoresCiudades();
  renderizarGrupos();
  configurarEventListeners();
}

// ============================================
// BANNER GRUPO DESTACADO - COMPACTO BLANCO/DORADO
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
      border-radius: 18px;
      overflow: hidden;
      margin-bottom: 1rem;
      background: #ffffff;
      border: 2px solid #E8B923;
      box-shadow: 0 0 0 4px rgba(232,185,35,0.1), 0 8px 28px rgba(232,185,35,0.18), 0 2px 10px rgba(0,0,0,0.06);
    ">
      <div style="
        background: linear-gradient(90deg, #B8860B, #FFD700, #F5A623, #FFD700, #B8860B);
        padding: 7px 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      ">
        <i class="fas fa-crown" style="color:#fff; font-size:0.75rem;"></i>
        <span style="font-size:0.6rem; font-weight:900; letter-spacing:3px; color:#fff; text-transform:uppercase;">
          Grupo destacado de la semana
        </span>
        <i class="fas fa-crown" style="color:#fff; font-size:0.75rem;"></i>
      </div>

      <div style="padding: 0.85rem 1rem;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:0.4rem; flex-wrap:wrap;">
          <h3 style="margin:0; font-size:1rem; font-weight:800; color:#0f1f2e; flex:1;">${destacado.nombre}</h3>
          <div style="display:flex; gap:5px; align-items:center; flex-shrink:0;">
            <span style="
              background: linear-gradient(135deg, #B8860B, #FFD700);
              color:#fff; font-size:0.6rem; font-weight:800;
              padding:3px 8px; border-radius:20px;
              display:inline-flex; align-items:center; gap:3px;
            "><i class="fas fa-star"></i> DESTACADO</span>
            <span style="
              background:${color}18; color:${color};
              border:1.5px solid ${color}55;
              font-size:0.6rem; font-weight:700;
              padding:3px 8px; border-radius:20px;
              display:inline-flex; align-items:center; gap:3px;
            "><i class="${icono}"></i> ${label}</span>
          </div>
        </div>

        ${destacado.descripcion ? `
        <p style="
          margin:0 0 0.5rem;
          font-size:0.78rem; color:#5a7080; line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
        ">${destacado.descripcion}</p>` : ''}

        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px; margin-bottom:0.5rem;">
          <span style="font-size:0.78rem; font-weight:700; color:#e65100;">
            <i class="fas fa-map-marker-alt"></i> ${destacado.ubicacion || 'Bolivia'}
          </span>
          <span style="
            background:linear-gradient(135deg,#ff6b35,#f7931e);
            color:#fff; font-size:0.68rem; font-weight:700;
            padding:2px 9px; border-radius:20px;
            box-shadow:0 2px 6px rgba(255,107,53,0.3);
          ">🔥 +50 miembros/semana</span>
        </div>

        <div style="font-size:0.78rem; color:#555; margin-bottom:0.75rem;">
          👥 ${destacado.miembros || 0} &nbsp;·&nbsp; 📈 ${destacado.activos || 0}
        </div>

        <a href="${destacado.link}" target="_blank" rel="noopener noreferrer" style="
          display:inline-flex; align-items:center; gap:7px;
          background:linear-gradient(135deg, ${color}, ${color}cc);
          color:#fff; padding:9px 20px; border-radius:50px;
          font-weight:800; font-size:0.88rem; text-decoration:none;
          box-shadow:0 4px 16px ${color}44;
        "
        onmouseover="this.style.transform='scale(1.02)';"
        onmouseout="this.style.transform='scale(1)';"
        >
          <i class="${icono}"></i> Unirme ahora
        </a>
      </div>
    </div>
  `;
}

// ============================================
// RENDERIZAR GRUPOS CON PAGINACIÓN
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
  const total = gruposOrdenados.length;
  const visibles = gruposOrdenados.slice(0, gruposMostrados);

  const resultCount = document.getElementById('resultCount');
  if (resultCount) resultCount.textContent = total;

  if (total === 0) {
    container.innerHTML = `
      <div class="empty-message">
        <i class="fas fa-search" style="font-size:2rem; display:block; margin-bottom:0.5rem;"></i>
        No se encontraron grupos para esta búsqueda
      </div>`;
    return;
  }

  const tarjetas = visibles.map(grupo => {
    const plat  = grupo.plataforma || 'whatsapp';
    const icono = iconoPlataforma(plat);
    const color = colorPlataforma(plat);
    const label = labelPlataforma(plat);

    return `
    <div class="grupo-card">
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

  // Botón "Ver más" si quedan grupos
  const hayMas = gruposMostrados < total;
  const botonVerMas = hayMas ? `
    <div style="text-align:center; margin-top:1rem;">
      <button id="btnVerMas" style="
        background:#fff;
        border: 2px solid #25D366;
        color: #25D366;
        font-weight: 700;
        font-size: 0.9rem;
        padding: 10px 28px;
        border-radius: 50px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        box-shadow: 0 2px 10px rgba(37,211,102,0.15);
        transition: all 0.2s;
      "
      onmouseover="this.style.background='#25D366'; this.style.color='#fff';"
      onmouseout="this.style.background='#fff'; this.style.color='#25D366';"
      >
        <i class="fas fa-chevron-down"></i>
        Ver más grupos (${total - gruposMostrados} restantes)
      </button>
    </div>` : '';

  container.innerHTML = tarjetas + botonVerMas;

  // Evento del botón ver más
  document.getElementById('btnVerMas')?.addEventListener('click', () => {
    gruposMostrados += GRUPOS_POR_PAGINA;
    renderizarGrupos();
    // Scroll suave al nuevo contenido
    const cards = container.querySelectorAll('.grupo-card');
    if (cards.length > 0) {
      cards[cards.length - GRUPOS_POR_PAGINA]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
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
  document.getElementById('btnAdminLogin')?.addEventListener('click', function() {
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('loginUser').focus();
  });

  document.getElementById('closeLoginBtn')?.addEventListener('click', function() {
    document.getElementById('loginModal').classList.remove('show');
  });

  document.getElementById('loginModal')?.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });

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

  // Filtros plataforma — resetea paginación
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      plataformaSeleccionada = this.dataset.platform;
      gruposMostrados = GRUPOS_POR_PAGINA;
      renderizarGrupos();
    });
  });

  document.getElementById('openCityModalBtn')?.addEventListener('click', function() {
    document.getElementById('cityModal').style.display = 'flex';
  });

  document.getElementById('closeCityModalBtn')?.addEventListener('click', function() {
    document.getElementById('cityModal').style.display = 'none';
  });

  document.getElementById('cityModal')?.addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
  });

  // Seleccionar ciudad — resetea paginación
  document.querySelectorAll('.city-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      document.querySelectorAll('.city-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      ciudadSeleccionada = this.dataset.city;
      document.getElementById('selectedCityName').textContent =
        ciudadSeleccionada === 'todos' ? 'Todos los departamentos' : ciudadSeleccionada;
      document.getElementById('cityModal').style.display = 'none';
      gruposMostrados = GRUPOS_POR_PAGINA;
      renderizarGrupos();
      actualizarContadoresCiudades();
    });
  });

  document.getElementById('citySearchInput')?.addEventListener('input', function() {
    const busqueda = this.value.toLowerCase().trim();
    document.querySelectorAll('.city-item').forEach(item => {
      const text = item.querySelector('.city-info span')?.textContent?.toLowerCase() || '';
      item.style.display = text.includes(busqueda) ? '' : 'none';
    });
  });

  // Logo reset — resetea paginación
  document.getElementById('logoResetBtn')?.addEventListener('click', function() {
    ciudadSeleccionada = 'todos';
    plataformaSeleccionada = 'whatsapp';
    gruposMostrados = GRUPOS_POR_PAGINA;
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
  cargarGrupos();
});
