/* ═══════════════════════════════════════════════════════════════
   Antigravity OS – Virtual File System  v2.0
   ═══════════════════════════════════════════════════════════════ */

class FileSystem {
    constructor() {
        this.storageKey  = 'ag_os_fs';
        this.trashKey    = 'ag_os_trash';
        this.clipboardKey = 'ag_os_clipboard';

        this.fs      = this.load()  || this._buildDefault();
        this.trash   = this._loadTrash();

        if (!this.load()) this.save();
    }

    /* ── Persistence ──────────────────────────────────────────── */
    load()  { try { const d = localStorage.getItem(this.storageKey);  return d ? JSON.parse(d) : null; } catch { return null; } }
    save()  { localStorage.setItem(this.storageKey,  JSON.stringify(this.fs));    }

    _loadTrash()  { try { const d = localStorage.getItem(this.trashKey);  return d ? JSON.parse(d) : []; } catch { return []; } }
    _saveTrash()  { localStorage.setItem(this.trashKey,  JSON.stringify(this.trash)); }

    /* ── Helpers ─────────────────────────────────────────────── */
    _now()  { return Date.now(); }
    _ts()   { return new Date().toISOString(); }

    _ext(name) { return (name.match(/\.([^.]+)$/) || ['',''])[1].toLowerCase(); }

    _mime(name) {
        const map = {
            txt:'text/plain', md:'text/markdown',
            png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif',
            jfif:'image/jpeg', jijf:'image/jpeg',
            svg:'image/svg+xml', webp:'image/webp', bmp:'image/bmp',
            mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg',
            mp4:'video/mp4', webm:'video/webm',
            pdf:'application/pdf', apk:'application/vnd.android.package-archive',
            exe:'application/x-msdownload',
            json:'application/json', html:'text/html', css:'text/css', js:'text/javascript',
            zip:'application/zip',
        };
        return map[this._ext(name)] || 'application/octet-stream';
    }

    _sizeOf(node) {
        if (!node) return 0;
        if (node.type === 'file') return (node.content || '').length;
        return Object.values(node.children || {}).reduce((a, c) => a + this._sizeOf(c), 0);
    }

