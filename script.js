const STORAGE_KEYS = {
    orders: "electrofix_orders",
    clients: "electrofix_clients",
    session: "electrofix_session",
};

const dom = {
    clientAccessBtn: document.getElementById("client-access-btn"),
    clientLogoutBtn: document.getElementById("client-logout-btn"),
    clientAccessPanel: document.getElementById("client-access-panel"),
    loginModeBtn: document.getElementById("login-mode-btn"),
    registerModeBtn: document.getElementById("register-mode-btn"),
    loginForm: document.getElementById("client-login-form"),
    registerForm: document.getElementById("client-register-form"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    registerName: document.getElementById("register-name"),
    registerEmail: document.getElementById("register-email"),
    registerPassword: document.getElementById("register-password"),
    registerPasswordConfirm: document.getElementById("register-password-confirm"),
    clientAccessMessage: document.getElementById("client-access-message"),
    clientRegisterMessage: document.getElementById("client-register-message"),
    clientTabLink: document.getElementById("client-tab-link"),
    orderForm: document.getElementById("order-form"),
    orderList: document.getElementById("order-list"),
    searchInput: document.getElementById("search"),
    filterStatus: document.getElementById("filter-status"),
    statTotal: document.getElementById("stat-total"),
    statRepair: document.getElementById("stat-repair"),
    statSale: document.getElementById("stat-sale"),
    deliverySection: document.getElementById("entrega"),
    clientOrderSelect: document.getElementById("client-order-select"),
    deliveryOrderId: document.getElementById("delivery-order-id"),
    deliveryEquipo: document.getElementById("delivery-equipo"),
    deliveryAccesorios: document.getElementById("delivery-accesorios"),
    deliveryEstado: document.getElementById("delivery-estado"),
    deliveryNotes: document.getElementById("delivery-notes"),
    deliveryMessage: document.getElementById("delivery-message"),
    clientOrdersMessage: document.getElementById("client-orders-message"),
};

let orders = loadData(STORAGE_KEYS.orders, []);
let clients = loadData(STORAGE_KEYS.clients, []);
let currentUser = loadData(STORAGE_KEYS.session, null);

function loadData(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
        console.error(`Error cargando ${key}:`, error);
        return fallback;
    }
}

function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStatusClass(status) {
    return status.replace(/\s+/g, "-");
}

function formatDate(value) {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleDateString("es-AR");
}

function setSession(user) {
    currentUser = user;
    saveData(STORAGE_KEYS.session, user);
}

function clearSession() {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.session);
}

function updateInterface() {
    const loggedIn = Boolean(currentUser);
    dom.clientTabLink.classList.toggle("hidden", !loggedIn);
    dom.clientLogoutBtn.classList.toggle("hidden", !loggedIn);
    dom.clientAccessBtn.classList.toggle("hidden", loggedIn);
    dom.clientAccessPanel.classList.add("hidden");
    dom.clientAccessMessage.textContent = "";
    dom.clientRegisterMessage.textContent = "";
    dom.deliveryMessage.textContent = "";
    dom.clientOrdersMessage.textContent = "";
    dom.deliverySection.classList.toggle("hidden", !loggedIn);
    renderOrders();
    fillClientOrders();
}

function renderOrders() {
    const searchValue = dom.searchInput.value.trim().toLowerCase();
    const filterValue = dom.filterStatus.value;
    const filteredOrders = orders.filter((order) => {
        const matchesSearch = [order.cliente, order.email, order.categoria, order.detalle]
            .join(" ")
            .toLowerCase()
            .includes(searchValue);

        const matchesFilter = filterValue === "Todas" || order.estado === filterValue;

        return matchesSearch && matchesFilter;
    });

    dom.orderList.innerHTML = "";

    if (filteredOrders.length === 0) {
        dom.orderList.innerHTML = `
      <p class="empty-state">
        Aún no hay órdenes o no hay resultados para la búsqueda.
      </p>
    `;
        updateStats();
        return;
    }

    filteredOrders.forEach((order) => {
        const card = document.createElement("article");
        card.className = "order-card";

        const statusClass = normalizeStatusClass(order.estado);

        const chip = `<span class="chip status-${statusClass}">${order.estado}</span>`;

        card.innerHTML = `
      <header>
        <div>
          <h3>${order.cliente}</h3>
          <p>${order.categoria} · ${order.servicio}</p>
        </div>
        ${chip}
      </header>
      <div class="order-grid">
        <p><strong>Teléfono:</strong> ${order.telefono}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Fecha:</strong> ${formatDate(order.fecha)}</p>
        <p><strong>Detalle:</strong> ${order.detalle}</p>
      </div>
      <div class="card-actions"></div>
    `;

        const actionsEl = card.querySelector(".card-actions");
        const statusPicker = document.createElement("select");
        statusPicker.innerHTML = `
      <option value="Pendiente">Pendiente</option>
      <option value="En progreso">En progreso</option>
      <option value="Completado">Completado</option>
    `;
        statusPicker.value = order.estado;
        statusPicker.addEventListener("change", () => updateOrderStatus(order.id, statusPicker.value));

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "secondary-btn";
        copyButton.textContent = "Copiar email";
        copyButton.addEventListener("click", () => {
            navigator.clipboard.writeText(order.email);
            copyButton.textContent = "Email copiado";
            setTimeout(() => (copyButton.textContent = "Copiar email"), 1500);
        });

        actionsEl.appendChild(statusPicker);
        actionsEl.appendChild(copyButton);
        dom.orderList.appendChild(card);
    });

    updateStats();
}

