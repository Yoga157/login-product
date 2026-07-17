const API_BASE = '/api';
const TOKEN_KEY = 'producthub.token';
const USER_KEY = 'producthub.user';

function getStorage() {
    return localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
}

export function getSession() {
    const storage = getStorage();
    const token = storage.getItem(TOKEN_KEY);
    const rawUser = storage.getItem(USER_KEY);
    return { token, user: rawUser ? JSON.parse(rawUser) : null };
}

export function saveSession(auth, remember = false) {
    clearSession();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, auth.token);
    storage.setItem(USER_KEY, JSON.stringify({ email: auth.email, expiresAt: auth.expiresAt }));
}

export function clearSession() {
    [localStorage, sessionStorage].forEach(storage => {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(USER_KEY);
    });
}

export function isSessionValid() {
    const { token, user } = getSession();
    return Boolean(token && user?.expiresAt && new Date(user.expiresAt).getTime() > Date.now());
}

export async function apiRequest(path, options = {}) {
    const { token } = getSession();
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
        throw new ApiError(0, 'Unable to connect to the server.');
    }

    if (response.status === 401 && token) {
        clearSession();
        window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('json') ? await response.json().catch(() => null) : null;
    if (!response.ok) {
        throw new ApiError(response.status, getErrorMessage(data), data);
    }
    return response.status === 204 ? null : data;
}

function getErrorMessage(data) {
    if (!data) return 'Something went wrong. Please try again.';
    if (data.detail) return data.detail;
    if (data.title) return data.title;
    if (data.errors) return Object.values(data.errors).flat()[0] ?? 'Validation failed.';
    return 'Something went wrong. Please try again.';
}

export class ApiError extends Error {
    constructor(status, message, data = null) {
        super(message);
        this.status = status;
        this.data = data;
    }
}
