import { apiRequest } from './api-client.js';
import { escapeHtml, formatCurrency, formatDate } from './formatters.js';
import { showToast } from './toast.js';

let products = [];
let selectedProduct = null;
let initialFormValue = '';
let debounceTimer;
let deleteModal;
let discardModal;

export function initializeProducts() {
    deleteModal = new bootstrap.Modal(document.getElementById('deleteProductModal'));
    discardModal = new bootstrap.Modal(document.getElementById('discardChangesModal'));

    document.getElementById('filterForm').addEventListener('submit', event => {
        event.preventDefault();
        loadProducts();
    });
    document.getElementById('searchName').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadProducts, 400);
    });
    document.getElementById('clearFiltersButton').addEventListener('click', clearFilters);
    document.getElementById('addProductButton').addEventListener('click', () => openProductDrawer());
    document.getElementById('productForm').addEventListener('submit', submitProduct);
    document.getElementById('productDescription').addEventListener('input', updateFormMeta);
    document.getElementById('productPrice').addEventListener('input', updateFormMeta);
    document.getElementById('closeProductDrawerButton').addEventListener('click', requestCloseDrawer);
    document.getElementById('cancelProductButton').addEventListener('click', requestCloseDrawer);
    document.getElementById('drawerOverlay').addEventListener('click', requestCloseDrawer);
    document.getElementById('confirmDiscardButton').addEventListener('click', () => {
        discardModal.hide();
        closeProductDrawer();
    });
    document.getElementById('confirmDeleteButton').addEventListener('click', confirmDelete);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isDrawerOpen()) requestCloseDrawer();
    });
}

export async function loadProducts() {
    if (!validateFilters()) return;
    renderLoading();
    const params = new URLSearchParams();
    const name = document.getElementById('searchName').value.trim();
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    if (name) params.set('name', name);
    if (minPrice !== '') params.set('minPrice', minPrice);
    if (maxPrice !== '') params.set('maxPrice', maxPrice);

    try {
        products = await apiRequest(`/products${params.size ? `?${params}` : ''}`);
        renderProducts();
    } catch (error) {
        if (error.status !== 401) {
            renderLoadError();
            showToast('Unable to load products.', 'error');
        }
    }
}

function validateFilters() {
    const min = numberOrNull(document.getElementById('minPrice').value);
    const max = numberOrNull(document.getElementById('maxPrice').value);
    let message = '';
    if (min !== null && min < 0) message = 'Minimum price cannot be negative.';
    else if (max !== null && max < 0) message = 'Maximum price cannot be negative.';
    else if (min !== null && max !== null && min > max) message = 'Minimum price cannot be greater than maximum price.';
    document.getElementById('filterError').textContent = message;
    return !message;
}

function renderLoading() {
    document.getElementById('productCount').textContent = 'Loading products...';
    document.getElementById('productContent').innerHTML = `
        <div class="table-responsive">
            <table class="table product-table"><thead>${tableHeader()}</thead><tbody>
            ${Array.from({ length: 5 }, (_, index) => `<tr class="skeleton-row" aria-hidden="true">
                <td><span style="width:28px"></span></td><td><span style="width:${110 + index * 8}px"></span></td>
                <td><span style="width:180px"></span></td><td><span style="width:100px"></span></td>
                <td><span style="width:110px"></span></td><td><span style="width:74px"></span></td></tr>`).join('')}
            </tbody></table>
        </div>`;
}

function renderProducts() {
    document.getElementById('productCount').textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
    if (!products.length) {
        const filtered = hasFilters();
        document.getElementById('productContent').innerHTML = `
            <div class="state-view">
                <div class="state-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12.1V21"/></svg></div>
                <h3>No products found</h3>
                <p>${filtered ? 'No products match your filters.' : 'Create your first product or adjust your search filters.'}</p>
                ${filtered ? '<button id="emptyClearButton" class="btn btn-outline-primary" type="button">Clear Filters</button>' : '<button id="emptyAddButton" class="btn btn-primary" type="button">Add Product</button>'}
            </div>`;
        document.getElementById(filtered ? 'emptyClearButton' : 'emptyAddButton')
            .addEventListener('click', filtered ? clearFilters : () => openProductDrawer());
        return;
    }

    document.getElementById('productContent').innerHTML = `
        <div class="table-responsive">
            <table class="table product-table">
                <thead>${tableHeader()}</thead>
                <tbody>${products.map(product => `
                    <tr>
                        <td class="product-id">#${product.id}</td>
                        <td><strong>${escapeHtml(product.name)}</strong></td>
                        <td><span class="description-clamp" title="${escapeHtml(product.description)}">${escapeHtml(product.description) || '—'}</span></td>
                        <td class="price-cell">${formatCurrency(product.price)}</td>
                        <td class="date-cell">${formatDate(product.createdAt)}</td>
                        <td><div class="row-actions">
                            <button class="icon-button edit" type="button" data-edit-id="${product.id}" aria-label="Edit ${escapeHtml(product.name)}" title="Edit product">
                                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20ZM13.5 7l3.5 3.5"/></svg>
                            </button>
                            <button class="icon-button delete" type="button" data-delete-id="${product.id}" aria-label="Delete ${escapeHtml(product.name)}" title="Delete product">
                                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>
                            </button>
                        </div></td>
                    </tr>`).join('')}</tbody>
            </table>
        </div>`;
    document.querySelectorAll('[data-edit-id]').forEach(button =>
        button.addEventListener('click', () => openProductDrawer(findProduct(button.dataset.editId))));
    document.querySelectorAll('[data-delete-id]').forEach(button =>
        button.addEventListener('click', () => openDeleteDialog(findProduct(button.dataset.deleteId))));
}