function updateOrderStatus(orderId, newStatus) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    order.estado = newStatus;
    saveData(STORAGE_KEYS.orders, orders);
    renderOrders();
}

function updateStats() {
    dom.statTotal.textContent = orders.length.toString();
    dom.statRepair.textContent = orders.filter((order) => order.servicio === "Reparación").length.toString();
    dom.statSale.textContent = orders.filter((order) => order.servicio === "Venta").length.toString();
}

function fillClientOrders() {
    if (!currentUser) {
        dom.clientOrderSelect.innerHTML = "";
        dom.clientOrderSelect.disabled = true;
        return;
    }

    const clientOrders = orders.filter((order) => order.email === currentUser.email);
    dom.clientOrderSelect.innerHTML = "";
    dom.clientOrderSelect.disabled = clientOrders.length === 0;

    if (clientOrders.length === 0) {
        dom.clientOrdersMessage.textContent = "No tienes órdenes registradas todavía.";
        return;
    }

    dom.clientOrdersMessage.textContent = "";
    dom.clientOrderSelect.innerHTML = clientOrders
        .map(
            (order) => `<option value="${order.id}">#${order.id} - ${order.categoria} - ${order.servicio}</option>`
        )
        .join("");

    handleClientOrderChange();
}

function handleClientOrderChange() {
    const orderId = dom.clientOrderSelect.value;
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
        dom.deliveryOrderId.value = "";
        dom.deliveryEquipo.value = "";
        return;
    }

    dom.deliveryOrderId.value = order.id;
    dom.deliveryEquipo.value = order.detalle || `${order.categoria} ${order.servicio}`;
}

function resetOrderForm() {
    dom.orderForm.reset();
}

function displayFeedback(element, message) {
    element.textContent = message;
    setTimeout(() => {
        if (element.textContent === message) {
            element.textContent = "";
        }
    }, 4000);
}

function createOrder(event) {
    event.preventDefault();
    const form = event.target;
    const cliente = form.querySelector("#cliente").value.trim();
    const telefono = form.querySelector("#telefono").value.trim();
    const email = form.querySelector("#email").value.trim();
    const categoria = form.querySelector("#categoria").value;
    const servicio = form.querySelector("#servicio").value;
    const detalle = form.querySelector("#detalle").value.trim();
    const estado = form.querySelector("#estado").value;
    const fecha = form.querySelector("#fecha").value;

    if (!cliente || !telefono || !email || !categoria || !servicio || !detalle || !fecha) {
        displayFeedback(dom.clientAccessMessage, "Completa todos los datos antes de guardar la orden.");
        return;
    }

    const order = {
        id: `ORD-${Date.now()}`,
        cliente,
        telefono,
        email,
        categoria,
        servicio,
        detalle,
        estado,
        fecha,
        createdAt: new Date().toISOString(),
        delivery: null,
    };

    orders.unshift(order);
    saveData(STORAGE_KEYS.orders, orders);
    renderOrders();
    resetOrderForm();
}

function validateEmail(value) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function showLoginMode() {
    dom.loginForm.classList.remove("hidden");
    dom.registerForm.classList.add("hidden");
    dom.loginModeBtn.classList.add("active");
    dom.registerModeBtn.classList.remove("active");
    dom.clientAccessMessage.textContent = "";
    dom.clientRegisterMessage.textContent = "";
}

