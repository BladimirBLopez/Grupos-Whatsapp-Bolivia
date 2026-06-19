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
// BANNER GRUPO DESTACADO - BLANCO DORADO PREMIUM
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
      border-radius: 22px;
      overflow: hidden;
      margin-bottom: 1.2rem;
      background: #ffffff;
      border: 2.5px solid #E8B923;
      box-shadow:
        0 0 0 5px rgba(232,185,35,0.12),
        0 12px 40px rgba(232,185,35,0.2),
        0 4px 16px rgba(0,0,0,0.08);
    ">

      <!-- Franja superior dorada -->
      <div style="
        background: linear-gradient(90deg, #B8860B, #FFD700, #F5A623, #FFD700, #B8860B);
        padding: 9px 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        <i class="fas fa-crown" style="color:#fff; font-size:0.85rem; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></i>
        <span style="
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 3px;
          color: #fff;
          text-transform: uppercase;
          text-shadow: 0 1px 3px rgba(0,0,0,0.25);
        ">Grupo destacado de la semana</span>
        <i class="fas fa-crown" style="color:#fff; font-size:0.85rem; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></i>
      </div>

      <!-- Línea decorativa dorada fina -->
      <div style="height: 3px; background: linear-gradient(90deg, transparent, #FFD70055, #FFD700, #FFD70055, transparent);"></div>

      <!-- Cuerpo -->
      <div style="padding: 1.2rem 1.3rem 1.4rem;">

        <!-- Nombre + badge plataforma -->
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:0.5rem;">
          <h3 style="
            margin: 0;
            font-size: 1.2rem;
            font-weight: 800;
            color: #0f1f2e;
            line-height: 1.25;
            flex: 1;
          ">${destacado.nombre}</h3>
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: ${color}18;
            color: ${color};
            border: 1.5px solid ${color}60;
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

        <!-- Badge DESTACADO -->
        <div style="margin-bottom: 0.7rem;">
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: linear-gradient(135deg, #B8860B, #FFD700);
            color: #fff;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 3px 10px;
            border-radius: 20px;
            letter-spacing: 1px;
            text-transform: uppercase;
            box-shadow: 0 2px 8px rgba(232,185,35,0.4);
          ">
            <i class="fas fa-star"></i> Verificado & Destacado
          </span>
        </div>

        <!-- Descripción -->
        ${destacado.descripcion ? `
        <p style="
          margin: 0 0 0.9rem;
          font-size: 0.82rem;
          color: #5a7080;
          line-height: 1.5;
          padding: 0.6rem 0.8rem;
          background: #f8fafc;
          border-radius: 10px;
          border-left: 3px solid #E8B923;
        ">${destacado.descripcion}</p>` : ''}

        <!-- Ciudad + badge caliente -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-bottom:1rem;">
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #e65100;
          ">
            <i class="fas fa-map-marker-alt"></i> ${destacado.ubicacion || 'Bolivia'}
          </span>
          <span style="
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(255,107,53,0.35);
          ">🔥 +50 miembros/semana</span>
        </div>

        <!-- Stats en cajitas -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
          margin-bottom: 1.1rem;
        ">
          <div style="
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 0.7rem;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-users" style="color:#16a34a; font-size:1rem;"></i>
            <div>
              <div style="font-size:1rem; font-weight:800; color:#0f1f2e;">${destacado.miembros || 0}</div>
              <div style="font-size:0.62rem; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px;">Miembros</div>
            </div>
          </div>
          <div style="
            background: linear-gradient(135deg, #fffbeb, #fef3c7);
            border: 1px solid #fde68a;
            border-radius: 12px;
            padding: 0.7rem;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-chart-line" style="color:#d97706; font-size:1rem;"></i>
            <div>
              <div style="font-size:1rem; font-weight:800; color:#0f1f2e;">${destacado.activos || 0}</div>
              <div style="font-size:0.62rem; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px;">Activos</div>
            </div>
          </div>
        </div>

        <!-- Botón unirse -->
        <a href="${destacado.link}" target="_blank" rel="noopener noreferrer" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, ${color}, ${color}dd);
          color: white;
          padding: 14px 20px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 1rem;
          text-decoration: none;
          box-shadow: 0 6px 24px ${color}55;
          letter-spacing: 0.2px;
        "
        onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 30px ${color}77';"
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 6px 24px ${color}55';"
        >
          <i class="${icono}" style="font-size:1.2rem;"></i>
          Unirme ahora
          <i class="fas fa-arrow-right" style="font-size:0.85rem; opacity:0.85;"></i>
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

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      plataformaSeleccionada = this.dataset.platform;
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

  document.getElementById('citySearchInput')?.addEventListener('input', function() {
    const busqueda = this.value.toLowerCase().trim();
    document.querySelectorAll('.city-item').forEach(item => {
      const text = item.querySelector('.city-info span')?.textContent?.toLowerCase() || '';
      item.style.display = text.includes(busqueda) ? '' : 'none';
    });
  });

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
  cargarGrupos();
});
