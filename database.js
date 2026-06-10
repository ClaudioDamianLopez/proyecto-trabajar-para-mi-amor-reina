const DB_NAME = 'ElectroFixDB';
const DB_VERSION = 1;
const STORE_NAME = 'orders';

function openDatabase() {
    if (!window.indexedDB) {
        return Promise.reject(new Error('IndexedDB no está disponible en este navegador.'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('cliente', 'cliente', { unique: false });
                store.createIndex('categoria', 'categoria', { unique: false });
                store.createIndex('servicio', 'servicio', { unique: false });
                store.createIndex('estado', 'estado', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getOrdersFromDB() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const result = request.result || [];
            result.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
            resolve(result);
        };

        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    });
}

async function saveOrderToDB(order) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(order);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    });
}

async function deleteOrderFromDB(id) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    });
}