function showRegisterMode() {
    dom.loginForm.classList.add("hidden");
    dom.registerForm.classList.remove("hidden");
    dom.loginModeBtn.classList.remove("active");
    dom.registerModeBtn.classList.add("active");
    dom.clientAccessMessage.textContent = "";
    dom.clientRegisterMessage.textContent = "";
}

function handleLogin(event) {
    event.preventDefault();
    const email = dom.loginEmail.value.trim().toLowerCase();
    const password = dom.loginPassword.value;

    if (!validateEmail(email) || !password) {
        displayFeedback(dom.clientAccessMessage, "Ingresa email y contraseña válidos.");
        return;
    }

    const user = clients.find((item) => item.email === email && item.password === password);
    if (!user) {
        displayFeedback(dom.clientAccessMessage, "Email o contraseña incorrectos.");
        return;
    }

    setSession({ name: user.name, email: user.email });
    updateInterface();
    displayFeedback(dom.clientAccessMessage, `Bienvenido de nuevo, ${user.name}.`);
}

function handleRegister(event) {
    event.preventDefault();
    const name = dom.registerName.value.trim();
    const email = dom.registerEmail.value.trim().toLowerCase();
    const password = dom.registerPassword.value;
    const confirmPassword = dom.registerPasswordConfirm.value;

    if (!name || !validateEmail(email) || !password || !confirmPassword) {
        displayFeedback(dom.clientRegisterMessage, "Completa todos los campos con datos válidos.");
        return;
    }

    if (password !== confirmPassword) {
        displayFeedback(dom.clientRegisterMessage, "Las contraseñas no coinciden.");
        return;
    }

    const isRegistered = clients.some((item) => item.email === email);
    if (isRegistered) {
        displayFeedback(dom.clientRegisterMessage, "Ese email ya está registrado.");
        return;
    }

    const newUser = { name, email, password };
    clients.push(newUser);
    saveData(STORAGE_KEYS.clients, clients);
    setSession({ name, email });
    updateInterface();
    displayFeedback(dom.clientRegisterMessage, "Registro exitoso. Ya puedes usar la sección de entrega.");
}

function handleLogout() {
    clearSession();
    updateInterface();
    displayFeedback(dom.clientAccessMessage, "Has cerrado sesión.");
}

function handleDelivery(event) {
    event.preventDefault();

    if (!currentUser) {
        displayFeedback(dom.deliveryMessage, "Debes iniciar sesión para gestionar entregas.");
        return;
    }

    const orderId = dom.deliveryOrderId.value;
    const accesorios = dom.deliveryAccesorios.value.trim();
    const estado = dom.deliveryEstado.value;
    const notes = dom.deliveryNotes.value.trim();

    if (!orderId || !estado) {
        displayFeedback(dom.deliveryMessage, "Selecciona una orden y un estado de entrega.");
        return;
    }

    const order = orders.find((item) => item.id === orderId);
    if (!order) {
        displayFeedback(dom.deliveryMessage, "No se encontró la orden seleccionada.");
        return;
    }

    order.delivery = {
        accesorios,
        estado,
        notes,
        updatedAt: new Date().toISOString(),
    };
    order.estado = estado === "Entregado" ? "Completado" : order.estado;
    saveData(STORAGE_KEYS.orders, orders);
    renderOrders();
    displayFeedback(dom.deliveryMessage, "Registro de entrega guardado correctamente.");
}

function initEvents() {
    dom.clientAccessBtn.addEventListener("click", () => dom.clientAccessPanel.classList.toggle("hidden"));
    dom.clientLogoutBtn.addEventListener("click", handleLogout);
    dom.loginModeBtn.addEventListener("click", showLoginMode);
    dom.registerModeBtn.addEventListener("click", showRegisterMode);
    dom.loginForm.addEventListener("submit", handleLogin);
    dom.registerForm.addEventListener("submit", handleRegister);
    dom.orderForm.addEventListener("submit", createOrder);
    dom.searchInput.addEventListener("input", renderOrders);
    dom.filterStatus.addEventListener("change", renderOrders);
    dom.clientOrderSelect.addEventListener("change", handleClientOrderChange);
    dom.deliverySection.querySelector("form").addEventListener("submit", handleDelivery);
}

function initialize() {
    initEvents();
    showLoginMode();
    updateInterface();
}

initialize();
