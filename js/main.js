// ============================================================
// DATOS DE GRUPOS - CARGADOS DESDE JSON EXTERNO
// ============================================================

let gruposData = [];
let currentPlatform = "whatsapp";
let currentCity = "todos";
let isModalAnimating = false;

// ============================================================
// FUNCIONES PRINCIPALES
// ============================================================

function normalizarCiudad(ciudad) {
  if (!ciudad) return "otro";
  const c = ciudad.toLowerCase().trim();
  if (c === "santa cruz" || c === "santacruz" || c === "santa cruz de la sierra") return "Santa Cruz";
  if (c === "la paz" || c === "lapaz" || c === "el alto") return "La Paz";
  if (c === "cochabamba") return "Cochabamba";
  if (c === "sucre") return "Sucre";
  if (c === "tarija") return "Tarija";
  if (c === "potosí" || c === "potosi") return "Potosí";
  if (c === "oruro") return "Oruro";
  if (c === "beni" || c === "trinidad") return "Beni";
  if (c === "pando" || c === "cobija") return "Pando";
  return ciudad;
}

function unirseAlGrupo(link) {
  if (link && (link.includes("chat.whatsapp.com") || link.includes("wa.me"))) {
    window.open(link, "_blank");
  } else {
    alert("Enlace de invitación: " + link);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function actualizarContadores() {
  const gruposFiltradosPorPlataforma = gruposData.filter(g => g.plataforma === currentPlatform);
  const contar = (ciudad) => {
    if (ciudad === "todos") return gruposFiltradosPorPlataforma.length;
    return gruposFiltradosPorPlataforma.filter(g => normalizarCiudad(g.ubicacion) === ciudad).length;
  };

  const ids = {
    modalTotalCount: contar("todos"),
    modalSantaCruzCount: contar("Santa Cruz"),
    modalLaPazCount: contar("La Paz"),
    modalCochabambaCount: contar("Cochabamba"),
    modalSucreCount: contar("Sucre"),
    modalTarijaCount: contar("Tarija"),
    modalPotosiCount: contar("Potosí"),
    modalOruroCount: contar("Oruro"),
    modalBeniCount: contar("Beni"),
    modalPandoCount: contar("Pando")
  };

  for (const [id, value] of Object.entries(ids)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }

  const selectedCityCount = document.getElementById("selectedCityCount");
  if (selectedCityCount) selectedCityCount.innerText = `(${contar(currentCity)})`;

  const selectedCityName = document.getElementById("selectedCityName");
  if (selectedCityName) selectedCityName.innerText = currentCity === "todos" ? "Todos los departamentos" : currentCity;

  const resultCount = document.getElementById("resultCount");
  if (resultCount) resultCount.innerText = getGruposFiltrados().length;
}

function getGruposFiltrados() {
  let filtrados = gruposData.filter(g => g.plataforma === currentPlatform);
  if (currentCity !== "todos") {
    filtrados = filtrados.filter(g => normalizarCiudad(g.ubicacion) === currentCity);
  }
  return filtrados;
}

function renderGrupos() {
  const filtrados = getGruposFiltrados();
  const gruposContainer = document.getElementById("gruposContainer");
  if (!gruposContainer) return;

  if (filtrados.length === 0) {
    gruposContainer.innerHTML = `<div class="empty-message">
      <i class="fab fa-whatsapp"></i>
      No hay grupos de ${currentPlatform} en ${currentCity === "todos" ? "Bolivia" : currentCity} aún.<br>
      ¡Vuelve pronto para nuevos grupos!
    </div>`;
    return;
  }

  let html = "";
  filtrados.forEach(grupo => {
    html += `
      <div class="grupo-card" data-id="${grupo.id}">
        <div class="card-header">
          <h3>${escapeHtml(grupo.nombre)}</h3>
          <div class="badge-whatsapp"><i class="fab fa-whatsapp"></i> WA</div>
        </div>
        <div class="descripcion">${escapeHtml(grupo.descripcion)}</div>
        <div class="ubicacion">
          <i class="fas fa-map-pin"></i> ${escapeHtml(grupo.ubicacion)}
        </div>
        <div class="stats">
          <div class="stat-item"><i class="fas fa-user-friends"></i> ${grupo.miembros}</div>
          <div class="stat-item"><i class="fas fa-chart-line"></i> ${grupo.activos}</div>
        </div>
        <button class="join-btn" data-link="${grupo.link}"><i class="fab fa-whatsapp"></i> Unirme</button>
      </div>
    `;
  });

  gruposContainer.innerHTML = html;
  document.querySelectorAll(".join-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unirseAlGrupo(btn.getAttribute("data-link"));
    });
  });
}

