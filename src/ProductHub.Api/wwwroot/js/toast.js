const icons = {
    success: '<path d="m5 12 4 4L19 6"/>',
    error: '<path d="m7 7 10 10M17 7 7 17"/>',
    warning: '<path d="M12 8v5M12 17h.01"/><path d="M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"/>',
    info: '<path d="M12 11v6M12 7h.01"/><circle cx="12" cy="12" r="9"/>'
};

export function showToast(message, type = 'info') {
    const region = document.getElementById('toastRegion');
    const toast = document.createElement('div');
    toast.className = `app-toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML = `
        <span class="toast-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type] ?? icons.info}</svg></span>
        <span class="toast-message">${escapeText(message)}</span>
        <button type="button" class="toast-close" aria-label="Close notification">&times;</button>`;
    region.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    const remove = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    };
    toast.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, 4500);
}

function escapeText(value) {
    const element = document.createElement('div');
    element.textContent = value;
    return element.innerHTML;
}
