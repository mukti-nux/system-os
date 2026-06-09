class AndroidWindowManager {
    constructor() {
        this.appStack = [];
        this.container = document.getElementById('active-app-container');
        this.titleEl = document.getElementById('active-app-title');
        this.bodyEl = document.getElementById('active-app-body');
        this.backBtn = document.getElementById('app-back-arrow');

        this.backBtn.onclick = () => this.closeApp();
        document.getElementById('nav-back').onclick = () => this.closeApp();
        document.getElementById('nav-home').onclick = () => this.goHome();
        document.getElementById('nav-recents').onclick = () => this.toggleRecents();
    }

    openApp(app, params = {}) {
        this.appStack.push(app);
        this.titleEl.textContent = app.title;
        this.bodyEl.innerHTML = '';

        this.container.classList.remove('hidden');
        this.container.classList.add('flex', 'app-window-enter');

        if (app.onOpen) {
            app.onOpen(this.bodyEl, params);
        }

        document.getElementById('status-bar').classList.add('bg-transparent');
    }

    closeApp() {
        if (this.appStack.length === 0) return;

        this.container.style.animation = 'app-open 0.3s reverse forwards';
        setTimeout(() => {
            this.container.classList.add('hidden');
            this.container.classList.remove('flex', 'app-window-enter');
            this.container.style.animation = '';
            const app = this.appStack.pop();
            if (app && app.onClose) app.onClose();
        }, 300);
    }

    goHome() {
        while (this.appStack.length > 0) {
            this.closeApp();
        }
        document.getElementById('recents-view').style.display = 'none';
    }

    toggleRecents() {
        const recents = document.getElementById('recents-view');
        if (recents.style.display === 'flex') {
            recents.style.display = 'none';
        } else {
            recents.style.display = 'flex';
            this.renderRecents();
        }
    }

    renderRecents() {
        const recents = document.getElementById('recents-view');
        recents.innerHTML = '';
        if (this.appStack.length === 0) {
            recents.innerHTML = '<p style="color: white">No recent apps</p>';
            return;
        }

        // In this simple version, we only show the current app if it's open
        this.appStack.forEach(app => {
            const card = document.createElement('div');
            card.className = 'recent-card';
            card.innerHTML = `
                <div class="recent-card-header">
                    <i data-lucide="${app.icon}"></i>
                    <span>${app.title}</span>
                </div>
                <div style="flex:1; background: #1a1a1a; display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="${app.icon}" size="48" style="opacity: 0.2"></i>
                </div>
            `;
            card.onclick = () => {
                recents.style.display = 'none';
            };
            recents.appendChild(card);
        });
        lucide.createIcons();
    }
}

const wm = new AndroidWindowManager();
window.wm = wm;