function renderGrupoDestacadoFijo() {
  const container = document.getElementById("grupoDestacadoFijo");
  if (!container) return;

  const destacado = gruposData.find(g => g.destacado === true);
  
  if (!destacado) {
    container.innerHTML = "";
    return;
  }

  const html = `
    <div class="destacado-fijo">
      <div class="grupo-card destacado-card">
        <div class="destacado-ribbon">
          <i class="fas fa-crown"></i> GRUPO DESTACADO DE LA SEMANA
        </div>
        <div class="card-header">
          <h3>${escapeHtml(destacado.nombre)} <span class="badge-destacado">⭐ DESTACADO</span></h3>
          <div class="badge-whatsapp"><i class="fab fa-whatsapp"></i> WA</div>
        </div>
        <div class="descripcion">${escapeHtml(destacado.descripcion)}</div>
        <div class="ubicacion">
          <i class="fas fa-map-pin"></i> ${escapeHtml(destacado.ubicacion)}
          <span style="margin-left: auto; background:#FFD70020; padding:2px 8px; border-radius:20px; font-size:0.65rem;">🔥 +50 miembros/semana</span>
        </div>
        <div class="stats">
          <div class="stat-item"><i class="fas fa-user-friends"></i> ${destacado.miembros}</div>
          <div class="stat-item"><i class="fas fa-chart-line"></i> ${destacado.activos}</div>
        </div>
        <button class="join-btn" data-link="${destacado.link}"><i class="fab fa-whatsapp"></i> Unirme ahora</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  const btn = container.querySelector(".join-btn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unirseAlGrupo(btn.getAttribute("data-link"));
    });
  }
}

function setActivePlatform(platform) {
  currentPlatform = platform;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.getAttribute("data-platform") === platform);
  });
  actualizarContadores();
  renderGrupos();
  renderGrupoDestacadoFijo();
}

function setActiveCity(city) {
  currentCity = city;
  actualizarContadores();
  renderGrupos();
  
  const cityModal = document.getElementById("cityModal");
  if (cityModal && cityModal.style.display === "flex") {
    closeModalSuave(cityModal);
  }
}

function closeModalSuave(modal) {
  if (isModalAnimating) return;
  isModalAnimating = true;
  modal.style.display = "none";
  document.body.style.overflow = "";
  setTimeout(() => {
    isModalAnimating = false;
  }, 200);
}

function openModalSuave(modal) {
  if (isModalAnimating) return;
  isModalAnimating = true;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    isModalAnimating = false;
  }, 200);
}

function initCityModal() {
  const openBtn = document.getElementById("openCityModalBtn");
  const closeBtn = document.getElementById("closeCityModalBtn");
  const cityModal = document.getElementById("cityModal");
  const searchInput = document.getElementById("citySearchInput");

  if (openBtn) {
    const newOpenBtn = openBtn.cloneNode(true);
    openBtn.parentNode.replaceChild(newOpenBtn, openBtn);
    
    newOpenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cityModal && cityModal.style.display !== "flex") {
        actualizarContadores();
        openModalSuave(cityModal);
        if (searchInput) {
          searchInput.value = "";
          filterCityList("");
        }
      }
    });
  }

  const closeModal = () => {
    if (cityModal && cityModal.style.display === "flex") {
      closeModalSuave(cityModal);
    }
  };

  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener("click", closeModal);
  }
  
  if (cityModal) {
    cityModal.addEventListener("click", (e) => { 
      if (e.target === cityModal) closeModal(); 
    });
  }

  document.querySelectorAll(".city-item").forEach(item => {
    const newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);
    
    newItem.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const city = newItem.getAttribute("data-city");
      if (city) {
        setActiveCity(city);
      }
      closeModal();
    });
  });

  if (searchInput) {
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    newSearchInput.addEventListener("input", (e) => filterCityList(e.target.value.toLowerCase()));
  }
}

function filterCityList(searchTerm) {
  document.querySelectorAll(".city-item").forEach(item => {
    const cityName = item.querySelector(".city-info span")?.innerText.toLowerCase() || "";
    item.style.display = (searchTerm === "" || cityName.includes(searchTerm)) ? "flex" : "none";
  });
}

function resetFilters() {
  setActivePlatform("whatsapp");
  setActiveCity("todos");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function publishGroup() {
  const mensaje = encodeURIComponent("Hola! Quiero publicar mi grupo en Qigrupos Bolivia 🇧🇴");
  window.open("https://wa.me/59169356292?text=" + mensaje, "_blank");
}

// ============================================================
// CARGAR GRUPOS DESDE JSON EXTERNO
// ============================================================

async function cargarGrupos() {
  try {
    const response = await fetch('data/grupos.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    gruposData = data.grupos;
    console.log(`✅ ${gruposData.length} grupos cargados correctamente`);
    
    // Iniciar la página después de cargar los datos
    iniciarPagina();
  } catch (error) {
    console.error('❌ Error al cargar grupos:', error);
    const container = document.getElementById("gruposContainer");
    if (container) {
      container.innerHTML = `<div class="empty-message">
        <i class="fas fa-exclamation-triangle"></i>
        Error al cargar los grupos. Por favor, recarga la página.<br>
        <small>Detalle: ${error.message}</small>
      </div>`;
    }
  }
}

function iniciarPagina() {
  // Configurar filtros de plataforma
  const filterContainer = document.querySelector(".social-filters");
  if (filterContainer) {
    const originalChips = document.querySelectorAll(".filter-chip");
    originalChips.forEach(chip => {
      const newChip = chip.cloneNode(true);
      chip.parentNode.replaceChild(newChip, chip);
      newChip.addEventListener("click", () => {
        const platform = newChip.getAttribute("data-platform");
        if (platform) setActivePlatform(platform);
      });
    });
  }

  // Logo clickeable para resetear filtros
  const logoReset = document.getElementById("logoResetBtn");
  if (logoReset) {
    logoReset.addEventListener("click", resetFilters);
  }

  // Botón Publicar grupo en navbar
  const publishBtn = document.getElementById("publishGroupBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", publishGroup);
  }

  initCityModal();
  renderGrupoDestacadoFijo();
  actualizarContadores();
  setActivePlatform("whatsapp");
  setActiveCity("todos");
}

// ============================================================
// INICIALIZACIÓN - Cargar grupos desde JSON
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  cargarGrupos();
});