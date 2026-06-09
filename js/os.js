class AndroidOS {
    constructor() {
        this.loadSettings();
        this.initProxy();
        this.initHomescreen();
        this.initStatusTime();
        this.initNotificationShade();
    }

    initProxy() {
        const savedProxy = localStorage.getItem('ag_os_proxy_enabled');
        this.proxyEnabled = savedProxy === null ? true : savedProxy === 'true';
        this.proxyUrl = localStorage.getItem('ag_os_proxy_url') || 'https://www.croxyproxy.com/_en/proxy?url={url}';
    }

    getProxiedUrl(url) {
        if (!this.proxyEnabled || !url) return url;
        if (url.includes('localhost') || url.includes('127.0.0.1')) return url;
        return this.proxyUrl.replace('{url}', encodeURIComponent(url));
    }

    setProxy(enabled, url) {
        this.proxyEnabled = enabled;
        if (url) this.proxyUrl = url;
        localStorage.setItem('ag_os_proxy_enabled', enabled);
        localStorage.setItem('ag_os_proxy_url', this.proxyUrl);
    }

    loadSettings() {
        const accent = localStorage.getItem('ag_os_accent');
        if (accent) document.documentElement.style.setProperty('--accent', accent);

        const bg = localStorage.getItem('ag_os_bg');
        const bgType = localStorage.getItem('ag_os_bg_type');
        if (bg) {
            if (bgType === 'image') {
                document.body.style.backgroundImage = `url('${bg}')`;
                this.updateUITheme(true); 
            } else {
                document.body.style.backgroundImage = 'none';
                document.body.style.backgroundColor = bg;
                this.updateUITheme(this.isColorDark(bg));
            }
        } else {
            // Default wallpaper
            document.body.style.backgroundImage = "url('wallpaper.png')";
            this.updateUITheme(true);
        }
    }

    isColorDark(color) {
        // Simple brightness check
        const rgb = color.match(/\d+/g);
        if (!rgb) return true; // Default to dark theme (white text)
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        return brightness < 128;
    }

    updateUITheme(isDark) {
        const navBar = document.getElementById('nav-bar');
        const statusBar = document.getElementById('status-bar');
        const searchInput = document.getElementById('search-input');
        
        if (isDark) {
            navBar.classList.add('text-white');
            navBar.classList.remove('text-black');
            statusBar.classList.add('text-white');
            statusBar.classList.remove('text-black');
        } else {
            navBar.classList.add('text-black');
            navBar.classList.remove('text-white');
            statusBar.classList.add('text-black');
            statusBar.classList.remove('text-white');
        }
    }

    loadCustomApps() {
        const customApps = JSON.parse(localStorage.getItem('ag_custom_apps') || '[]');
        customApps.forEach(app => {
            AppRegistry[app.id] = {
                title: app.name,
                icon: app.icon,
                html: app.html,
                entry_point: app.entry_point,
                onOpen: (content, win) => {
                    content.style.padding = '0';
                    content.style.background = '#ffffff';
                    const iframe = document.createElement('iframe');
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = 'none';
                    content.appendChild(iframe);
                    if (app.html) {
                        iframe.srcdoc = app.html;
                    } else if (app.entry_point) {
                        iframe.src = app.entry_point;
                    }
                }
            };
        });
        return customApps;
    }

    installApp(appData) {
        let customApps = JSON.parse(localStorage.getItem('ag_custom_apps') || '[]');
        const index = customApps.findIndex(app => app.id === appData.id);
        if (index > -1) {
            customApps[index] = appData;
        } else {
            customApps.push(appData);
        }
        localStorage.setItem('ag_custom_apps', JSON.stringify(customApps));
        this.initHomescreen(); // Re-render homescreen
        return true;
    }

    uninstallApp(id) {
        let customApps = JSON.parse(localStorage.getItem('ag_custom_apps') || '[]');
        const lengthBefore = customApps.length;
        customApps = customApps.filter(app => app.id !== id);
        if (customApps.length === lengthBefore) {
            return false; // Not found
        }
        localStorage.setItem('ag_custom_apps', JSON.stringify(customApps));
        delete AppRegistry[id];
        this.initHomescreen(); // Re-render homescreen
        return true;
    }

    initHomescreen() {
        const grid = document.getElementById('homescreen-apps');
        const dock = document.getElementById('dock');
        grid.innerHTML = '';
        dock.innerHTML = '';
        
        const apps = [
            { id: 'explorer', name: 'Files', icon: 'folder' },
            { id: 'notepad', name: 'Keep', icon: 'file-edit' },
            { id: 'terminal', name: 'Terminal', icon: 'terminal' },
            { id: 'settings', name: 'Settings', icon: 'settings' },
            { id: 'appstudio', name: 'App Studio', icon: 'code' },
            { id: 'gallery', name: 'Gallery', icon: 'image' },
            { id: 'webstore', name: 'Shop', icon: 'shopping-bag' },
            { id: 'esteh', name: 'Es Teh', icon: 'cup-soda' },
            { id: 'bus', name: 'Pixel Bus', icon: 'bus' },
            { id: 'camera', name: 'Camera', icon: 'camera' },
            { id: 'paint', name: 'Paint', icon: 'palette' },
            { id: 'chat', name: 'WhatsApp', icon: 'message-circle' },
            { id: 'browser', name: 'Browser', icon: 'globe' }
        ];

        // Load custom apps
        const customApps = this.loadCustomApps();
        customApps.forEach(app => {
            apps.push({ id: app.id, name: app.name, icon: app.icon });
        });

        // Fill grid
        apps.forEach(app => {
            const el = this.createAppIcon(app);
            grid.appendChild(el);
        });

        // Fill dock (cloning some apps for the dock)
        ['explorer', 'terminal', 'settings'].forEach(id => {
            const app = apps.find(a => a.id === id);
            if (app) {
                const el = this.createAppIcon(app, true);
                dock.appendChild(el);
            }
        });

        lucide.createIcons();
    }

    createAppIcon(app, isDock = false) {
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform duration-100';
        el.innerHTML = `
            <div class="w-[60px] h-[60px] bg-surface-variant rounded-2xl flex items-center justify-center shadow-lg">
                <i data-lucide="${app.icon}" class="text-accent" size="28"></i>
            </div>
            ${isDock ? '' : `<span class="text-xs font-normal text-white drop-shadow-md">${app.name}</span>`}
        `;
        el.onclick = () => wm.openApp(AppRegistry[app.id]);
        return el;
    }

    initStatusTime() {
        const timeEl = document.getElementById('status-time');
        const update = () => {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        };
        setInterval(update, 1000);
        update();
    }

    initNotificationShade() {
        const statusBar = document.getElementById('status-bar');
        const shade = document.getElementById('notification-shade');
        const handle = document.getElementById('shade-handle');
        
        let startY = 0;
        statusBar.addEventListener('mousedown', (e) => {
            startY = e.clientY;
            document.onmousemove = (moveE) => {
                if (moveE.clientY > startY + 50) {
                    shade.classList.add('open');
                }
            };
            document.onmouseup = () => {
                document.onmousemove = null;
            };
        });

        // Toggle shade on click for desktop testing
        statusBar.onclick = () => {
            shade.classList.toggle('open');
        };

        handle.onclick = () => {
            shade.classList.remove('open');
        };

        shade.onclick = (e) => {
            if (e.target === shade) shade.classList.remove('open');
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.os = new AndroidOS();
});
