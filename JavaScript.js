const orderForm = document.getElementById('order-form');
const orderList = document.getElementById('order-list');
const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');
const statTotal = document.getElementById('stat-total');
const statRepair = document.getElementById('stat-repair');
const statSale = document.getElementById('stat-sale');
const clientAccessBtn = document.getElementById('client-access-btn');
const clientAccessPanel = document.getElementById('client-access-panel');
const clientAccessForm = document.getElementById('client-access-form');
const clientOrderIdInput = document.getElementById('client-order-id');
const clientAccessMessage = document.getElementById('client-access-message');
const clientTabLink = document.getElementById('client-tab-link');
const deliverySection = document.getElementById('entrega');
const deliveryForm = document.getElementById('delivery-form');
const deliveryOrderId = document.getElementById('delivery-order-id');
const deliveryEquipo = document.getElementById('delivery-equipo');
const deliveryAccesorios = document.getElementById('delivery-accesorios');
const deliveryEstado = document.getElementById('delivery-estado');
const deliveryNotes = document.getElementById('delivery-notes');
const deliveryMessage = document.getElementById('delivery-message');

let orders = [];
let activeClientOrder = null;

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function updateStats() {
  statTotal.textContent = orders.length;
  statRepair.textContent = orders.filter(order => order.servicio === 'Reparación').length;
  statSale.textContent = orders.filter(order => order.servicio === 'Venta').length;
}

function renderOrders() {
  const query = searchInput.value.toLowerCase().trim();
  const status = filterStatus.value;
  const visibleOrders = orders.filter(order => {
    const text = [order.cliente, order.categoria, order.servicio, order.detalle].join(' ').toLowerCase();
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
  const fecha = document.getElementById('fecha').value;

  if (!cliente || !telefono || !categoria || !servicio || !detalle || !estado || !fecha) {
    return;
  }

  const order = {
    id: `ORD-${Date.now()}`,
    cliente,
    telefono,
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

async function handleClientAccess(event) {
  event.preventDefault();
  const orderId = clientOrderIdInput.value.trim();

  if (!orderId) {
    clientAccessMessage.textContent = 'Ingresa el número de orden para continuar.';
    return;
  }

  const order = orders.find(item => item.id === orderId);
  if (!order) {
    clientAccessMessage.textContent = 'Orden no encontrada. Verifica el número de orden.';
    return;
  }

  showDeliverySection(order);
  clientAccessPanel.classList.add('hidden');
  window.location.hash = 'entrega';
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
clientAccessForm.addEventListener('submit', handleClientAccess);
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
}

initApp();