function renderLoadError() {
    document.getElementById('productCount').textContent = 'Products unavailable';
    document.getElementById('productContent').innerHTML = `
        <div class="state-view error-state">
            <div class="state-icon">!</div>
            <h3>Unable to load products</h3>
            <p>We couldn't retrieve your catalog. Please check your connection and try again.</p>
            <button id="retryProductsButton" class="btn btn-outline-primary" type="button">Retry</button>
        </div>`;
    document.getElementById('retryProductsButton').addEventListener('click', loadProducts);
}

function tableHeader() {
    return '<tr><th>ID</th><th>Name</th><th>Description</th><th>Price</th><th>Created At</th><th class="text-end">Actions</th></tr>';
}

function openProductDrawer(product = null) {
    selectedProduct = product;
    const form = document.getElementById('productForm');
    form.reset();
    clearProductErrors();
    document.getElementById('productId').value = product?.id ?? '';
    document.getElementById('productName').value = product?.name ?? '';
    document.getElementById('productDescription').value = product?.description ?? '';
    document.getElementById('productPrice').value = product?.price ?? '';
    document.getElementById('productDrawerTitle').textContent = product ? 'Edit Product' : 'Add Product';
    document.querySelector('#saveProductButton .button-label').textContent = product ? 'Save Changes' : 'Save Product';
    updateFormMeta();
    initialFormValue = formSnapshot();
    document.getElementById('productDrawer').classList.add('open');
    document.getElementById('drawerOverlay').classList.add('show');
    document.getElementById('productDrawer').setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setTimeout(() => document.getElementById('productName').focus(), 100);
}

function requestCloseDrawer() {
    if (formSnapshot() !== initialFormValue) discardModal.show();
    else closeProductDrawer();
}

function closeProductDrawer() {
    document.getElementById('productDrawer').classList.remove('open');
    document.getElementById('drawerOverlay').classList.remove('show');
    document.getElementById('productDrawer').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    selectedProduct = null;
}

async function submitProduct(event) {
    event.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const rawPrice = document.getElementById('productPrice').value;
    const price = Number(rawPrice);
    if (!validateProduct(name, rawPrice, price)) return;

    setButtonLoading('saveProductButton', true);
    document.getElementById('productFormError').textContent = '';
    try {
        await apiRequest(selectedProduct ? `/products/${selectedProduct.id}` : '/products', {
            method: selectedProduct ? 'PUT' : 'POST',
            body: JSON.stringify({ name, description, price })
        });
        const message = selectedProduct ? 'Product updated successfully.' : 'Product created successfully.';
        closeProductDrawer();
        await loadProducts();
        showToast(message, 'success');
    } catch (error) {
        if (error.status !== 401) {
            document.getElementById('productFormError').textContent =
                error.status === 400 ? 'Please review the product information.' : 'Unable to save product. Please try again.';
        }
    } finally {
        setButtonLoading('saveProductButton', false);
    }
}

function validateProduct(name, rawPrice, price) {
    clearProductErrors();
    let valid = true;
    if (!name) {
        setProductError('productName', 'productNameError', 'Name is required.');
        valid = false;
    } else if (name.length < 2) {
        setProductError('productName', 'productNameError', 'Name must be at least 2 characters.');
        valid = false;
    }
    if (rawPrice === '') {
        setProductError('productPrice', 'productPriceError', 'Price is required.');
        valid = false;
    } else if (!Number.isFinite(price) || price <= 0) {
        setProductError('productPrice', 'productPriceError', 'Price must be greater than 0.');
        valid = false;
    }
    return valid;
}

function openDeleteDialog(product) {
    selectedProduct = product;
    document.getElementById('deleteProductMessage').textContent =
        `Are you sure you want to delete “${product.name}”? This action cannot be undone.`;
    deleteModal.show();
}

async function confirmDelete() {
    if (!selectedProduct) return;
    setButtonLoading('confirmDeleteButton', true);
    try {
        await apiRequest(`/products/${selectedProduct.id}`, { method: 'DELETE' });
        deleteModal.hide();
        selectedProduct = null;
        await loadProducts();
        showToast('Product deleted successfully.', 'success');
    } catch (error) {
        if (error.status !== 401) showToast('Unable to delete product. Please try again.', 'error');
    } finally {
        setButtonLoading('confirmDeleteButton', false);
    }
}

function clearFilters() {
    document.getElementById('filterForm').reset();
    document.getElementById('filterError').textContent = '';
    loadProducts();
}
function hasFilters() {
    return ['searchName', 'minPrice', 'maxPrice'].some(id => document.getElementById(id).value !== '');
}
function findProduct(id) { return products.find(product => product.id === Number(id)); }
function numberOrNull(value) { return value === '' ? null : Number(value); }
function formSnapshot() {
    return JSON.stringify([
        document.getElementById('productName').value,
        document.getElementById('productDescription').value,
        document.getElementById('productPrice').value
    ]);
}
function isDrawerOpen() { return document.getElementById('productDrawer').classList.contains('open'); }
function updateFormMeta() {
    const description = document.getElementById('productDescription').value;
    document.getElementById('descriptionCount').textContent = `${description.length} / 1000`;
    document.getElementById('pricePreview').textContent = formatCurrency(document.getElementById('productPrice').value || 0);
}
function clearProductErrors() {
    ['productName', 'productPrice'].forEach(id => document.getElementById(id).classList.remove('is-invalid'));
    ['productNameError', 'productDescriptionError', 'productPriceError', 'productFormError'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
}
function setProductError(inputId, errorId, message) {
    document.getElementById(inputId).classList.add('is-invalid');
    document.getElementById(errorId).textContent = message;
}
function setButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    button.disabled = loading;
    button.querySelector('.button-label').classList.toggle('d-none', loading);
    button.querySelector('.spinner-border').classList.toggle('d-none', !loading);
}
