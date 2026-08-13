'use strict';

const overlay = document.getElementById('sidebarOverlay');
const menu = document.getElementById('sidebarSlide');
const closeBtn = document.getElementById('sidebarSlideClose');
const hamburger = document.getElementById('hamburgerBtn');
let isOpen = false;

function isMobile() {
    return window.innerWidth < 650;
}

function openSidebar() {
    if (!isMobile()) return;
    if (overlay) overlay.classList.add('open');
    if (menu) menu.classList.add('open');
    isOpen = true;
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    if (overlay) overlay.classList.remove('open');
    if (menu) menu.classList.remove('open');
    isOpen = false;
    document.body.style.overflow = '';
}

function toggleSidebar() {
    if (!isMobile()) return;
    isOpen ? closeSidebar() : openSidebar();
}

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

if (hamburger) {
    hamburger.addEventListener('click', toggleSidebar);
}

if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
}

if (overlay) {
    overlay.addEventListener('click', closeSidebar);
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeSidebar();
});

window.addEventListener('resize', function () {
    if (window.innerWidth >= 650 && isOpen) {
        closeSidebar();
    }
});

function updateSidebarThemeIcon() {
    const icon = document.getElementById('slideThemeIcon');
    if (!icon) return;
    const isLight = document.body.classList.contains('light-theme');
    icon.className = isLight ? 'fa fa-sun' : 'fa fa-moon';
}

const origToggleTheme = window.toggleTheme;
if (origToggleTheme) {
    window.toggleTheme = function () {
        origToggleTheme();
        updateSidebarThemeIcon();
        const overlayIcon = document.getElementById('overlayThemeIcon');
        if (overlayIcon) {
            const isLight = document.body.classList.contains('light-theme');
            overlayIcon.className = isLight ? 'fa fa-sun' : 'fa fa-moon';
        }
    };
}

document.addEventListener('DOMContentLoaded', function () {
    updateSidebarThemeIcon();
    console.log('[INFO] Sidebar slide-in inicializado correctamente');
});