    _humanSize(bytes) {
        if (bytes < 1024)        return bytes + ' B';
        if (bytes < 1048576)     return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824)  return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(2) + ' GB';
    }

    _parts(path) { return path.split('/').filter(Boolean); }

    /* ── Navigate to a node ──────────────────────────────────── */
    getNode(path) {
        if (path === '/' || path === '') return this.fs.root;
        const parts = this._parts(path);
        let cur = this.fs.root;
        for (const p of parts) {
            if (!cur.children || !cur.children[p]) return null;
            cur = cur.children[p];
        }
        return cur;
    }

    // Alias kept for backward compat
    getFile(path) { return this.getNode(path); }

    /* ── Get parent dir + filename ───────────────────────────── */
    _parentAndName(path) {
        const parts = this._parts(path);
        const name  = parts.pop();
        const parent = parts.length ? '/' + parts.join('/') : '/';
        return { parent, name };
    }

    /* ── Save / Create a file ────────────────────────────────── */
    saveFile(path, content, meta = {}) {
        const { parent, name } = this._parentAndName(path);
        this._ensureDir(parent);
        const dir = this.getNode(parent);
        const existing = dir.children[name];
        dir.children[name] = {
            type: 'file',
            name,
            content,
            size: content.length,
            mime: this._mime(name),
            createdAt:  existing ? existing.createdAt  : this._ts(),
            modifiedAt: this._ts(),
            ...meta
        };
        this.save();
        return true;
    }

    /* ── Create directory ────────────────────────────────────── */
    createDir(path) {
        if (this.getNode(path)) return false; // already exists
        const { parent, name } = this._parentAndName(path);
        this._ensureDir(parent);
        const dir = this.getNode(parent);
        dir.children[name] = {
            type: 'dir',
            name,
            children: {},
            createdAt:  this._ts(),
            modifiedAt: this._ts()
        };
        this.save();
        return true;
    }

    _ensureDir(path) {
        if (path === '/' || path === '') return;
        const parts = this._parts(path);
        let cur = this.fs.root;
        for (const p of parts) {
            if (!cur.children) cur.children = {};
            if (!cur.children[p]) {
                cur.children[p] = { type: 'dir', name: p, children: {}, createdAt: this._ts(), modifiedAt: this._ts() };
            }
            cur = cur.children[p];
        }
    }

    /* ── List directory ──────────────────────────────────────── */
    listDir(path) {
        const dir = this.getNode(path);
        if (!dir || dir.type !== 'dir') return [];
        return Object.values(dir.children || {}).map(item => ({
            ...item,
            size:     item.type === 'file' ? (item.size || (item.content || '').length) : this._sizeOf(item),
            sizeHuman: this._humanSize(item.type === 'file' ? (item.size || (item.content || '').length) : this._sizeOf(item)),
            ext:      item.type === 'file' ? this._ext(item.name) : '',
            mime:     item.type === 'file' ? (item.mime || this._mime(item.name)) : 'inode/directory',
        }));
    }

    /* ── Delete (to trash) ───────────────────────────────────── */
    trashFile(path) {
        const { parent, name } = this._parentAndName(path);
        const dir  = this.getNode(parent);
        if (!dir || !dir.children || !dir.children[name]) return false;
        const node = dir.children[name];
        this.trash.push({ node, originalPath: path, trashedAt: this._ts() });
        delete dir.children[name];
        this.save();
        this._saveTrash();
        return true;
    }

    /* ── Delete permanently ──────────────────────────────────── */
    deleteFile(path) {
        const { parent, name } = this._parentAndName(path);
        const dir = this.getNode(parent);
        if (!dir || !dir.children || !dir.children[name]) return false;
        delete dir.children[name];
        this.save();
        return true;
    }

    /* ── Restore from trash ──────────────────────────────────── */
    restoreFromTrash(idx) {
        if (idx < 0 || idx >= this.trash.length) return false;
        const item = this.trash[idx];
        this.saveFile(item.originalPath, item.node.content || '', {
            createdAt:  item.node.createdAt,
            modifiedAt: item.node.modifiedAt,
            type: item.node.type
        });
        // if it was a dir, rebuild children
        if (item.node.type === 'dir') {
            const node = this.getNode(item.originalPath);
            node.children = item.node.children || {};
        }
        this.trash.splice(idx, 1);
        this._saveTrash();
        this.save();
        return true;
    }

    /* ── Empty trash ─────────────────────────────────────────── */
    emptyTrash() {
        this.trash = [];
        this._saveTrash();
    }

    /* ── Rename ──────────────────────────────────────────────── */
    rename(path, newName) {
        const { parent, name } = this._parentAndName(path);
        const dir = this.getNode(parent);
        if (!dir || !dir.children || !dir.children[name]) return false;
        if (dir.children[newName]) return false;               // name conflict
        const node = dir.children[name];
        node.name = newName;
        node.modifiedAt = this._ts();
        dir.children[newName] = node;
        delete dir.children[name];
        this.save();
        return true;
    }

    /* ── Copy ────────────────────────────────────────────────── */
    copy(srcPath, destDir) {
        const src = this.getNode(srcPath);
        if (!src) return false;
        const destPath = destDir.replace(/\/$/, '') + '/' + src.name;
        if (src.type === 'file') {
            this.saveFile(destPath, src.content || '', {
                createdAt: this._ts(), modifiedAt: this._ts()
            });
        } else {
            this._copyDir(srcPath, destPath);
        }
        return true;
    }

    _copyDir(srcPath, destPath) {
        this.createDir(destPath);
        const items = this.listDir(srcPath);
        for (const item of items) {
            const childSrc  = srcPath.replace(/\/$/, '') + '/' + item.name;
            const childDest = destPath.replace(/\/$/, '') + '/' + item.name;
            if (item.type === 'dir') this._copyDir(childSrc, childDest);
            else {
                const node = this.getNode(childSrc);
                this.saveFile(childDest, node.content || '');
            }
        }
    }

    /* ── Move ────────────────────────────────────────────────── */
    move(srcPath, destDir) {
        if (!this.copy(srcPath, destDir)) return false;
        this.deleteFile(srcPath);
        return true;
    }

    /* ── Search ─────────────────────────────────────────────── */
    search(query, startPath = '/') {
        query = query.toLowerCase();
        const results = [];
        const walk = (path, node) => {
            if (!node) return;
            if (node.name.toLowerCase().includes(query) && path !== '/') {
                results.push({ path, node });
            }
            if (node.type === 'dir') {
                for (const [key, child] of Object.entries(node.children || {})) {
                    walk((path === '/' ? '' : path) + '/' + key, child);
                }
            }
        };
        walk(startPath, this.getNode(startPath));
        return results;
    }

    /* ── Storage stats ───────────────────────────────────────── */
    getStats() {
        const totalBytes  = this._sizeOf(this.fs.root);
        const trashBytes  = this.trash.reduce((a, t) => a + this._sizeOf(t.node), 0);
        const storageUsed = JSON.stringify(localStorage).length;
        const storageMax  = 5 * 1024 * 1024; // 5 MB typical limit
        return {
            totalBytes,
            trashBytes,
            storageUsed,
            storageMax,
            storagePercent: Math.min(100, (storageUsed / storageMax) * 100).toFixed(1),
            totalHuman:  this._humanSize(totalBytes),
            trashHuman:  this._humanSize(trashBytes),
            usedHuman:   this._humanSize(storageUsed),
            maxHuman:    this._humanSize(storageMax),
            fileCount:   this._countFiles(this.fs.root),
            dirCount:    this._countDirs(this.fs.root) - 1,
            trashCount:  this.trash.length,
        };
    }

    _countFiles(node) {
        if (!node) return 0;
        if (node.type === 'file') return 1;
        return Object.values(node.children || {}).reduce((a, c) => a + this._countFiles(c), 0);
    }

    _countDirs(node) {
        if (!node || node.type === 'file') return 0;
        return 1 + Object.values(node.children || {}).reduce((a, c) => a + this._countDirs(c), 0);
    }

    /* ── Clipboard ────────────────────────────────────────────── */
    clipboardCut(path)  { localStorage.setItem(this.clipboardKey, JSON.stringify({ path, op: 'cut' })); }
    clipboardCopy(path) { localStorage.setItem(this.clipboardKey, JSON.stringify({ path, op: 'copy' })); }
    clipboardPaste(destDir) {
        const raw = localStorage.getItem(this.clipboardKey);
        if (!raw) return false;
        const { path, op } = JSON.parse(raw);
        if (op === 'copy') this.copy(path, destDir);
        else               this.move(path, destDir);
        localStorage.removeItem(this.clipboardKey);
        return true;
    }
    getClipboard() {
        const raw = localStorage.getItem(this.clipboardKey);
        return raw ? JSON.parse(raw) : null;
    }

    /* ── Path utilities ─────────────────────────────────────── */
    basename(path) { const p = this._parts(path); return p[p.length - 1] || '/'; }
    dirname(path)  { const p = this._parts(path); p.pop(); return p.length ? '/' + p.join('/') : '/'; }
    join(...parts) { return '/' + parts.map(p => p.replace(/^\/|\/$/g, '')).filter(Boolean).join('/'); }

    /* ── Default filesystem ─────────────────────────────────── */
    _buildDefault() {
        const ts = this._ts();
        const mk = (name, content, extra = {}) => ({
            type: 'file', name, content,
            size: content.length, mime: this._mime(name),
            createdAt: ts, modifiedAt: ts, ...extra
        });
        const mkdir = (name, children = {}) => ({
            type: 'dir', name, children, createdAt: ts, modifiedAt: ts
        });

        const calcHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Calculator</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>body{background:#0f172a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.calc-btn{background:#1e293b;border:1px solid #334155;border-radius:12px;font-size:1.25rem;font-weight:500;height:3.5rem;transition:all .1s}.calc-btn:active{transform:scale(.95);background:#334155}.calc-btn.op{background:#bb86fc;color:#000}.calc-btn.clr{background:#ef476f}</style>
</head><body>
<div class="w-72 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl">
<div id="d" class="bg-slate-950/50 text-right text-3xl font-mono p-4 rounded-xl mb-4 truncate">0</div>
<div class="grid grid-cols-4 gap-2">
<button class="calc-btn clr col-span-2" onclick="c()">C</button>
<button class="calc-btn" onclick="a('/')">/</button><button class="calc-btn op" onclick="a('*')">×</button>
<button class="calc-btn" onclick="a('7')">7</button><button class="calc-btn" onclick="a('8')">8</button>
<button class="calc-btn" onclick="a('9')">9</button><button class="calc-btn op" onclick="a('-')">−</button>
<button class="calc-btn" onclick="a('4')">4</button><button class="calc-btn" onclick="a('5')">5</button>
<button class="calc-btn" onclick="a('6')">6</button><button class="calc-btn op" onclick="a('+')">+</button>
<button class="calc-btn" onclick="a('1')">1</button><button class="calc-btn" onclick="a('2')">2</button>
<button class="calc-btn" onclick="a('3')">3</button>
<button class="calc-btn op row-span-2 h-auto" onclick="eq()">=</button>
<button class="calc-btn col-span-2" onclick="a('0')">0</button>
<button class="calc-btn" onclick="a('.')">.</button>
</div></div>
<script>let v='';const el=document.getElementById('d');
function u(){el.innerText=v||'0'}
function a(x){v+=x;u()}
function c(){v='';u()}
function eq(){try{v=String(eval(v));u()}catch{el.innerText='Err';v=''}}
</script></body></html>`;

        const todoHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Tasks</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>body{background:#0c0f17;color:white;font-family:sans-serif;padding:20px;display:flex;justify-content:center}</style>
</head><body>
<div class="w-full max-w-sm bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl mt-6">
<h1 class="text-lg font-bold mb-4 text-teal-400">✓ Task List</h1>
<div class="flex gap-2 mb-4">
<input id="ti" placeholder="New task…" class="flex-1 bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none" onkeydown="if(event.key==='Enter')add()">
<button class="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-bold" onclick="add()">Add</button>
</div><ul id="tl" class="space-y-2"></ul></div>
<script>
let t=JSON.parse(localStorage.getItem('ag_tasks')||'[]');
function save(){localStorage.setItem('ag_tasks',JSON.stringify(t));render()}
function add(){const v=document.getElementById('ti').value.trim();if(v){t.push({x:v,d:false});document.getElementById('ti').value='';save()}}
function tog(i){t[i].d=!t[i].d;save()}
function del(i){t.splice(i,1);save()}
function render(){const l=document.getElementById('tl');l.innerHTML='';t.forEach((item,i)=>{const li=document.createElement('li');li.className='flex items-center justify-between bg-slate-950/50 border border-slate-800 p-3 rounded-xl';li.innerHTML='<span class="cursor-pointer '+(item.d?'line-through text-slate-500':'text-white')+' text-sm flex-1" onclick="tog('+i+')">'+item.x+'</span><button class="text-red-500 text-xs ml-2 hover:text-red-400" onclick="del('+i+')">✕</button>';l.appendChild(li)})}
render();
</script></body></html>`;

        const svgGradient = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231a2a6c"/><stop offset="50%" stop-color="%23b21f1f"/><stop offset="100%" stop-color="%23fdbb2d"/></linearGradient></defs><rect width="800" height="600" fill="url(%23g)"/><text x="400" y="320" font-family="sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" opacity="0.25">Antigravity OS</text></svg>';

        const apk = (pkg, name, icon, html, desc) => JSON.stringify({ package_name: pkg, version:'1.0.0', app_name: name, icon, html, author:'Antigravity Studio', description: desc }, null, 2);

        this.fs = {
            root: mkdir('/', {
                /* ── User folders ─────────────────── */
                'Documents': mkdir('Documents', {
                    'welcome.txt': mk('welcome.txt',
                        'Welcome to Antigravity OS!\n\nThis is a modern web-based operating system.\nAll files are stored in your browser\'s local storage.\n\nTips:\n  • Open "Files" to browse and manage your files\n  • Use "Camera" to take photos saved to /Pictures\n  • Use "Paint" to create artwork saved to /Pictures\n  • Use "App Studio" to build and install custom apps\n\nVersion 2.0 — Enjoy exploring!'),
                    'readme.md': mk('readme.md',
                        '# Antigravity OS\n\n## Overview\nA modern, Android-inspired web operating system.\n\n## Features\n- Virtual file system (localStorage)\n- Window Manager\n- App Registry & custom APK installs\n- Camera, Paint, Gallery, Notepad, Terminal\n- App Studio (build your own apps!)\n\n## File System Paths\n- `/Documents` — Your documents\n- `/Pictures`  — Photos & images\n- `/Downloads` — Downloaded files\n- `/Music`     — Audio files\n- `/Videos`    — Video files\n- `/Desktop`   — Desktop shortcuts\n- `/System`    — OS system files\n- `/Trash`     — Recycle bin\n'),
                    'calculator.apk': mk('calculator.apk', apk('com.custom.calculator','Calculator App','calculator', calcHtml,'Simple HTML Calculator')),
                    'todo_app.apk':   mk('todo_app.apk',   apk('com.custom.todo','Task Manager','check-square', todoHtml,'Task list manager')),
                }),

                'Pictures': mkdir('Pictures', {
                    'landscape_gradient.png': mk('landscape_gradient.png', svgGradient),
                }),

                'Downloads': mkdir('Downloads', {
                    'how_to_install.txt': mk('how_to_install.txt',
                        'HOW TO INSTALL APK FILES\n=========================\n\n1. Open the "Files" app\n2. Navigate to /Documents (or /Downloads)\n3. Tap any .apk file\n4. Confirm the installation prompt\n5. The app will appear on your homescreen!\n\nYou can also build your own apps using "App Studio".'),
                }),

                'Music': mkdir('Music', {
                    'playlist.txt': mk('playlist.txt',
                        'MY PLAYLIST\n===========\nNo audio files yet.\n\nAudio files saved from apps will appear here.\nSupported formats: .mp3, .wav, .ogg'),
                }),

                'Videos': mkdir('Videos', {
                    'info.txt': mk('info.txt',
                        'VIDEOS FOLDER\n=============\nVideo recordings from the Camera app are saved here.\nSupported formats: .mp4, .webm'),
                }),

                'Desktop': mkdir('Desktop', {
                    'shortcuts.txt': mk('shortcuts.txt', 'Desktop shortcuts will appear here.'),
                }),

                /* ── System folder ─────────────────── */
                'System': mkdir('System', {
                    'os_info.txt': mk('os_info.txt',
                        'ANTIGRAVITY OS\nVersion:      2.0.0\nKernel:       WebKernel/1.0\nShell:        AgShell\nFS:           VirtualFS v2\nBuild:        ' + new Date().toLocaleDateString() + '\nStorage:      localStorage\nMax Storage:  ~5 MB\nAuthor:       Antigravity Corporation'),
                    'changelog.txt': mk('changelog.txt',
                        'CHANGELOG\n=========\nv2.0.0 – File system upgrade\n  + Metadata (size, mime, dates)\n  + Trash / restore\n  + Rename, Move, Copy\n  + Clipboard (cut/copy/paste)\n  + Search across all files\n  + Storage statistics\n  + New default folders\n\nv1.2.0 – App Studio\n  + Build custom HTML apps\n  + APK export & install\n  + Templates\n\nv1.1.0 – Gallery\n  + Photo viewer with lightbox\n  + Import from device\n\nv1.0.0 – Initial Release\n  + Files, Notepad, Terminal, Settings\n  + Camera, Paint, Browser\n  + Notification shade\n'),
                    'hosts.txt': mk('hosts.txt',
                        '# System Hosts\n127.0.0.1   localhost\n::1         localhost'),
                }),

                /* ── Trash ─────────────────────────── */
                'Trash': mkdir('Trash', {}),
            })
        };

        this.save();
        return this.fs;
    }
}

const fs = new FileSystem();
window.fs = fs;
