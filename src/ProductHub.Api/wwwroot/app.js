const api = '/api';
let token = sessionStorage.getItem('token');
let products = [];
const el = id => document.getElementById(id);

function showAlert(message, type = 'danger') {
  el('alert').innerHTML = `<div class="alert alert-${type}" role="alert">${escapeHtml(message)}</div>`;
  setTimeout(() => el('alert').replaceChildren(), 4000);
}
function escapeHtml(value) {
  const div = document.createElement('div'); div.textContent = value ?? ''; return div.innerHTML;
}
async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (response.status === 401 && token) logout();
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || Object.values(error.errors || {}).flat().join(' ') || 'Request failed.');
  }
  return response.status === 204 ? null : response.json();
}
function setAuthenticated(isAuthenticated) {
  el('authView').classList.toggle('d-none', isAuthenticated);
  el('productsView').classList.toggle('d-none', !isAuthenticated);
  el('logout').classList.toggle('d-none', !isAuthenticated);
  if (isAuthenticated) loadProducts();
}
el('authForm').addEventListener('click', async event => {
  const action = event.target.dataset.action;
  if (!action) return;
  event.preventDefault();
  if (!el('authForm').reportValidity()) return;
  try {
    const result = await request(`/auth/${action}`, { method: 'POST', body: JSON.stringify({ email: el('email').value, password: el('password').value }) });
    token = result.token; sessionStorage.setItem('token', token); setAuthenticated(true);
    showAlert(action === 'register' ? 'Account created.' : 'Welcome back.', 'success');
  } catch (error) { showAlert(error.message); }
});
async function loadProducts() {
  const params = new URLSearchParams();
  if (el('searchName').value) params.set('name', el('searchName').value);
  if (el('minPrice').value) params.set('minPrice', el('minPrice').value);
  if (el('maxPrice').value) params.set('maxPrice', el('maxPrice').value);
  try {
    products = await request(`/products?${params}`);
    el('productRows').innerHTML = products.length ? products.map(product => `<tr>
      <td class="fw-semibold">${escapeHtml(product.name)}</td><td>${escapeHtml(product.description)}</td>
      <td>${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(product.price)}</td>
      <td>${new Date(product.createdAt).toLocaleDateString()}</td>
      <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary" onclick="editProduct(${product.id})">Edit</button>
      <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})">Delete</button></td></tr>`).join('')
      : '<tr><td colspan="5" class="text-center text-secondary py-4">No products found.</td></tr>';
  } catch (error) { showAlert(error.message); }
}
el('searchForm').addEventListener('submit', event => { event.preventDefault(); loadProducts(); });
el('productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const id = el('productId').value;
  const body = { name: el('name').value, description: el('description').value, price: Number(el('price').value) };
  try {
    await request(`/products${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    resetForm(); await loadProducts(); showAlert(id ? 'Product updated.' : 'Product added.', 'success');
  } catch (error) { showAlert(error.message); }
});
function editProduct(id) {
  const product = products.find(item => item.id === id);
  el('productId').value = product.id; el('name').value = product.name; el('description').value = product.description; el('price').value = product.price;
  el('formTitle').textContent = 'Edit product'; el('cancelEdit').classList.remove('d-none'); scrollTo({ top: 0, behavior: 'smooth' });
}
async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try { await request(`/products/${id}`, { method: 'DELETE' }); await loadProducts(); showAlert('Product deleted.', 'success'); }
  catch (error) { showAlert(error.message); }
}
function resetForm() {
  el('productForm').reset(); el('productId').value = ''; el('formTitle').textContent = 'Add product'; el('cancelEdit').classList.add('d-none');
}
function logout() { token = null; sessionStorage.removeItem('token'); setAuthenticated(false); }
el('cancelEdit').addEventListener('click', resetForm);
el('logout').addEventListener('click', logout);
setAuthenticated(Boolean(token));
