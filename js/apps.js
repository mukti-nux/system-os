const AppRegistry = {
    explorer: {
        title: 'Files',
        icon: 'folder',
        onOpen: (content, win) => {
            const render = (path = '/') => {
                const items = fs.listDir(path);
                content.innerHTML = `
                    <div class="p-3 border-b border-white/10 mb-4 flex gap-3 items-center">
                        <i data-lucide="arrow-left" size="18" class="cursor-pointer text-white/50 hover:text-white" id="back-btn"></i>
                        <span class="text-[13px] text-white/50 truncate">${path}</span>
                    </div>
                    <div class="flex gap-2 mb-5 flex-wrap">
                        <button class="bg-surface-variant hover:bg-white/10 text-white border border-white/5 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-colors" id="new-file-btn">
                            <i data-lucide="file-plus" size="14" class="text-accent"></i>
                            New File
                        </button>
                        <button class="bg-surface-variant hover:bg-white/10 text-white border border-white/5 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-colors" id="new-folder-btn">
                            <i data-lucide="folder-plus" size="14" class="text-accent"></i>
                            New Folder
                        </button>
                        <button class="bg-surface-variant hover:bg-white/10 text-white border border-white/5 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-colors" id="import-file-btn">
                            <i data-lucide="upload" size="14" class="text-accent"></i>
                            Import
                        </button>
                        <input type="file" id="explorer-file-input" multiple style="display: none;" accept=".html,.txt,.css,.js,.exe,.png,.jijf,.jfif,.jpg,.mp4,.mp3,.apk">
                    </div>
                    <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
                        ${items.map(item => `
                            <div class="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/5 cursor-pointer app-explorer-item transition-colors" data-name="${item.name}" data-type="${item.type}">
                                <i data-lucide="${item.type === 'dir' ? 'folder' : 'file-text'}" size="32" class="${item.type === 'dir' ? 'text-blue-500' : 'text-white/70'}"></i>
                                <span class="text-[11px] text-center truncate w-full">${item.name}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                lucide.createIcons();

                content.querySelectorAll('.app-explorer-item').forEach(el => {
                    el.onclick = () => {
                        const name = el.dataset.name;
                        const type = el.dataset.type;
                        if (type === 'dir') {
                            render(path === '/' ? `/${name}` : `${path}/${name}`);
                        } else if (name.endsWith('.txt')) {
                            wm.openApp(AppRegistry.notepad, { filePath: path === '/' ? `/${name}` : `${path}/${name}` });
                        } else if (name.endsWith('.apk')) {
                            const apkPath = path === '/' ? `/${name}` : `${path}/${name}`;
                            const file = fs.getFile(apkPath);
                            if (file && file.content) {
                                try {
                                    const appData = JSON.parse(file.content);
                                    if (appData.app_name) {
                                        alert(`Installing ${appData.app_name}...`);
                                        setTimeout(() => {
                                            const installed = window.os.installApp({
                                                id: appData.package_name || `custom_${Date.now()}`,
                                                name: appData.app_name,
                                                icon: appData.icon || 'play',
                                                entry_point: appData.entry_point || '',
                                                html: appData.html || ''
                                            });
                                            if (installed) {
                                                alert(`${appData.app_name} has been successfully installed to the homescreen!`);
                                            } else {
                                                alert(`${appData.app_name} is already installed!`);
                                            }
                                        }, 1000);
                                    } else {
                                        alert('Invalid APK format.');
                                    }
                                } catch (e) {
                                    alert('Failed to parse APK: ' + e.message);
                                }
                            } else {
                                alert('Could not read APK content.');
                            }
                        }
                    };
                });

                content.querySelector('#new-file-btn').onclick = () => {
                    const name = prompt('Enter file name (e.g. notes.txt):');
                    if (name) {
                        const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
                        fs.saveFile(fullPath, '');
                        render(path);
                    }
                };

                content.querySelector('#new-folder-btn').onclick = () => {
                    const name = prompt('Enter folder name:');
                    if (name) {
                        const dir = fs.getFile(path);
                        if (dir && dir.type === 'dir') {
                            dir.children[name] = { type: 'dir', name: name, children: {} };
                            fs.save();
                            render(path);
                        }
                    }
                };

                const importBtn = content.querySelector('#import-file-btn');
                if (importBtn) {
                    importBtn.onclick = () => {
                        content.querySelector('#explorer-file-input').click();
                    };
                }

                const fileInput = content.querySelector('#explorer-file-input');
                if (fileInput) {
                    fileInput.onchange = (e) => {
                        const files = Array.from(e.target.files);
                        if (!files.length) return;

                        let loaded = 0;
                        files.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const fullPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
                                fs.saveFile(fullPath, ev.target.result);
                                loaded++;
                                if (loaded === files.length) render(path);
                            };
                            const textExts = ['html', 'txt', 'css', 'js', 'json', 'apk', 'md'];
                            const ext = file.name.split('.').pop().toLowerCase();
                            if (textExts.includes(ext)) {
                                reader.readAsText(file);
                            } else {
                                reader.readAsDataURL(file);
                            }
                        });
                        e.target.value = '';
                    };
                }

                const backBtn = content.querySelector('#back-btn');
                if (backBtn) {
                    backBtn.onclick = () => {
                        if (path === '/') return;
                        const parts = path.split('/').filter(p => p);
                        parts.pop();
                        render('/' + parts.join('/'));
                    };
                }
            };
            render();
        }
    },
    notepad: {
        title: 'Notepad',
        icon: 'file-edit',
        width: '500px',
        height: '600px',
        onOpen: (content, win) => {
            let currentPath = win.filePath || null;
            let file = currentPath ? fs.getFile(currentPath) : { content: '' };

            content.innerHTML = `
                <div style="height: 100%; display: flex; flex-direction: column;">
                    <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: var(--text-dim)">${currentPath || 'Untitled.txt'}</span>
                        <button id="save-btn" style="background: var(--accent); border: none; padding: 4px 12px; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;">Save</button>
                    </div>
                    <textarea class="app-notepad-textarea" placeholder="Start typing...">${file.content || ''}</textarea>
                </div>
            `;

            content.querySelector('#save-btn').onclick = () => {
                const text = content.querySelector('textarea').value;
                if (!currentPath) {
                    currentPath = '/Documents/new_file_' + Date.now() + '.txt';
                }
                fs.saveFile(currentPath, text);
                alert('File saved to ' + currentPath);
            };
        }
    },
    terminal: {
        title: 'Terminal',
        icon: 'terminal',
        width: '600px',
        height: '350px',
        onOpen: (content, win) => {
            content.style.backgroundColor = '#000';
            content.innerHTML = `
                <div id="term-output" style="font-family: 'Fira Code', monospace; font-size: 13px; color: #0f0; margin-bottom: 10px;">
                    Antigravity OS [Version 1.0.0]<br>
                    (c) 2026 Antigravity Corporation. All rights reserved.<br><br>
                    Type 'help' for a list of commands.<br>
                </div>
                <div style="display: flex; gap: 5px; font-family: 'Fira Code', monospace; font-size: 13px;">
                    <span style="color: #0f0">C:\\></span>
                    <input type="text" id="term-input" style="flex: 1; background: transparent; border: none; color: #fff; outline: none; font-family: inherit; font-size: inherit;">
                </div>
            `;

            const input = content.querySelector('#term-input');
            const output = content.querySelector('#term-output');

            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const cmd = input.value.trim().toLowerCase();
                    output.innerHTML += `C:\\> ${input.value}<br>`;
                    
                    if (cmd === 'help') {
                        output.innerHTML += `Available commands: help, clear, date, echo, ls, whoami<br>`;
                    } else if (cmd === 'clear') {
                        output.innerHTML = '';
                    } else if (cmd === 'date') {
                        output.innerHTML += `${new Date().toLocaleString()}<br>`;
                    } else if (cmd === 'ls') {
                        output.innerHTML += `Documents&nbsp;&nbsp;Pictures&nbsp;&nbsp;Desktop&nbsp;&nbsp;System<br>`;
                    } else if (cmd === 'whoami') {
                        output.innerHTML += `user@antigravity-os<br>`;
                    } else if (cmd.startsWith('echo ')) {
                        output.innerHTML += `${cmd.substring(5)}<br>`;
                    } else if (cmd !== '') {
                        output.innerHTML += `'${cmd}' is not recognized as an internal or external command.<br>`;
                    }
                    
                    input.value = '';
                    content.scrollTop = content.scrollHeight;
                }
            };
            input.focus();
        }
    },
    settings: {
        title: 'Settings',
        icon: 'settings',
        width: '500px',
        height: '400px',
        onOpen: (content, win) => {
            content.innerHTML = `
                <div class="flex flex-col gap-6">
                    <section>
                        <h3 class="mb-3 text-base font-semibold">Personalization</h3>
                        <p class="text-xs text-white/50 mb-3">Accent Color</p>
                        <div class="flex gap-3 mb-5">
                            <div class="theme-color w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-white/20 transition-all" style="background: #bb86fc;"></div>
                            <div class="theme-color w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-white/20 transition-all" style="background: #ef476f;"></div>
                            <div class="theme-color w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-white/20 transition-all" style="background: #06d6a0;"></div>
                            <div class="theme-color w-8 h-8 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-white/20 transition-all" style="background: #ffd166;"></div>
                        </div>

                        <p class="text-xs text-white/50 mb-3">Background (Wallpaper)</p>
                        <div class="flex gap-3 mb-4">
                            <div class="bg-color w-8 h-8 rounded-lg border border-white/10 cursor-pointer hover:scale-110 transition-transform" style="background: #000000;"></div>
                            <div class="bg-color w-8 h-8 rounded-lg border border-white/10 cursor-pointer hover:scale-110 transition-transform" style="background: #1a1a2e;"></div>
                            <div class="bg-color w-8 h-8 rounded-lg border border-white/10 cursor-pointer hover:scale-110 transition-transform" style="background: #2d3436;"></div>
                            <div class="bg-color w-8 h-8 rounded-lg border border-white/10 cursor-pointer hover:scale-110 transition-transform" style="background: #4834d4;"></div>
                        </div>
                        <div class="flex gap-2">
                            <input type="text" id="bg-url" placeholder="Paste image URL here..." class="flex-1 bg-surface-variant border border-white/5 text-white px-3 py-2 rounded-lg text-xs outline-none focus:border-accent/50 transition-colors">
                            <button id="set-bg-url" class="bg-accent text-black px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">Apply</button>
                        </div>
                    </section>
                    <section>
                        <h3 class="mb-3 text-base font-semibold">Network & Proxy</h3>
                        <div class="bg-surface-variant/50 p-4 rounded-xl border border-white/5">
                            <div class="flex justify-between items-center mb-4">
                                <span class="text-sm">Enable System Proxy</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="proxy-toggle" class="sr-only peer" ${os.proxyEnabled ? 'checked' : ''}>
                                    <div class="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                                </label>
                            </div>
                            <div class="flex flex-col gap-2">
                                <p class="text-[10px] text-white/50">Proxy Server Template</p>
                                <input type="text" id="proxy-url-input" value="${os.proxyUrl}" class="w-full bg-surface-variant border border-white/5 text-white px-3 py-2 rounded-lg text-xs outline-none focus:border-accent/50 transition-colors">
                                <p class="text-[9px] text-white/30 italic">Use {url} as placeholder for target website</p>
                            </div>
                        </div>
                    </section>
                    <section>
                        <h3 class="mb-3 text-base font-semibold">System</h3>
                        <p class="text-xs text-white/50 mb-2">Total Storage Used: ${JSON.stringify(fs.fs).length} bytes</p>
                        <button id="clear-fs" class="bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-colors">Reset System</button>
                    </section>
                </div>
            `;

            content.querySelectorAll('.theme-color').forEach(el => {
                el.onclick = () => {
                    const color = el.style.backgroundColor;
                    document.documentElement.style.setProperty('--accent', color);
                    localStorage.setItem('ag_os_accent', color);
                };
            });

            content.querySelectorAll('.bg-color').forEach(el => {
                el.onclick = () => {
                    const color = el.style.backgroundColor;
                    document.body.style.backgroundImage = 'none';
                    document.body.style.backgroundColor = color;
                    localStorage.setItem('ag_os_bg', color);
                    localStorage.setItem('ag_os_bg_type', 'color');
                    if (window.os) window.os.updateUITheme(window.os.isColorDark(color));
                };
            });

            content.querySelector('#set-bg-url').onclick = () => {
                const url = content.querySelector('#bg-url').value;
                if (url) {
                    document.body.style.backgroundImage = `url('${url}')`;
                    localStorage.setItem('ag_os_bg', url);
                    localStorage.setItem('ag_os_bg_type', 'image');
                    if (window.os) window.os.updateUITheme(true); // Default to dark theme for custom images
                }
            };

            content.querySelector('#proxy-toggle').onchange = (e) => {
                os.setProxy(e.target.checked, content.querySelector('#proxy-url-input').value);
            };

            content.querySelector('#proxy-url-input').onchange = (e) => {
                os.setProxy(content.querySelector('#proxy-toggle').checked, e.target.value);
            };

            content.querySelector('#clear-fs').onclick = () => {
                if (confirm('Are you sure? This will delete all your files!')) {
                    localStorage.removeItem('ag_os_fs');
                    location.reload();
                }
            };
        }
    },
    webstore: {
        title: 'Marketplace',
        icon: 'shopping-bag',
        onOpen: (content) => {
            content.style.padding = '0';
            content.innerHTML = `<iframe src="../webstore-1/frontend/index.html" style="width:100%; height:100%; border:none;"></iframe>`;
        }
    },
    esteh: {
        title: 'Es Teh Sim',
        icon: 'cup-soda',
        onOpen: (content) => {
            content.style.padding = '0';
            content.innerHTML = `<iframe src="../game_1/index.html" style="width:100%; height:100%; border:none;"></iframe>`;
        }
    },
    bus: {
        title: 'Pixel Bus',
        icon: 'bus',
        onOpen: (content) => {
            content.style.padding = '0';
            content.innerHTML = `<iframe src="../game_2/bus_pixel_game/index.html" style="width:100%; height:100%; border:none;"></iframe>`;
        }
    },
    camera: {
        title: 'Camera',
        icon: 'camera',
        onOpen: (content, win) => {
            content.style.padding = '0';
            content.style.background = '#000';
            content.innerHTML = `
                <div style="height: 100%; display: flex; flex-direction: column; position: relative;">
                    <video id="cam-preview" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                    <div style="position: absolute; bottom: 30px; width: 100%; display: flex; justify-content: center; align-items: center; gap: 30px;">
                        <div id="cam-gallery" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid white; overflow: hidden; background: #333;"></div>
                        <div id="cam-shutter" style="width: 70px; height: 70px; border-radius: 50%; border: 5px solid white; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <div style="width: 50px; height: 50px; border-radius: 50%; background: white;"></div>
                        </div>
                        <div id="cam-toggle-mode" style="width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <i data-lucide="video" color="white" size="20"></i>
                        </div>
                    </div>
                    <canvas id="cam-canvas" style="display: none;"></canvas>
                </div>
            `;
            lucide.createIcons();

            const video = content.querySelector('#cam-preview');
            const shutter = content.querySelector('#cam-shutter');
            const gallery = content.querySelector('#cam-gallery');
            const canvas = content.querySelector('#cam-canvas');
            const modeBtn = content.querySelector('#cam-toggle-mode');
            
            let stream = null;
            let isVideoMode = false;
            let mediaRecorder = null;
            let recordedChunks = [];

            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
                .then(s => {
                    stream = s;
                    video.srcObject = stream;
                })
                .catch(err => {
                    content.innerHTML = `<div style="color: white; padding: 20px;">Camera access denied or not available.</div>`;
                });

            shutter.onclick = () => {
                if (!isVideoMode) {
                    // Take Photo
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);
                    const dataUrl = canvas.toDataURL('image/png');
                    const fileName = `IMG_${Date.now()}.png`;
                    fs.saveFile(`/Pictures/${fileName}`, dataUrl);
                    gallery.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    alert('Photo saved to /Pictures/' + fileName);
                } else {
                    // Record Video
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                        shutter.querySelector('div').style.background = 'white';
                        shutter.querySelector('div').style.borderRadius = '50%';
                    } else {
                        recordedChunks = [];
                        mediaRecorder = new MediaRecorder(stream);
                        mediaRecorder.ondataavailable = (e) => {
                            if (e.data.size > 0) recordedChunks.push(e.data);
                        };
                        mediaRecorder.onstop = () => {
                            const blob = new Blob(recordedChunks, { type: 'video/webm' });
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const dataUrl = reader.result;
                                const fileName = `VID_${Date.now()}.webm`;
                                fs.saveFile(`/Pictures/${fileName}`, dataUrl);
                                alert('Video saved to /Pictures/' + fileName);
                            };
                            reader.readAsDataURL(blob);
                        };
                        mediaRecorder.start();
                        shutter.querySelector('div').style.background = 'red';
                        shutter.querySelector('div').style.borderRadius = '8px';
                    }
                }
            };

            modeBtn.onclick = () => {
                isVideoMode = !isVideoMode;
                modeBtn.innerHTML = isVideoMode ? `<i data-lucide="camera" color="white" size="20"></i>` : `<i data-lucide="video" color="white" size="20"></i>`;
                lucide.createIcons();
                shutter.style.borderColor = isVideoMode ? 'red' : 'white';
            };

            // Cleanup on close
            AppRegistry.camera.onClose = () => {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
            };
        }
    },
    paint: {
        title: 'Paint',
        icon: 'palette',
        onOpen: (content, win) => {
            content.style.padding = '0';
            content.style.background = '#222';
            content.innerHTML = `
                <div style="height: 100%; display: flex; flex-direction: column;">
                    <!-- Toolbar -->
                    <div style="background: #333; padding: 8px; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid #444; overflow-x: auto;">
                        <div class="paint-tool-group" style="display: flex; gap: 5px; border-right: 1px solid #555; padding-right: 10px;">
                            <button class="paint-tool active" data-tool="brush" title="Brush"><i data-lucide="brush"></i></button>
                            <button class="paint-tool" data-tool="eraser" title="Eraser"><i data-lucide="eraser"></i></button>
                            <button class="paint-tool" data-tool="line" title="Line"><i data-lucide="minus"></i></button>
                            <button class="paint-tool" data-tool="rect" title="Rectangle"><i data-lucide="square"></i></button>
                            <button class="paint-tool" data-tool="circle" title="Circle"><i data-lucide="circle"></i></button>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; border-right: 1px solid #555; padding-right: 10px;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                                <input type="color" id="paint-color" value="#bb86fc" style="width: 24px; height: 24px; border: none; cursor: pointer;" title="Brush Color">
                                <span style="font-size: 8px; color: #888;">Brush</span>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                                <input type="color" id="paint-bg-color" value="#ffffff" style="width: 24px; height: 24px; border: none; cursor: pointer;" title="Canvas Color">
                                <span style="font-size: 8px; color: #888;">Canvas</span>
                            </div>
                            <input type="range" id="paint-size" min="1" max="50" value="5" style="width: 60px;" title="Brush Size">
                            <input type="range" id="paint-opacity" min="0.1" max="1" step="0.1" value="1" style="width: 50px;" title="Opacity">
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button id="paint-undo" class="paint-btn"><i data-lucide="undo" size="16"></i></button>
                            <button id="paint-clear" class="paint-btn" style="color: #ff5f56;"><i data-lucide="trash-2" size="16"></i></button>
                            <button id="paint-save" class="paint-btn" style="color: var(--accent-secondary);"><i data-lucide="download" size="16"></i></button>
                        </div>
                    </div>
                    <div style="flex: 1; position: relative; background: #444; display: flex; align-items: center; justify-content: center; overflow: auto;">
                        <canvas id="paint-canvas" style="background: white; box-shadow: 0 0 20px rgba(0,0,0,0.5); cursor: crosshair;"></canvas>
                    </div>
                </div>
                <style>
                    .paint-tool { background: transparent; border: 1px solid transparent; color: #ccc; padding: 5px; border-radius: 4px; cursor: pointer; transition: 0.2s; }
                    .paint-tool:hover { background: #444; }
                    .paint-tool.active { background: var(--accent); color: black; }
                    .paint-btn { background: #444; border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; }
                    .paint-btn:hover { background: #555; }
                </style>
            `;
            lucide.createIcons();
            
            const canvas = content.querySelector('#paint-canvas');
            const ctx = canvas.getContext('2d');
            const colorPicker = content.querySelector('#paint-color');
            const bgColorPicker = content.querySelector('#paint-bg-color');
            const sizePicker = content.querySelector('#paint-size');
            const opacityPicker = content.querySelector('#paint-opacity');
            const tools = content.querySelectorAll('.paint-tool');
            
            let currentTool = 'brush';
            let drawing = false;
            let startX, startY;
            let undoStack = [];
            let snapshot;

            const saveState = () => {
                if (undoStack.length > 20) undoStack.shift();
                undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            };

            const resize = () => {
                canvas.width = 800;
                canvas.height = 600;
                ctx.fillStyle = bgColorPicker.value;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                saveState();
            };
            setTimeout(resize, 100);

            bgColorPicker.onchange = () => {
                saveState();
                ctx.fillStyle = bgColorPicker.value;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // We redraw the last state on top of the new background if we wanted persistence, 
                // but usually background change in simple paint fills the whole thing.
            };

            tools.forEach(btn => {
                btn.onclick = () => {
                    tools.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentTool = btn.dataset.tool;
                };
            });

            const start = (e) => {
                drawing = true;
                const rect = canvas.getBoundingClientRect();
                startX = (e.clientX || e.touches[0].clientX) - rect.left;
                startY = (e.clientY || e.touches[0].clientY) - rect.top;
                
                ctx.lineWidth = sizePicker.value;
                ctx.globalAlpha = opacityPicker.value;
                ctx.strokeStyle = currentTool === 'eraser' ? 'white' : colorPicker.value;
                ctx.fillStyle = colorPicker.value;
                
                snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
                saveState();
                
                if (currentTool === 'brush' || currentTool === 'eraser') {
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                }
            };

            const draw = (e) => {
                if (!drawing) return;
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX || (e.touches ? e.touches[0].clientX : 0)) - rect.left;
                const y = (e.clientY || (e.touches ? e.touches[0].clientY : 0)) - rect.top;

                if (currentTool === 'brush' || currentTool === 'eraser') {
                    ctx.lineTo(x, y);
                    ctx.stroke();
                } else {
                    // Shapes
                    ctx.putImageData(snapshot, 0, 0);
                    if (currentTool === 'line') {
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    } else if (currentTool === 'rect') {
                        ctx.strokeRect(startX, startY, x - startX, y - startY);
                    } else if (currentTool === 'circle') {
                        ctx.beginPath();
                        const r = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
                        ctx.arc(startX, startY, r, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                }
            };

            const end = () => {
                drawing = false;
                ctx.beginPath();
            };

            canvas.addEventListener('mousedown', start);
            canvas.addEventListener('mousemove', draw);
            window.addEventListener('mouseup', end);

            canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); });
            canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
            canvas.addEventListener('touchend', end);

            content.querySelector('#paint-undo').onclick = () => {
                if (undoStack.length > 0) {
                    ctx.putImageData(undoStack.pop(), 0, 0);
                }
            };

            content.querySelector('#paint-clear').onclick = () => {
                saveState();
                ctx.fillStyle = bgColorPicker.value;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            };

            content.querySelector('#paint-save').onclick = () => {
                const dataUrl = canvas.toDataURL('image/png');
                const fileName = `PAINT_${Date.now()}.png`;
                fs.saveFile(`/Pictures/${fileName}`, dataUrl);
                alert('Masterpiece saved to /Pictures/' + fileName);
            };
        }
    },
    chat: {
        title: 'WhatsApp',
        icon: 'message-circle',
        onOpen: (content) => {
            content.style.padding = '0';
            content.innerHTML = `<iframe src="../chat app/index.html" style="width:100%; height:100%; border:none;"></iframe>`;
        }
    },
    browser: {
        title: 'Phoenix Browser',
        icon: 'globe',
        width: '90%',
        height: '85%',
        onOpen: (content) => {
            content.style.padding = '0';
            content.style.background = '#000';
            content.innerHTML = `<iframe src="../browser/index.html" style="width:100%; height:100%; border:none;" id="browser-app-iframe"></iframe>`;
        }
    },
    appstudio: {
        title: 'App Studio',
        icon: 'code',
        width: '95%',
        height: '90%',
        onOpen: (content, win) => {
            content.innerHTML = `
                <div class="flex flex-col h-full bg-[#121212] text-white">
                    <!-- Tab Bar -->
                    <div class="flex border-b border-white/10 bg-[#1a1a1a] text-xs font-semibold">
                        <button class="studio-tab-btn flex-1 py-3 border-b-2 border-accent text-accent transition-colors" data-tab="editor">Code Editor</button>
                        <button class="studio-tab-btn flex-1 py-3 border-b-2 border-transparent text-white/60 hover:text-white transition-colors" data-tab="templates">Templates</button>
                        <button class="studio-tab-btn flex-1 py-3 border-b-2 border-transparent text-white/60 hover:text-white transition-colors" data-tab="my-apps">My Apps</button>
                    </div>

                    <!-- Tab Contents -->
                    <div class="flex-1 overflow-hidden relative">
                        <!-- EDITOR TAB -->
                        <div class="studio-tab-content flex flex-col lg:flex-row h-full" id="studio-tab-editor">
                            <!-- Left: Editor inputs -->
                            <div class="w-full lg:w-1/2 p-4 flex flex-col gap-4 border-r border-white/10 overflow-y-auto h-full">
                                <div>
                                    <label class="block text-[10px] text-white/50 uppercase tracking-wider mb-1.5 font-semibold">App Name</label>
                                    <input type="text" id="app-name-input" placeholder="e.g. My Calculator" class="w-full bg-[#1e1e1e] border border-white/10 text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-accent/50 transition-colors">
                                </div>

                                <div>
                                    <label class="block text-[10px] text-white/50 uppercase tracking-wider mb-1.5 font-semibold">App Icon</label>
                                    <div class="grid grid-cols-8 gap-2 bg-[#1e1e1e] p-3 rounded-xl border border-white/10" id="icon-selector">
                                        <!-- icons will be populated here -->
                                    </div>
                                    <input type="hidden" id="app-icon-input" value="play">
                                </div>

                                <div class="flex-1 flex flex-col min-h-[200px]">
                                    <label class="block text-[10px] text-white/50 uppercase tracking-wider mb-1.5 font-semibold">HTML Code (HTML, CSS, JS)</label>
                                    <textarea id="app-code-input" class="flex-1 w-full bg-[#1e1e1e] border border-white/10 text-white p-3 rounded-xl text-xs font-mono outline-none focus:border-accent/50 resize-none" placeholder="Write HTML/JS code here..."></textarea>
                                </div>

                                <div class="flex gap-2">
                                    <button id="studio-preview-btn" class="flex-1 bg-surface-variant hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2">
                                        <i data-lucide="play" size="14" class="text-accent"></i> Run / Preview
                                    </button>
                                    <button id="studio-install-btn" class="flex-1 bg-accent text-black py-2.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                        <i data-lucide="plus" size="14"></i> Install App
                                    </button>
                                    <button id="studio-export-btn" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2" title="Save as .apk to Files">
                                        <i data-lucide="download" size="14"></i> Save APK
                                    </button>
                                </div>
                            </div>

                            <!-- Right: Live Preview -->
                            <div class="w-full lg:w-1/2 p-4 flex flex-col h-full bg-[#0a0a0a]">
                                <label class="block text-[10px] text-white/50 uppercase tracking-wider mb-1.5 font-semibold">Live Preview</label>
                                <div class="flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl relative" id="preview-container">
                                    <div id="preview-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-black/40 bg-slate-50 p-5 text-center">
                                        <i data-lucide="smartphone" size="48" class="text-slate-300 mb-2"></i>
                                        <p class="text-xs font-semibold text-slate-500">No active preview</p>
                                        <p class="text-[10px] text-slate-400 mt-1 max-w-[200px]">Click 'Run / Preview' to render your app code here.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TEMPLATES TAB -->
                        <div class="studio-tab-content hidden p-5 overflow-y-auto h-full" id="studio-tab-templates">
                            <h2 class="text-base font-semibold mb-4 text-white/90">Choose a template to start</h2>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="templates-grid">
                                <!-- Templates card -->
                            </div>
                        </div>

                        <!-- MY APPS TAB -->
                        <div class="studio-tab-content hidden p-5 overflow-y-auto h-full" id="studio-tab-my-apps">
                            <h2 class="text-base font-semibold mb-4 text-white/90">Created Applications</h2>
                            <div class="space-y-3" id="my-apps-list">
                                <!-- user created apps list -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();

            // Populate Icons
            const icons = ['play', 'calculator', 'cup-soda', 'check-square', 'gamepad-2', 'music', 'calendar', 'heart', 'cloud', 'star', 'image', 'code', 'book-open', 'smile', 'clock', 'message-square'];
            const iconSelector = content.querySelector('#icon-selector');
            const appIconInput = content.querySelector('#app-icon-input');

            icons.forEach(ic => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `p-2 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors border border-transparent ${ic === 'play' ? 'bg-accent/10 border-accent/30 text-accent' : 'text-white/60'}`;
                btn.innerHTML = `<i data-lucide="${ic}" size="18"></i>`;
                btn.onclick = () => {
                    iconSelector.querySelectorAll('button').forEach(b => {
                        b.className = 'p-2 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors border border-transparent text-white/60';
                    });
                    btn.className = 'p-2 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors border border-accent/30 bg-accent/10 text-accent';
                    appIconInput.value = ic;
                };
                iconSelector.appendChild(btn);
            });
            lucide.createIcons();

            // Tabs switching logic
            const tabButtons = content.querySelectorAll('.studio-tab-btn');
            const tabContents = content.querySelectorAll('.studio-tab-content');

            const switchTab = (tabId) => {
                tabButtons.forEach(btn => {
                    if (btn.dataset.tab === tabId) {
                        btn.className = 'studio-tab-btn flex-1 py-3 border-b-2 border-accent text-accent transition-colors';
                    } else {
                        btn.className = 'studio-tab-btn flex-1 py-3 border-b-2 border-transparent text-white/60 hover:text-white transition-colors';
                    }
                });

                tabContents.forEach(ct => {
                    if (ct.id === `studio-tab-${tabId}`) {
                        ct.classList.remove('hidden');
                    } else {
                        ct.classList.add('hidden');
                    }
                });

                if (tabId === 'my-apps') {
                    renderMyApps();
                }
            };

            tabButtons.forEach(btn => {
                btn.onclick = () => switchTab(btn.dataset.tab);
            });

            // Live Preview functionality
            const previewBtn = content.querySelector('#studio-preview-btn');
            const previewContainer = content.querySelector('#preview-container');
            const previewPlaceholder = content.querySelector('#preview-placeholder');

            previewBtn.onclick = () => {
                const code = content.querySelector('#app-code-input').value;
                if (!code.trim()) {
                    alert('Please enter some HTML code first.');
                    return;
                }

                if (previewPlaceholder) previewPlaceholder.style.display = 'none';

                const oldIframe = previewContainer.querySelector('iframe');
                if (oldIframe) oldIframe.remove();

                const iframe = document.createElement('iframe');
                iframe.className = 'w-full h-full border-none bg-white';
                previewContainer.appendChild(iframe);
                iframe.srcdoc = code;
            };

            // Install App functionality
            const installBtn = content.querySelector('#studio-install-btn');
            installBtn.onclick = () => {
                const name = content.querySelector('#app-name-input').value.trim();
                const icon = appIconInput.value;
                const html = content.querySelector('#app-code-input').value;

                if (!name) {
                    alert('Please enter an App Name.');
                    return;
                }
                if (!html.trim()) {
                    alert('Please write or load some HTML code first.');
                    return;
                }

                const id = `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
                const appData = { id, name, icon, html };

                const installed = window.os.installApp(appData);
                if (installed) {
                    alert(`"${name}" has been successfully installed to the homescreen!`);
                    switchTab('my-apps');
                } else {
                    alert('Could not install the app.');
                }
            };

            // Export APK functionality
            const exportBtn = content.querySelector('#studio-export-btn');
            exportBtn.onclick = () => {
                const name = content.querySelector('#app-name-input').value.trim();
                const icon = appIconInput.value;
                const html = content.querySelector('#app-code-input').value;

                if (!name) {
                    alert('Please enter an App Name.');
                    return;
                }
                if (!html.trim()) {
                    alert('Please write or load some HTML code first.');
                    return;
                }

                const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const apkFilename = `${safeName}.apk`;
                const apkData = {
                    package_name: `com.custom.${safeName}`,
                    version: "1.0.0",
                    app_name: name,
                    icon: icon,
                    html: html,
                    author: "App Studio Developer",
                    description: `Custom created HTML application.`
                };

                fs.saveFile(`/Documents/${apkFilename}`, JSON.stringify(apkData, null, 2));
                alert(`App successfully exported to Files as "/Documents/${apkFilename}". You can install it by clicking it in the Files app!`);
            };

            // Templates definitions
            const templates = [
                {
                    name: 'Calculator',
                    icon: 'calculator',
                    description: 'A fully functional calculator with responsive grid layout and dynamic display.',
                    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Calculator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .calc-btn { background: #1e293b; border: 1px solid #334155; border-radius: 12px; font-size: 1.25rem; font-weight: 500; height: 3.5rem; transition: all 0.1s; }
        .calc-btn:active { transform: scale(0.95); background: #334155; }
        .calc-btn.operator { background: #bb86fc; color: #000; }
        .calc-btn.operator:active { background: #d7b5ff; }
        .calc-btn.clear { background: #ef476f; }
        .calc-btn.clear:active { background: #ff85a2; }
    </style>
</head>
<body>
    <div class="w-72 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl">
        <div id="display" class="bg-slate-950/50 text-right text-3xl font-mono p-4 rounded-xl mb-4 overflow-x-auto truncate">0</div>
        <div class="grid grid-cols-4 gap-2">
            <button class="calc-btn clear col-span-2" onclick="clearDisplay()">C</button>
            <button class="calc-btn" onclick="append('/')">/</button>
            <button class="calc-btn operator" onclick="append('*')">*</button>
            
            <button class="calc-btn" onclick="append('7')">7</button>
            <button class="calc-btn" onclick="append('8')">8</button>
            <button class="calc-btn" onclick="append('9')">9</button>
            <button class="calc-btn operator" onclick="append('-')">-</button>
            
            <button class="calc-btn" onclick="append('4')">4</button>
            <button class="calc-btn" onclick="append('5')">5</button>
            <button class="calc-btn" onclick="append('6')">6</button>
            <button class="calc-btn operator" onclick="append('+')">+</button>
            
            <button class="calc-btn" onclick="append('1')">1</button>
            <button class="calc-btn" onclick="append('2')">2</button>
            <button class="calc-btn" onclick="append('3')">3</button>
            <button class="calc-btn operator row-span-2 h-auto" onclick="calculate()">=</button>
            
            <button class="calc-btn col-span-2" onclick="append('0')">0</button>
            <button class="calc-btn" onclick="append('.')">.</button>
        </div>
    </div>
    <script>
        const display = document.getElementById('display');
        let current = '';
        function update() { display.innerText = current || '0'; }
        function append(val) { current += val; update(); }
        function clearDisplay() { current = ''; update(); }
        function calculate() {
            try {
                const res = eval(current);
                current = String(res);
                update();
            } catch(e) {
                display.innerText = 'Error';
                current = '';
            }
        }
    </script>
</body>
</html>`
                },
                {
                    name: 'Soda Clicker',
                    icon: 'cup-soda',
                    description: 'An interactive idle/clicker game where clicking generates coins to buy production rate upgrades.',
                    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Soda Clicker</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { background: #090d16; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .pulse-active:active { transform: scale(0.95); }
    </style>
</head>
<body>
    <div class="w-80 bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center shadow-2xl flex flex-col items-center">
        <h1 class="text-xl font-bold mb-1 text-purple-400">Soda Clicker</h1>
        <p class="text-xs text-slate-400 mb-6">Click the cup to generate soda coins!</p>
        
        <div class="text-3xl font-black mb-6 text-yellow-400" id="coins-display">0 Coins</div>
        
        <button id="clicker" class="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 pulse-active transition-transform cursor-pointer mb-6" onclick="clickSoda()">
            <i data-lucide="cup-soda" class="text-white" size="64"></i>
        </button>
        
        <div class="w-full bg-slate-800/50 p-4 rounded-2xl text-left text-xs space-y-3">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold">Auto-Filler</p>
                    <p class="text-slate-400 text-[10px]" id="filler-cost">Cost: 10 coins (+1/sec)</p>
                </div>
                <button class="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform" onclick="buyFiller()">Buy</button>
            </div>
            <div class="border-t border-slate-800 pt-2 flex justify-between items-center">
                <span class="text-slate-400">Production Rate:</span>
                <span class="font-bold text-green-400" id="rate-display">0 coins/s</span>
            </div>
        </div>
    </div>
    <script>
        let coins = 0;
        let rate = 0;
        let fillerCost = 10;
        
        function update() {
            document.getElementById('coins-display').innerText = coins + ' Coins';
            document.getElementById('filler-cost').innerText = 'Cost: ' + fillerCost + ' coins (+1/sec)';
            document.getElementById('rate-display').innerText = rate + ' coins/s';
        }
        
        function clickSoda() {
            coins += 1;
            update();
        }
        
        function buyFiller() {
            if (coins >= fillerCost) {
                coins -= fillerCost;
                rate += 1;
                fillerCost = Math.round(fillerCost * 1.5);
                update();
            } else {
                alert('Not enough coins!');
            }
        }
        
        setInterval(() => {
            if (rate > 0) {
                coins += rate;
                update();
            }
        }, 1000);
        
        lucide.createIcons();
    </script>
</body>
</html>`
                },
                {
                    name: 'Task List',
                    icon: 'check-square',
                    description: 'A tasks/todo list manager with add, check, and delete items.',
                    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Simple Tasks</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { background: #0c0f17; color: white; font-family: sans-serif; padding: 20px; display: flex; justify-content: center; }
    </style>
</head>
<body>
    <div class="w-full max-w-sm bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl mt-6">
        <h1 class="text-lg font-bold mb-4 flex items-center gap-2 text-teal-400">
            <i data-lucide="check-square"></i> Tasks List
        </h1>
        <div class="flex gap-2 mb-4">
            <input type="text" id="task-input" placeholder="What needs to be done?" class="flex-1 bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500/50 transition-colors">
            <button class="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-lg text-sm font-semibold active:scale-95 transition-transform" onclick="addTask()">Add</button>
        </div>
        <ul id="task-list" class="space-y-2"></ul>
    </div>
    <script>
        let tasks = JSON.parse(localStorage.getItem('my_custom_tasks') || '[]');
        
        function save() {
            localStorage.setItem('my_custom_tasks', JSON.stringify(tasks));
            render();
        }
        
        function addTask() {
            const input = document.getElementById('task-input');
            const val = input.value.trim();
            if (val) {
                tasks.push({ text: val, done: false });
                input.value = '';
                save();
            }
        }
        
        function toggleTask(idx) {
            tasks[idx].done = !tasks[idx].done;
            save();
        }
        
        function deleteTask(idx) {
            tasks.splice(idx, 1);
            save();
        }
        
        function render() {
            const list = document.getElementById('task-list');
            list.innerHTML = '';
            tasks.forEach((t, i) => {
                const li = document.createElement('li');
                li.className = 'flex items-center justify-between bg-slate-950/50 border border-slate-800/60 p-3 rounded-xl';
                li.innerHTML = '<div class="flex items-center gap-3 cursor-pointer" onclick="toggleTask(' + i + ')">' +
                    '<i data-lucide="' + (t.done ? 'check-circle' : 'circle') + '" class="' + (t.done ? 'text-teal-400' : 'text-slate-500') + '"></i>' +
                    '<span class="' + (t.done ? 'line-through text-slate-500' : 'text-slate-200') + ' text-sm">' + t.text + '</span>' +
                    '</div>' +
                    '<button class="text-red-500 hover:text-red-400 p-1 active:scale-90 transition-transform" onclick="deleteTask(' + i + ')">' +
                    '<i data-lucide="trash" size="16"></i>' +
                    '</button>';
                list.appendChild(li);
            });
            lucide.createIcons();
        }
        
        render();
    </script>
</body>
</html>`
                }
            ];

            // Render templates
            const templatesGrid = content.querySelector('#templates-grid');
            templatesGrid.innerHTML = '';

            templates.forEach(tpl => {
                const card = document.createElement('div');
                card.className = 'bg-[#1e1e1e] p-5 rounded-2xl border border-white/5 hover:border-accent/30 transition-all flex flex-col gap-3 justify-between';
                card.innerHTML = `
                    <div>
                        <div class="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-3">
                            <i data-lucide="${tpl.icon}" class="text-accent"></i>
                        </div>
                        <h3 class="font-semibold text-sm mb-1 text-white/90">${tpl.name}</h3>
                        <p class="text-[11px] text-white/50 leading-relaxed">${tpl.description}</p>
                    </div>
                    <button class="w-full bg-accent/10 hover:bg-accent hover:text-black text-accent py-2 rounded-xl text-xs font-semibold transition-all">
                        Load Template
                    </button>
                `;

                card.querySelector('button').onclick = () => {
                    content.querySelector('#app-name-input').value = tpl.name;
                    appIconInput.value = tpl.icon;

                    iconSelector.querySelectorAll('button').forEach(b => {
                        b.className = 'p-2 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors border border-transparent text-white/60';
                    });
                    const selectIconBtn = Array.from(iconSelector.querySelectorAll('button')).find(btn => btn.querySelector(`[data-lucide="${tpl.icon}"]`));
                    if (selectIconBtn) {
                        selectIconBtn.className = 'p-2 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors border border-accent/30 bg-accent/10 text-accent';
                    }

                    content.querySelector('#app-code-input').value = tpl.html;
                    switchTab('editor');
                };

                templatesGrid.appendChild(card);
            });
            lucide.createIcons();

            // Render My Apps
            const renderMyApps = () => {
                const list = content.querySelector('#my-apps-list');
                list.innerHTML = '';
                const myApps = JSON.parse(localStorage.getItem('ag_custom_apps') || '[]');

                if (myApps.length === 0) {
                    list.innerHTML = `
                        <div class="text-center py-10 text-white/30 text-xs">
                            <i data-lucide="code" size="32" class="mx-auto mb-2 opacity-50"></i>
                            No applications created yet. Build one in the Editor tab!
                        </div>
                    `;
                    lucide.createIcons();
                    return;
                }

                myApps.forEach(app => {
                    const el = document.createElement('div');
                    el.className = 'flex items-center justify-between bg-[#1e1e1e] p-4 rounded-2xl border border-white/5';
                    el.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-surface-variant rounded-xl flex items-center justify-center shadow-lg">
                                <i data-lucide="${app.icon}" class="text-accent"></i>
                            </div>
                            <div>
                                <h4 class="text-xs font-semibold text-white/90">${app.name}</h4>
                                <p class="text-[10px] text-white/40">Package: ${app.id}</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button class="edit-app-btn bg-surface-variant hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1">
                                <i data-lucide="edit" size="10"></i> Edit
                            </button>
                            <button class="uninstall-app-btn bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1">
                                <i data-lucide="trash" size="10"></i> Uninstall
                            </button>
                        </div>
                    `;

                    el.querySelector('.edit-app-btn').onclick = () => {
                        content.querySelector('#app-name-input').value = app.name;
                        appIconInput.value = app.icon;

                        iconSelector.querySelectorAll('button').forEach(b => {
                            b.className = 'p-2 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors border border-transparent text-white/60';
                        });
                        const selectIconBtn = Array.from(iconSelector.querySelectorAll('button')).find(btn => btn.querySelector(`[data-lucide="${app.icon}"]`));
                        if (selectIconBtn) {
                            selectIconBtn.className = 'p-2 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors border border-accent/30 bg-accent/10 text-accent';
                        }

                        content.querySelector('#app-code-input').value = app.html || '';
                        switchTab('editor');
                    };

                    el.querySelector('.uninstall-app-btn').onclick = () => {
                        if (confirm(`Are you sure you want to uninstall "${app.name}"?`)) {
                            window.os.uninstallApp(app.id);
                            renderMyApps();
                        }
                    };

                    list.appendChild(el);
                });
                lucide.createIcons();
            };
        }
    },
    gallery: {
        title: 'Gallery',
        icon: 'image',
        onOpen: (content, win) => {
            const PICTURES_PATH = '/Pictures';

            content.style.padding = '0';
            content.style.background = '#0a0a0f';
            content.style.overflow = 'hidden';

            content.innerHTML = `
                <style>
                    .gallery-root { display: flex; flex-direction: column; height: 100%; background: #0a0a0f; color: white; font-family: 'Outfit', sans-serif; }

                    /* Toolbar */
                    .gallery-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.07); gap: 10px; flex-shrink: 0; }
                    .gallery-title { font-size: 16px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px; }
                    .gallery-title i { color: #bb86fc; }
                    .gallery-count { font-size: 11px; color: rgba(255,255,255,0.4); margin-left: 4px; }
                    .gallery-toolbar-actions { display: flex; gap: 8px; align-items: center; }
                    .gallery-view-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                    .gallery-view-btn:hover, .gallery-view-btn.active { background: rgba(187,134,252,0.2); border-color: rgba(187,134,252,0.4); color: #bb86fc; }
                    .gallery-upload-btn { background: #bb86fc; color: #000; border: none; padding: 6px 14px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: opacity 0.2s; }
                    .gallery-upload-btn:hover { opacity: 0.9; }
                    .gallery-upload-btn:active { transform: scale(0.96); }

                    /* Grid */
                    .gallery-scroll { flex: 1; overflow-y: auto; padding: 16px; }
                    .gallery-scroll::-webkit-scrollbar { width: 4px; }
                    .gallery-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

                    .gallery-section-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; padding-left: 2px; }

                    .gallery-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); margin-bottom: 20px; }
                    .gallery-grid.list-view { grid-template-columns: 1fr; gap: 4px; }

                    .gallery-item { position: relative; border-radius: 14px; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); transition: all 0.25s cubic-bezier(0.16,1,0.3,1); aspect-ratio: 1/1; }
                    .gallery-item:hover { transform: scale(1.04); border-color: rgba(187,134,252,0.5); box-shadow: 0 8px 28px rgba(187,134,252,0.25); }
                    .gallery-item:active { transform: scale(0.97); }
                    .gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
                    .gallery-item .item-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%); opacity: 0; transition: opacity 0.2s; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px; }
                    .gallery-item:hover .item-overlay { opacity: 1; }
                    .gallery-item .item-name { font-size: 9px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .gallery-item .item-actions { display: flex; gap: 4px; margin-top: 4px; }
                    .gallery-item .item-actions button { background: rgba(0,0,0,0.5); border: none; color: white; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
                    .gallery-item .item-actions button:hover { background: rgba(187,134,252,0.7); }

                    /* List View */
                    .gallery-grid.list-view .gallery-item { aspect-ratio: unset; height: 60px; border-radius: 12px; display: flex; flex-direction: row; align-items: center; padding: 0; }
                    .gallery-grid.list-view .gallery-item img { width: 60px; height: 60px; border-radius: 11px; flex-shrink: 0; object-fit: cover; }
                    .gallery-grid.list-view .gallery-item .item-overlay { position: static; background: none; opacity: 1; flex-direction: row; justify-content: space-between; align-items: center; flex: 1; padding: 0 12px; }
                    .gallery-grid.list-view .gallery-item .item-name { font-size: 12px; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
                    .gallery-grid.list-view .gallery-item .item-actions { margin-top: 0; }

                    /* Empty State */
                    .gallery-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); gap: 12px; padding: 40px; text-align: center; }
                    .gallery-empty i { color: rgba(187,134,252,0.3); }
                    .gallery-empty p { font-size: 13px; font-weight: 500; }
                    .gallery-empty span { font-size: 11px; color: rgba(255,255,255,0.2); max-width: 220px; line-height: 1.5; }

                    /* Lightbox */
                    .gallery-lightbox { position: absolute; inset: 0; background: rgba(0,0,0,0.97); z-index: 999; display: flex; flex-direction: column; animation: lb-in 0.3s cubic-bezier(0.16,1,0.3,1); }
                    @keyframes lb-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

                    .lb-topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; background: rgba(0,0,0,0.6); }
                    .lb-filename { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; }
                    .lb-topbar-actions { display: flex; gap: 8px; }
                    .lb-action-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                    .lb-action-btn:hover { background: rgba(187,134,252,0.2); border-color: rgba(187,134,252,0.4); color: #bb86fc; }
                    .lb-action-btn.danger:hover { background: rgba(239,71,111,0.2); border-color: rgba(239,71,111,0.4); color: #ef476f; }
                    .lb-action-btn.close-btn { background: rgba(239,71,111,0.1); border-color: rgba(239,71,111,0.2); color: #ef476f; }

                    .lb-main { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 16px; }
                    .lb-img-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
                    .lb-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,0.7); transition: transform 0.3s ease, opacity 0.25s ease; }
                    .lb-img.zoomed { transform: scale(1.8); cursor: zoom-out; }
                    .lb-img:not(.zoomed) { cursor: zoom-in; }

                    .lb-nav-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: white; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 10; }
                    .lb-nav-btn:hover { background: rgba(187,134,252,0.25); border-color: #bb86fc; }
                    .lb-nav-btn.prev { left: 8px; }
                    .lb-nav-btn.next { right: 8px; }
                    .lb-nav-btn:disabled { opacity: 0.2; cursor: default; }

                    .lb-footer { padding: 10px 16px 14px; text-align: center; flex-shrink: 0; }
                    .lb-counter { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 10px; }
                    .lb-strip { display: flex; gap: 6px; overflow-x: auto; justify-content: center; padding-bottom: 4px; }
                    .lb-strip::-webkit-scrollbar { height: 3px; }
                    .lb-strip::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
                    .lb-strip-thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: all 0.2s; flex-shrink: 0; }
                    .lb-strip-thumb.active { border-color: #bb86fc; opacity: 1; }
                    .lb-strip-thumb:hover { opacity: 0.85; }

                    /* Hidden file input */
                    #gallery-file-input { display: none; }
                </style>

                <div class="gallery-root" id="gallery-root">
                    <div class="gallery-toolbar">
                        <div class="gallery-title">
                            <i data-lucide="image"></i>
                            Gallery
                            <span class="gallery-count" id="gallery-count">0 photos</span>
                        </div>
                        <div class="gallery-toolbar-actions">
                            <button class="gallery-view-btn active" id="gallery-grid-btn" title="Grid View">
                                <i data-lucide="grid" size="15"></i>
                            </button>
                            <button class="gallery-view-btn" id="gallery-list-btn" title="List View">
                                <i data-lucide="list" size="15"></i>
                            </button>
                            <label class="gallery-upload-btn" for="gallery-file-input">
                                <i data-lucide="upload" size="13"></i>
                                Import
                            </label>
                            <input type="file" id="gallery-file-input" accept="image/*" multiple>
                        </div>
                    </div>

                    <div id="gallery-body" style="flex:1; display:flex; flex-direction:column; overflow:hidden;"></div>
                </div>
            `;

            lucide.createIcons();

            let currentView = 'grid';  // 'grid' | 'list'
            let images = [];           // { name, src } array
            let lightboxIndex = -1;

            // ── Load images from /Pictures ──────────────────────────────────
            function loadImages() {
                const items = fs.listDir(PICTURES_PATH);
                images = items
                    .filter(item => item.type === 'file' && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(item.name))
                    .map(item => ({
                        name: item.name,
                        src: item.content
                    }));

                renderGallery();
            }

            // ── Render main gallery view ─────────────────────────────────────
            function renderGallery() {
                const body = content.querySelector('#gallery-body');
                const countEl = content.querySelector('#gallery-count');
                countEl.textContent = `${images.length} ${images.length === 1 ? 'photo' : 'photos'}`;

                if (images.length === 0) {
                    body.innerHTML = `
                        <div class="gallery-empty">
                            <i data-lucide="image" size="64"></i>
                            <p>No photos yet</p>
                            <span>Take a photo using the Camera app, save images from Paint, or tap <b>Import</b> to add your own pictures.</span>
                        </div>
                    `;
                    lucide.createIcons();
                    return;
                }

                body.innerHTML = `
                    <div class="gallery-scroll" id="gallery-scroll">
                        <div class="gallery-section-label">All Photos</div>
                        <div class="gallery-grid ${currentView === 'list' ? 'list-view' : ''}" id="gallery-grid"></div>
                    </div>
                `;

                const grid = body.querySelector('#gallery-grid');

                images.forEach((img, idx) => {
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.innerHTML = `
                        <img src="${img.src}" alt="${img.name}" loading="lazy">
                        <div class="item-overlay">
                            <div class="item-name">${img.name}</div>
                            <div class="item-actions">
                                <button class="delete-btn" data-idx="${idx}" title="Delete">
                                    <i data-lucide="trash-2" size="11"></i>
                                </button>
                            </div>
                        </div>
                    `;

                    // Open lightbox on click (not on delete button)
                    item.onclick = (e) => {
                        if (e.target.closest('.delete-btn')) return;
                        openLightbox(idx);
                    };

                    item.querySelector('.delete-btn').onclick = (e) => {
                        e.stopPropagation();
                        deleteImage(idx);
                    };

                    grid.appendChild(item);
                });

                lucide.createIcons();
            }

            // ── Delete an image ─────────────────────────────────────────────
            function deleteImage(idx) {
                const img = images[idx];
                if (!confirm(`Delete "${img.name}"? This cannot be undone.`)) return;

                // Remove from virtual FS
                const dir = fs.getFile(PICTURES_PATH);
                if (dir && dir.children && dir.children[img.name]) {
                    delete dir.children[img.name];
                    fs.save();
                }

                images.splice(idx, 1);

                // If lightbox was open, close or move
                if (lightboxIndex >= 0) closeLightbox();

                renderGallery();
            }

            // ── Lightbox ────────────────────────────────────────────────────
            function openLightbox(idx) {
                lightboxIndex = idx;

                // Remove existing lightbox if any
                const existing = content.querySelector('.gallery-lightbox');
                if (existing) existing.remove();

                const lb = document.createElement('div');
                lb.className = 'gallery-lightbox';
                lb.innerHTML = `
                    <div class="lb-topbar">
                        <div class="lb-filename" id="lb-filename">${images[idx].name}</div>
                        <div class="lb-topbar-actions">
                            <button class="lb-action-btn" id="lb-zoom-btn" title="Zoom">
                                <i data-lucide="zoom-in" size="14"></i>
                            </button>
                            <button class="lb-action-btn" id="lb-download-btn" title="Save / Share">
                                <i data-lucide="download" size="14"></i>
                            </button>
                            <button class="lb-action-btn danger" id="lb-delete-btn" title="Delete">
                                <i data-lucide="trash-2" size="14"></i>
                            </button>
                            <button class="lb-action-btn close-btn" id="lb-close-btn" title="Close">
                                <i data-lucide="x" size="16"></i>
                            </button>
                        </div>
                    </div>

                    <div class="lb-main">
                        <button class="lb-nav-btn prev" id="lb-prev">
                            <i data-lucide="chevron-left" size="20"></i>
                        </button>
                        <div class="lb-img-wrap">
                            <img id="lb-img" class="lb-img" src="${images[idx].src}" alt="${images[idx].name}">
                        </div>
                        <button class="lb-nav-btn next" id="lb-next">
                            <i data-lucide="chevron-right" size="20"></i>
                        </button>
                    </div>

                    <div class="lb-footer">
                        <div class="lb-counter" id="lb-counter">${idx + 1} / ${images.length}</div>
                        <div class="lb-strip" id="lb-strip"></div>
                    </div>
                `;

                // Render thumbnail strip
                const strip = lb.querySelector('#lb-strip');
                images.forEach((img, i) => {
                    const thumb = document.createElement('img');
                    thumb.className = `lb-strip-thumb ${i === idx ? 'active' : ''}`;
                    thumb.src = img.src;
                    thumb.onclick = () => navigateLightbox(i);
                    strip.appendChild(thumb);
                });

                content.querySelector('#gallery-root').appendChild(lb);
                lucide.createIcons();

                // Zoom toggle
                let zoomed = false;
                const lbImg = lb.querySelector('#lb-img');
                const zoomBtn = lb.querySelector('#lb-zoom-btn');
                const zoomToggle = () => {
                    zoomed = !zoomed;
                    lbImg.classList.toggle('zoomed', zoomed);
                    zoomBtn.innerHTML = zoomed
                        ? '<i data-lucide="zoom-out" size="14"></i>'
                        : '<i data-lucide="zoom-in" size="14"></i>';
                    lucide.createIcons();
                };
                lbImg.onclick = zoomToggle;
                zoomBtn.onclick = zoomToggle;

                // Download / share
                lb.querySelector('#lb-download-btn').onclick = () => {
                    const a = document.createElement('a');
                    a.href = images[lightboxIndex].src;
                    a.download = images[lightboxIndex].name;
                    a.click();
                };

                // Delete from lightbox
                lb.querySelector('#lb-delete-btn').onclick = () => {
                    const i = lightboxIndex;
                    closeLightbox();
                    deleteImage(i);
                };

                // Close
                lb.querySelector('#lb-close-btn').onclick = closeLightbox;

                // Navigation
                updateNavButtons();
                lb.querySelector('#lb-prev').onclick = () => navigateLightbox(lightboxIndex - 1);
                lb.querySelector('#lb-next').onclick = () => navigateLightbox(lightboxIndex + 1);
            }

            function navigateLightbox(newIdx) {
                if (newIdx < 0 || newIdx >= images.length) return;
                lightboxIndex = newIdx;

                const lb = content.querySelector('.gallery-lightbox');
                if (!lb) return;

                const lbImg = lb.querySelector('#lb-img');
                lbImg.classList.remove('zoomed');

                // Fade transition
                lbImg.style.opacity = '0';
                setTimeout(() => {
                    lbImg.src = images[newIdx].src;
                    lbImg.alt = images[newIdx].name;
                    lbImg.style.opacity = '1';
                }, 150);

                lb.querySelector('#lb-filename').textContent = images[newIdx].name;
                lb.querySelector('#lb-counter').textContent = `${newIdx + 1} / ${images.length}`;

                // Sync thumbnail strip
                lb.querySelectorAll('.lb-strip-thumb').forEach((t, i) => {
                    t.classList.toggle('active', i === newIdx);
                    if (i === newIdx) t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                });

                updateNavButtons();
            }

            function updateNavButtons() {
                const lb = content.querySelector('.gallery-lightbox');
                if (!lb) return;
                lb.querySelector('#lb-prev').disabled = lightboxIndex === 0;
                lb.querySelector('#lb-next').disabled = lightboxIndex === images.length - 1;
            }

            function closeLightbox() {
                const lb = content.querySelector('.gallery-lightbox');
                if (lb) lb.remove();
                lightboxIndex = -1;
            }

            // ── View toggle (grid / list) ────────────────────────────────────
            content.querySelector('#gallery-grid-btn').onclick = () => {
                currentView = 'grid';
                content.querySelector('#gallery-grid-btn').classList.add('active');
                content.querySelector('#gallery-list-btn').classList.remove('active');
                renderGallery();
            };
            content.querySelector('#gallery-list-btn').onclick = () => {
                currentView = 'list';
                content.querySelector('#gallery-list-btn').classList.add('active');
                content.querySelector('#gallery-grid-btn').classList.remove('active');
                renderGallery();
            };

            // ── Import images from device ────────────────────────────────────
            content.querySelector('#gallery-file-input').onchange = (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;

                let loaded = 0;
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        fs.saveFile(`${PICTURES_PATH}/${file.name}`, ev.target.result);
                        loaded++;
                        if (loaded === files.length) loadImages();
                    };
                    reader.readAsDataURL(file);
                });

                // Reset input so same file can be re-imported
                e.target.value = '';
            };

            // ── Keyboard navigation in lightbox ─────────────────────────────
            const keyHandler = (e) => {
                if (!content.querySelector('.gallery-lightbox')) return;
                if (e.key === 'ArrowLeft') navigateLightbox(lightboxIndex - 1);
                if (e.key === 'ArrowRight') navigateLightbox(lightboxIndex + 1);
                if (e.key === 'Escape') closeLightbox();
            };
            document.addEventListener('keydown', keyHandler);

            // Cleanup keyboard listener when app is closed
            AppRegistry.gallery.onClose = () => {
                document.removeEventListener('keydown', keyHandler);
            };

            // ── Initial load ────────────────────────────────────────────────
            loadImages();
        }
    }
};

window.AppRegistry = AppRegistry;
