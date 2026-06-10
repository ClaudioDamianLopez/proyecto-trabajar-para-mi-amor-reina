const orderForm = document.getElementById('order-form');
const orderList = document.getElementById('order-list');
const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');
const statTotal = document.getElementById('stat-total');
const statRepair = document.getElementById('stat-repair');
const statSale = document.getElementById('stat-sale');
const clientAccessBtn = document.getElementById('client-access-btn');
const clientLogoutBtn = document.getElementById('client-logout-btn');
const clientAccessPanel = document.getElementById('client-access-panel');
const loginModeBtn = document.getElementById('login-mode-btn');
const registerModeBtn = document.getElementById('register-mode-btn');
const clientLoginForm = document.getElementById('client-login-form');
const clientRegisterForm = document.getElementById('client-register-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerName = document.getElementById('register-name');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerPasswordConfirm = document.getElementById('register-password-confirm');
const clientAccessMessage = document.getElementById('client-access-message');
const clientRegisterMessage = document.getElementById('client-register-message');
const clientTabLink = document.getElementById('client-tab-link');
const deliverySection = document.getElementById('entrega');
const clientOrderSelect = document.getElementById('client-order-select');
const clientOrdersMessage = document.getElementById('client-orders-message');
const deliveryForm = document.getElementById('delivery-form');
const deliveryOrderId = document.getElementById('delivery-order-id');
const deliveryEquipo = document.getElementById('delivery-equipo');
const deliveryAccesorios = document.getElementById('delivery-accesorios');
const deliveryEstado = document.getElementById('delivery-estado');
const deliveryNotes = document.getElementById('delivery-notes');
const deliveryMessage = document.getElementById('delivery-message');

let orders = [];
let activeClientOrder = null;
let loggedInClient = null;

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function updateStats() {
  statTotal.textContent = orders.length;
  statRepair.textContent = orders.filter(order => order.servicio === 'Reparación').length;
  statSale.textContent = orders.filter(order => order.servicio === 'Venta').length;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function setAuthMode(mode) {
  if (mode === 'login') {
    loginModeBtn.classList.add('active');
    registerModeBtn.classList.remove('active');
    clientLoginForm.classList.remove('hidden');
    clientRegisterForm.classList.add('hidden');
  } else {
    registerModeBtn.classList.add('active');
    loginModeBtn.classList.remove('active');
    clientRegisterForm.classList.remove('hidden');
    clientLoginForm.classList.add('hidden');
  }
  clientAccessMessage.textContent = '';
  clientRegisterMessage.textContent = '';
}

function setAuthMessage(message) {
  clientAccessMessage.textContent = '';
  clientRegisterMessage.textContent = '';
  if (clientLoginForm.classList.contains('hidden')) {
    clientRegisterMessage.textContent = message;
  } else {
    clientAccessMessage.textContent = message;
  }
}

function clearAuthForms() {
  loginEmail.value = '';
  loginPassword.value = '';
  registerName.value = '';
  registerEmail.value = '';
  registerPassword.value = '';
  registerPasswordConfirm.value = '';
  clientAccessMessage.textContent = '';
  clientRegisterMessage.textContent = '';
}

function updateClientUI() {
  clientAccessBtn.classList.toggle('hidden', Boolean(loggedInClient));
  clientLogoutBtn.classList.toggle('hidden', !loggedInClient);
  clientTabLink.classList.toggle('hidden', !loggedInClient);
  if (!loggedInClient) {
    deliverySection.classList.add('hidden');
  }
}

async function registerClient(event) {
  event.preventDefault();
  const name = registerName.value.trim();
  const email = registerEmail.value.trim().toLowerCase();
  const password = registerPassword.value;
  const confirmPassword = registerPasswordConfirm.value;

  if (!name || !email || !password || !confirmPassword) {
    setAuthMessage('Completa todos los campos para registrarte.');
    return;
  }
  if (password !== confirmPassword) {
    setAuthMessage('Las contraseñas no coinciden.');
    return;
  }

  const existingClient = await getClientFromDB(email);
  if (existingClient) {
    setAuthMessage('Ya existe un usuario con ese email.');
    return;
  }

  const passwordHash = await hashPassword(password);
  const client = { name, email, passwordHash };
  await saveClientToDB(client);
  clearAuthForms();
  setAuthMode('login');
  setAuthMessage('Registro exitoso. Ahora inicia sesión.');
}

async function loginClient(event) {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;

  if (!email || !password) {
    setAuthMessage('Completa email y contraseña para ingresar.');
    return;
  }

  const client = await getClientFromDB(email);
  if (!client) {
    setAuthMessage('Usuario no encontrado. Regístrate primero.');
    return;
  }

  const passwordHash = await hashPassword(password);
  if (client.passwordHash !== passwordHash) {
    setAuthMessage('Contraseña incorrecta.');
    return;
  }

  loggedInClient = client;
  clearAuthForms();
  updateClientUI();
  renderClientOrders();
  clientAccessPanel.classList.add('hidden');
}

function logoutClient() {
  loggedInClient = null;
  activeClientOrder = null;
  clientOrderSelect.innerHTML = '';
  clientOrdersMessage.textContent = '';
  deliverySection.classList.add('hidden');
  updateClientUI();
}

function renderClientOrders() {
  if (!loggedInClient) {
    clientOrderSelect.innerHTML = '';
    clientOrdersMessage.textContent = 'Inicia sesión para ver tus órdenes.';
    return;
  }

  const clientOrders = orders.filter(order => order.clienteEmail === loggedInClient.email);
  if (clientOrders.length === 0) {
    clientOrderSelect.innerHTML = '<option value="">Sin órdenes registradas</option>';
    clientOrdersMessage.textContent = 'No tienes órdenes asociadas a este email.';
    return;
  }

  clientOrdersMessage.textContent = '';
  clientOrderSelect.innerHTML = clientOrders
    .map(order => `<option value="${order.id}">${order.id} — ${order.categoria} / ${order.servicio}</option>`)
    .join('');
  loadClientOrder(clientOrders[0].id);
}

function loadClientOrder(orderId) {
  const order = orders.find(item => item.id === orderId && item.clienteEmail === loggedInClient.email);
  if (!order) {
    clientOrdersMessage.textContent = 'Orden no encontrada o no pertenece a tu cuenta.';
    return;
  }

  activeClientOrder = order;
  deliveryOrderId.value = order.id;
  deliveryEquipo.value = order.deliveryEquipo || `${order.categoria} • ${order.servicio}`;
  deliveryAccesorios.value = order.deliveryAccesorios || '';
  deliveryEstado.value = order.deliveryEstado || 'Entregado';
  deliveryNotes.value = order.deliveryNotes || '';
  deliverySection.classList.remove('hidden');
  clientOrdersMessage.textContent = '';
}

function handleOrderSelectChange() {
  if (!clientOrderSelect.value) {
    deliverySection.classList.add('hidden');
    return;
  }
  loadClientOrder(clientOrderSelect.value);
}

function showClientPanel() {
  clientAccessPanel.classList.toggle('hidden');
  clientAccessMessage.textContent = '';
  setAuthMode('login');
}

async function saveDeliveryInfo(event) {
  event.preventDefault();

  if (!activeClientOrder) {
    return;
  }

  activeClientOrder.deliveryEquipo = deliveryEquipo.value.trim();
  activeClientOrder.deliveryAccesorios = deliveryAccesorios.value.trim();
  activeClientOrder.deliveryEstado = deliveryEstado.value;
  activeClientOrder.deliveryNotes = deliveryNotes.value.trim();

  await saveOrderToDB(activeClientOrder);
  deliveryMessage.textContent = 'Información de entrega guardada correctamente.';
  renderOrders();
  updateStats();
}

function renderOrders() {
  const query = searchInput.value.toLowerCase().trim();
  const status = filterStatus.value;
  const visibleOrders = orders.filter(order => {
    const text = [order.cliente, order.clienteEmail, order.categoria, order.servicio, order.detalle].join(' ').toLowerCase();
    const matchesQuery = query === '' || text.includes(query);
    const matchesStatus = status === 'Todas' || order.estado === status;
    return matchesQuery && matchesStatus;
  });

  orderList.innerHTML = '';

  if (visibleOrders.length === 0) {
    orderList.innerHTML = '<p class="empty-state">No se encontraron órdenes con esos filtros. Prueba con otro criterio.</p>';
    return;
  }

  visibleOrders.forEach((order, index) => {
    const card = document.createElement('article');
    card.className = 'order-card';
    card.innerHTML = `
      <header>
        <div>
          <h3>${order.cliente}</h3>
          <p>${order.categoria} • ${order.servicio}</p>
        </div>
        <span class="chip status-${order.estado.replace(/\s+/g, '-')}" title="Estado">${order.estado}</span>
      </header>
      <div class="order-grid">
        <div>
          <strong>Teléfono</strong>
          <p>${order.telefono}</p>
        </div>
        <div>
          <strong>Fecha</strong>
          <p>${formatDate(order.fecha)}</p>
        </div>
        <div>
          <strong>Detalle</strong>
          <p>${order.detalle}</p>
        </div>
        <div>
          <strong>ID</strong>
          <p>${order.id}</p>
        </div>
      </div>
      <div class="card-actions">
        <button class="secondary-btn" data-action="toggle" data-index="${index}">Cambiar estado</button>
        <button class="secondary-btn" data-action="delete" data-index="${index}">Eliminar</button>
      </div>
    `;

    orderList.appendChild(card);
  });
}

async function addOrder(event) {
  event.preventDefault();
  const cliente = document.getElementById('cliente').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const categoria = document.getElementById('categoria').value;
  const servicio = document.getElementById('servicio').value;
  const detalle = document.getElementById('detalle').value.trim();
  const estado = document.getElementById('estado').value;
  const correo = document.getElementById('email').value.trim().toLowerCase();
  const fecha = document.getElementById('fecha').value;

  if (!cliente || !telefono || !correo || !categoria || !servicio || !detalle || !estado || !fecha) {
    return;
  }

  const order = {
    id: `ORD-${Date.now()}`,
    cliente,
    telefono,
    clienteEmail: correo,
    categoria,
    servicio,
    detalle,
    estado,
    fecha,
  };

  orders.unshift(order);
  await saveOrderToDB(order);
  renderOrders();
  updateStats();
  orderForm.reset();
}

function cycleStatus(currentStatus) {
  const statusOrder = ['Pendiente', 'En progreso', 'Completado'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  return statusOrder[(currentIndex + 1) % statusOrder.length];
}

function showDeliverySection(order) {
  activeClientOrder = order;
  deliverySection.classList.remove('hidden');
  clientTabLink.classList.remove('hidden');
  deliveryOrderId.value = order.id;
  deliveryEquipo.value = order.deliveryEquipo || `${order.categoria} • ${order.servicio}`;
  deliveryAccesorios.value = order.deliveryAccesorios || '';
  deliveryEstado.value = order.deliveryEstado || 'Entregado';
  deliveryNotes.value = order.deliveryNotes || '';
  deliveryMessage.textContent = '';
}

function showClientPanel() {
  clientAccessPanel.classList.toggle('hidden');
  clientAccessMessage.textContent = '';
}

async function saveDeliveryInfo(event) {
  event.preventDefault();

  if (!activeClientOrder) {
    return;
  }

  activeClientOrder.deliveryEquipo = deliveryEquipo.value.trim();
  activeClientOrder.deliveryAccesorios = deliveryAccesorios.value.trim();
  activeClientOrder.deliveryEstado = deliveryEstado.value;
  activeClientOrder.deliveryNotes = deliveryNotes.value.trim();

  await saveOrderToDB(activeClientOrder);
  deliveryMessage.textContent = 'Información de entrega guardada correctamente.';
  renderOrders();
  updateStats();
}

function handleOrderSelectChange() {
  if (!clientOrderSelect.value) {
    deliverySection.classList.add('hidden');
    return;
  }
  loadClientOrder(clientOrderSelect.value);
}

async function handleOrderAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const index = Number(button.dataset.index);

  if (action === 'toggle') {
    orders[index].estado = cycleStatus(orders[index].estado);
    await saveOrderToDB(orders[index]);
    renderOrders();
    updateStats();
  }

  if (action === 'delete') {
    const [removed] = orders.splice(index, 1);
    await deleteOrderFromDB(removed.id);
    renderOrders();
    updateStats();
  }
}

orderForm.addEventListener('submit', addOrder);
orderList.addEventListener('click', handleOrderAction);
searchInput.addEventListener('input', renderOrders);
filterStatus.addEventListener('change', renderOrders);
clientAccessBtn.addEventListener('click', showClientPanel);
clientLogoutBtn.addEventListener('click', logoutClient);
loginModeBtn.addEventListener('click', () => setAuthMode('login'));
registerModeBtn.addEventListener('click', () => setAuthMode('register'));
clientLoginForm.addEventListener('submit', loginClient);
clientRegisterForm.addEventListener('submit', registerClient);
clientOrderSelect.addEventListener('change', handleOrderSelectChange);
deliveryForm.addEventListener('submit', saveDeliveryInfo);

async function initApp() {
  try {
    orders = await getOrdersFromDB();
  } catch (error) {
    console.warn('No se pudo abrir la base de datos IndexedDB:', error);
    orders = [];
  }

  if (orders.length > 0) {
    renderOrders();
  } else {
    orderList.innerHTML = '<p class="empty-state">Aún no hay órdenes. Crea la primera orden en el formulario.</p>';
  }

  updateStats();
  setAuthMode('login');
  updateClientUI();
}

initApp();
