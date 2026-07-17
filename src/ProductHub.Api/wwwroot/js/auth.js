import { apiRequest, clearSession, getSession, isSessionValid, saveSession } from './api-client.js';
import { showToast } from './toast.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initializeAuth({ onAuthenticated, onLoggedOut }) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    document.getElementById('showRegisterButton').addEventListener('click', () => showAuthView('register'));
    document.getElementById('showLoginButton').addEventListener('click', () => showAuthView('login'));
    document.querySelectorAll('[data-toggle-password]').forEach(button =>
        button.addEventListener('click', () => togglePassword(button)));
    document.querySelectorAll('[data-logout]').forEach(button =>
        button.addEventListener('click', () => logout(onLoggedOut)));

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!validateLogin(email, password)) return;

        setSubmitting('loginButton', true);
        clearText('loginFormError');
        try {
            const auth = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            saveSession(auth, document.getElementById('rememberMe').checked);
            loginForm.reset();
            onAuthenticated(auth);
        } catch (error) {
            setText('loginFormError', error.status === 401
                ? 'Invalid email or password.'
                : 'Unable to sign in. Please try again.');
        } finally {
            setSubmitting('loginButton', false);
        }
    });

    registerForm.addEventListener('submit', async event => {
        event.preventDefault();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (!validateRegister(email, password, confirmPassword)) return;

        setSubmitting('registerButton', true);
        clearText('registerFormError');
        try {
            await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            clearSession();
            registerForm.reset();
            showAuthView('login');
            document.getElementById('loginEmail').value = email;
            showToast('Registration successful. Please sign in.', 'success');
        } catch (error) {
            setText('registerFormError', error.status === 409
                ? 'An account with this email already exists.'
                : 'Unable to create your account. Please try again.');
        } finally {
            setSubmitting('registerButton', false);
        }
    });

    window.addEventListener('auth:expired', () => {
        onLoggedOut();
        showToast('Your session has expired. Please sign in again.', 'warning');
    });

    if (isSessionValid()) onAuthenticated(getSession());
    else {
        clearSession();
        onLoggedOut();
    }
}

export function showAuthView(view) {
    const isLogin = view === 'login';
    document.getElementById('loginView').classList.toggle('d-none', !isLogin);
    document.getElementById('registerView').classList.toggle('d-none', isLogin);
    (isLogin ? document.getElementById('loginEmail') : document.getElementById('registerEmail')).focus();
}

function validateLogin(email, password) {
    let valid = true;
    valid = validateEmail('loginEmail', 'loginEmailError', email) && valid;
    valid = validateRequired('loginPassword', 'loginPasswordError', password, 'Password is required.') && valid;
    return valid;
}

function validateRegister(email, password, confirmPassword) {
    let valid = true;
    valid = validateEmail('registerEmail', 'registerEmailError', email) && valid;
    if (!password.trim()) {
        setFieldError('registerPassword', 'registerPasswordError', 'Password is required.');
        valid = false;
    } else if (password.length < 8) {
        setFieldError('registerPassword', 'registerPasswordError', 'Password must be at least 8 characters.');
        valid = false;
    } else clearFieldError('registerPassword', 'registerPasswordError');
    if (!confirmPassword) {
        setFieldError('confirmPassword', 'confirmPasswordError', 'Please confirm your password.');
        valid = false;
    } else if (password !== confirmPassword) {
        setFieldError('confirmPassword', 'confirmPasswordError', 'Passwords do not match.');
        valid = false;
    } else clearFieldError('confirmPassword', 'confirmPasswordError');
    return valid;
}

function validateEmail(inputId, errorId, email) {
    if (!email) {
        setFieldError(inputId, errorId, 'Email is required.');
        return false;
    }
    if (!emailPattern.test(email)) {
        setFieldError(inputId, errorId, 'Please enter a valid email address.');
        return false;
    }
    clearFieldError(inputId, errorId);
    return true;
}

function validateRequired(inputId, errorId, value, message) {
    if (!value.trim()) {
        setFieldError(inputId, errorId, message);
        return false;
    }
    clearFieldError(inputId, errorId);
    return true;
}

function setFieldError(inputId, errorId, message) {
    document.getElementById(inputId).classList.add('is-invalid');
    setText(errorId, message);
}
function clearFieldError(inputId, errorId) {
    document.getElementById(inputId).classList.remove('is-invalid');
    clearText(errorId);
}
function setText(id, text) { document.getElementById(id).textContent = text; }
function clearText(id) { setText(id, ''); }

function setSubmitting(buttonId, submitting) {
    const button = document.getElementById(buttonId);
    button.disabled = submitting;
    button.querySelector('.button-label').classList.toggle('d-none', submitting);
    button.querySelector('.spinner-border').classList.toggle('d-none', !submitting);
}

function togglePassword(button) {
    const input = document.getElementById(button.dataset.togglePassword);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}

function logout(onLoggedOut) {
    clearSession();
    onLoggedOut();
    showAuthView('login');
}
