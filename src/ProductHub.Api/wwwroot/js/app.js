import { initializeAuth } from './auth.js';
import { getSession } from './api-client.js';
import { initializeProducts, loadProducts } from './products.js';

let productsInitialized = false;

function showApplication(session) {
    document.getElementById('authShell').classList.add('d-none');
    document.getElementById('appShell').classList.remove('d-none');
    const email = session.email ?? session.user?.email ?? getSession().user?.email ?? 'User';
    document.getElementById('userEmail').textContent = email;
    document.getElementById('userAvatar').textContent = email.charAt(0).toUpperCase();
    if (!productsInitialized) {
        initializeProducts();
        productsInitialized = true;
    }
    loadProducts();
}

function showAuthentication() {
    document.getElementById('appShell').classList.add('d-none');
    document.getElementById('authShell').classList.remove('d-none');
    closeSidebar();
}

function openSidebar() {
    document.getElementById('appSidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
    document.body.classList.add('no-scroll');
}

function closeSidebar() {
    document.getElementById('appSidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
    document.body.classList.remove('no-scroll');
}

document.getElementById('openSidebarButton').addEventListener('click', openSidebar);
document.getElementById('closeSidebarButton').addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

initializeAuth({ onAuthenticated: showApplication, onLoggedOut: showAuthentication });
