// ============================================================
// BASE DE DATOS DE GRUPOS - CON LOCALSTORAGE
// ============================================================

let gruposData = [];

function cargarGruposDesdeStorage() {
  const guardados = localStorage.getItem("qigrupos_grupos");
  if (guardados) {
    gruposData = JSON.parse(guardados);
  } else {
    gruposData = [
      {
        id: 1,
        nombre: "🇳🇬🅒🅞🅜🅟🅡Á 🅨 🅥🅔🅝🅣🅐.🅢🅒🅩🇳🇬",
        descripcion: "Grupo de compra y venta en Santa Cruz, Bolivia. Comparte productos, servicios y ofertas.",
        ubicacion: "Santa Cruz",
        miembros: 27,
        activos: 24,
        link: "https://chat.whatsapp.com/KVTyedioIByCZBt6ZHfCVr",
        plataforma: "whatsapp"
      }
    ];
    guardarGruposEnStorage();
  }
  window.gruposData = gruposData;
}

function guardarGruposEnStorage() {
  localStorage.setItem("qigrupos_grupos", JSON.stringify(gruposData));
  window.gruposData = gruposData;
}

let currentPlatform = "whatsapp";
let currentCity = "todos";

// ============================================================
// FUNCIONES AUXILIARES
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

// ============================================================
// AGREGAR GRUPO DESDE ADMIN
// ============================================================

function agregarGrupoDesdeAdmin(nombre, descripcion, link, ciudad, miembros) {
  const newId = gruposData.length + 1;
  const newGroup = {
    id: newId,
    nombre: nombre,
    descripcion: descripcion || "Grupo de compra y venta en Bolivia",
    ubicacion: ciudad,
    miembros: parseInt(miembros) || 1,
    activos: Math.floor((parseInt(miembros) || 1) * 0.85),
    link: link,
    plataforma: "whatsapp"
  };
  
  gruposData.push(newGroup);
  guardarGruposEnStorage();
  actualizarContadores();
  
  if (currentPlatform === "whatsapp") {
    renderGrupos();
  } else {
    setActivePlatform("whatsapp");
  }
  
  return true;
}

// ============================================================
// CONTAR GRUPOS POR CIUDAD
// ============================================================

function actualizarContadores() {
  const gruposWhatsApp = gruposData.filter(g => g.plataforma === "whatsapp");
  
  const contar = (ciudad) => {
    if (ciudad === "todos") return gruposWhatsApp.length;
    return gruposWhatsApp.filter(g => normalizarCiudad(g.ubicacion) === ciudad).length;
  };
  
  const modalContadores = {
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
  
  for (const [id, value] of Object.entries(modalContadores)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }
  
  const selectedCityCount = document.getElementById("selectedCityCount");
  if (selectedCityCount) {
    if (currentCity === "todos") {
      selectedCityCount.innerText = `(${contar("todos")})`;
    } else {
      selectedCityCount.innerText = `(${contar(currentCity)})`;
    }
  }
  
  const selectedCityName = document.getElementById("selectedCityName");
  if (selectedCityName) {
    if (currentCity === "todos") {
      selectedCityName.innerText = "Todos los departamentos";
    } else {
      selectedCityName.innerText = currentCity;
    }
  }
  
  const resultCount = document.getElementById("resultCount");
  if (resultCount) {
    const filtrados = getGruposFiltrados();
    resultCount.innerText = filtrados.length;
  }
}

// ============================================================
// FILTRAR GRUPOS
// ============================================================

function getGruposFiltrados() {
  let filtrados = gruposData.filter(grupo => grupo.plataforma === currentPlatform);
  if (currentCity !== "todos") {
    filtrados = filtrados.filter(grupo => normalizarCiudad(grupo.ubicacion) === currentCity);
  }
  return filtrados;
}

// ============================================================
// RENDERIZAR GRUPOS
// ============================================================

function renderGrupos() {
  const filtrados = getGruposFiltrados();
  const gruposContainer = document.getElementById("gruposContainer");
  if (!gruposContainer) return;
  
  if (filtrados.length === 0) {
    gruposContainer.innerHTML = `<div class="empty-message">
      <i class="fab fa-whatsapp"></i> 
      No hay grupos de ${currentPlatform} en ${currentCity === "todos" ? "Bolivia" : currentCity} aún.<br>
      ${window.adminFunctions?.isLogged() ? 'Usa el botón "Agregar" para añadir uno.' : '¡Vuelve pronto para nuevos grupos!'}
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
          <span style="margin-left: auto; font-size:0.65rem; background:#eaf7f0; padding:2px 8px; border-radius:20px;">🇧🇴</span>
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

// ============================================================
// CAMBIAR FILTROS
// ============================================================

function setActivePlatform(platform) {
  currentPlatform = platform;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    const chipPlatform = chip.getAttribute("data-platform");
    if (chipPlatform === platform) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
  actualizarContadores();
  renderGrupos();
}

function setActiveCity(city) {
  currentCity = city;
  actualizarContadores();
  renderGrupos();
  
  const cityModal = document.getElementById("cityModal");
  if (cityModal) cityModal.style.display = "none";
}

// ============================================================
// MODAL DE CIUDADES
// ============================================================

function initCityModal() {
  const openBtn = document.getElementById("openCityModalBtn");
  const closeBtn = document.getElementById("closeCityModalBtn");
  const cityModal = document.getElementById("cityModal");
  const searchInput = document.getElementById("citySearchInput");
  
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      cityModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (searchInput) searchInput.value = "";
      filterCityList("");
    });
  }
  
  const closeModal = () => {
    cityModal.style.display = "none";
    document.body.style.overflow = "";
  };
  
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  
  cityModal.addEventListener("click", (e) => {
    if (e.target === cityModal) closeModal();
  });
  
  document.querySelectorAll(".city-item").forEach(item => {
    item.addEventListener("click", () => {
      const city = item.getAttribute("data-city");
      if (city) setActiveCity(city);
      closeModal();
    });
  });
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterCityList(e.target.value.toLowerCase());
    });
  }
}

function filterCityList(searchTerm) {
  document.querySelectorAll(".city-item").forEach(item => {
    const cityName = item.querySelector(".city-info span")?.innerText.toLowerCase() || "";
    if (searchTerm === "" || cityName.includes(searchTerm)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// ============================================================
// INICIALIZAR
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  cargarGruposDesdeStorage();
  
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const platform = chip.getAttribute("data-platform");
      if (platform) setActivePlatform(platform);
    });
  });
  
  document.getElementById("homeBtn")?.addEventListener("click", () => {
    setActivePlatform("whatsapp");
    setActiveCity("todos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  
  initCityModal();
  actualizarContadores();
  setActivePlatform("whatsapp");
  setActiveCity("todos");
});

// Exportar funciones para admin.js
window.agregarGrupoDesdeAdmin = agregarGrupoDesdeAdmin;
window.actualizarContadores = actualizarContadores;
window.renderGrupos = renderGrupos;
window.gruposData = gruposData;