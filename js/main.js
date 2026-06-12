// ============================================================
// CONFIGURACIÓN JSONBIN.IO
// ============================================================

const JSONBIN_CONFIG = {
  binId: "6a2c83a1da38895dfeb7b5f0",
  apiKey: "$2a$10$hnUNwhd.U/cmnfflqWjWUe6umo9IEsrCZlua/0JGhHiXN5vtZfqNq",
  url: function() {
    return `https://api.jsonbin.io/v3/b/${this.binId}`;
  }
};

let gruposData = [];

async function cargarGruposDesdeStorage() {
  try {
    const res = await fetch(JSONBIN_CONFIG.url(), {
      headers: { "X-Master-Key": JSONBIN_CONFIG.apiKey }
    });
    const data = await res.json();
    gruposData = data.record.grupos || [];

    if (gruposData.length === 0) {
      gruposData = [
        {
          id: 1,
          nombre: "🇳🇬🅒🅞🅜🅟🅡Á 🅨 🅥🅔🅝🅣🅐.🅢🅒🅩🇳🇬",
          descripcion: "Grupo de compra y venta en Santa Cruz, Bolivia.",
          ubicacion: "Santa Cruz",
          miembros: 27,
          activos: 24,
          link: "https://chat.whatsapp.com/KVTyedioIByCZBt6ZHfCVr",
          plataforma: "whatsapp"
        }
      ];
      await guardarGruposEnStorage();
    }
  } catch (e) {
    console.error("Error cargando grupos:", e);
    gruposData = [];
  }
  window.gruposData = gruposData;
}

async function guardarGruposEnStorage() {
  try {
    await fetch(JSONBIN_CONFIG.url(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_CONFIG.apiKey
      },
      body: JSON.stringify({ grupos: gruposData })
    });
    window.gruposData = gruposData;
  } catch (e) {
    console.error("Error guardando grupos:", e);
  }
}

let currentPlatform = "whatsapp";
let currentCity = "todos";

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

async function agregarGrupoDesdeAdmin(nombre, descripcion, link, ciudad, miembros) {
  const newGroup = {
    id: Date.now(),
    nombre,
    descripcion: descripcion || "Grupo de compra y venta en Bolivia",
    ubicacion: ciudad,
    miembros: parseInt(miembros) || 1,
    activos: Math.floor((parseInt(miembros) || 1) * 0.85),
    link,
    plataforma: "whatsapp"
  };

  gruposData.push(newGroup);
  await guardarGruposEnStorage();
  actualizarContadores();

  if (currentPlatform === "whatsapp") {
    renderGrupos();
  } else {
    setActivePlatform("whatsapp");
  }
  return true;
}

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
  if (selectedCityCount) selectedCityCount.innerText = `(${contar(currentCity)})`;

  const selectedCityName = document.getElementById("selectedCityName");
  if (selectedCityName) selectedCityName.innerText = currentCity === "todos" ? "Todos los departamentos" : currentCity;

  const resultCount = document.getElementById("resultCount");
  if (resultCount) resultCount.innerText = getGruposFiltrados().length;
}

function getGruposFiltrados() {
  let filtrados = gruposData.filter(grupo => grupo.plataforma === currentPlatform);
  if (currentCity !== "todos") {
    filtrados = filtrados.filter(grupo => normalizarCiudad(grupo.ubicacion) === currentCity);
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

function setActivePlatform(platform) {
  currentPlatform = platform;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.getAttribute("data-platform") === platform);
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
  cityModal.addEventListener("click", (e) => { if (e.target === cityModal) closeModal(); });

  document.querySelectorAll(".city-item").forEach(item => {
    item.addEventListener("click", () => {
      const city = item.getAttribute("data-city");
      if (city) setActiveCity(city);
      closeModal();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => filterCityList(e.target.value.toLowerCase()));
  }
}

function filterCityList(searchTerm) {
  document.querySelectorAll(".city-item").forEach(item => {
    const cityName = item.querySelector(".city-info span")?.innerText.toLowerCase() || "";
    item.style.display = (searchTerm === "" || cityName.includes(searchTerm)) ? "flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const gruposContainer = document.getElementById("gruposContainer");
  if (gruposContainer) {
    gruposContainer.innerHTML = `<div class="empty-message"><i class="fas fa-spinner fa-spin"></i> Cargando grupos...</div>`;
  }

  await cargarGruposDesdeStorage();

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

window.agregarGrupoDesdeAdmin = agregarGrupoDesdeAdmin;
window.actualizarContadores = actualizarContadores;
window.renderGrupos = renderGrupos;
window.gruposData = gruposData;