// --- 1. MOTORE OFFLINE E PULIZIA ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
    }

    async function pulisciFotoOrfane() {
    try {
        let keys = await idbKeyval.keys();
        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        let stringaBackup = localStorage.getItem('verbaleVIT_backup') || "";
        
        let orfane = 0;
        for (let key of keys) {
            if (key.startsWith('foto_')) {
                let trovata = stringaBackup.includes(key);
                
                // Se non è nel backup, cerchiamo nei verbali uno per uno (niente stringhe giganti!)
                if (!trovata) {
                    for (let nome in archivio) {
                        if (archivio[nome].includes(key)) { 
                            trovata = true; 
                            break; 
                        }
                    }
                }
                
                if (!trovata) { 
                    await idbKeyval.del(key); 
                    orfane++; 
                }
            }
        }
        if(orfane > 0) console.log(`Pulizia: rimosse ${orfane} foto orfane.`);
    } catch(e) { console.error("Errore pulizia:", e); }
}

    // --- UTILITÀ E STATISTICHE ---
    function nuovoVerbale() {
        if(confirm("📄 Vuoi iniziare un NUOVO verbale?\n\n⚠️ Attenzione: tutti i dati attuali non salvati in Archivio andranno persi!")) {
            localStorage.removeItem('verbaleVIT_backup');
            location.reload();
        }
    }

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        document.getElementById('btn-darkmode').innerHTML = isDark ? '☀️' : '🌙';
        localStorage.setItem('vit_darkmode', isDark);
    }

    function applicaDarkMode() {
        if(localStorage.getItem('vit_darkmode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('btn-darkmode').innerHTML = '☀️';
        }
    }

    async function mostraStatistiche() {
        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        let totali = 0, positivi = 0, negativi = 0;
        let dateVerifiche = [];

        for (let nome in archivio) {
            totali++;
            let html = archivio[nome];
            if (html.includes('id="esito_pos" value="POSITIVO" class="form-check-input mt-0" checked') || html.includes('id="esito_pos" value="POSITIVO" class="form-check-input border-success mt-0" checked')) positivi++;
            else if (html.includes('id="esito_neg" value="NEGATIVO" class="form-check-input mt-0" checked') || html.includes('id="esito_neg" value="NEGATIVO" class="form-check-input border-danger mt-0" checked')) negativi++;

            let matchData = html.match(/name="data_verifica"[^>]*value="([^"]*)"/);
            if (matchData && matchData[1]) dateVerifiche.push(new Date(matchData[1]));
        }

        if (totali === 0) { alert("📊 Nessun verbale presente in archivio."); return; }

        let ultimaDataStr = "N/D";
        if (dateVerifiche.length > 0) {
            let maxDate = new Date(Math.max.apply(null, dateVerifiche));
            ultimaDataStr = maxDate.toLocaleDateString('it-IT');
        }

        const modalHtml = `
            <div class="modal fade show no-print" id="statsModal" tabindex="-1" style="display: block; background: rgba(0,0,0,0.6);" aria-modal="true" role="dialog">
              <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content text-dark">
                  <div class="modal-header bg-dark-blue text-white py-2">
                    <h5 class="modal-title fw-bold m-0">📈 Statistiche Archivio</h5>
                  </div>
                  <div class="modal-body text-center py-4">
                    <h2 class="text-primary fw-bold mb-4">${totali} <span class="fs-6 fw-normal text-dark">Verbali in Memoria</span></h2>
                    <div class="d-flex justify-content-around mb-4">
                        <div class="p-2 border border-success rounded bg-light-green w-100 mx-1 shadow-sm">
                            <h3 class="text-success m-0 fw-bold">${positivi}</h3><small class="text-success fw-bold">POSITIVI</small>
                        </div>
                        <div class="p-2 border border-danger rounded bg-light w-100 mx-1 shadow-sm" style="background-color: #ffe6e6 !important;">
                            <h3 class="text-danger m-0 fw-bold">${negativi}</h3><small class="text-danger fw-bold">NEGATIVI</small>
                        </div>
                    </div>
                    <p class="mb-0 text-muted">Ultima ispezione registrata il: <strong class="text-dark">${ultimaDataStr}</strong></p>
                  </div>
                  <div class="modal-footer py-2 justify-content-center bg-light">
                    <button type="button" class="btn btn-secondary fw-bold shadow-sm" onclick="document.getElementById('statsModal').remove()">Chiudi</button>
                  </div>
                </div>
              </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // --- LOGICHE FORM E SELEZIONI ---
    const tabellaCEI99_3 = { "0.03": "750", "0.05": "716", "0.1": "654", "0.2": "537", "0.4": "292", "0.5": "220", "1": "117", "5": "86" };

    function popolaSelectTF() {
        const selectTF = document.getElementById('tempo_guasto');
        if(!selectTF) return;
        const valAttuale = selectTF.value || selectTF.querySelector('option[selected]')?.value;
        selectTF.innerHTML = '<option value=""></option>';
        for (let tf in tabellaCEI99_3) {
            let option = document.createElement('option');
            option.value = tf; option.textContent = tf;
            selectTF.appendChild(option);
        }
        if(valAttuale) selectTF.value = valAttuale;
    }
    
    function popolaPercDropdowns() {
        document.querySelectorAll('.perc-dropdown').forEach(select => {
            const valAttuale = select.value || select.querySelector('option[selected]')?.value;
            let optionsHtml = '<option value=""></option>';
            for(let i = 100; i >= 0; i -= 5) {
                optionsHtml += `<option value="${i}%">${i}%</option>`;
            }
            select.innerHTML = optionsHtml;
            if(valAttuale) select.value = valAttuale;
        });
    }

    function autoCompilaTensione(selectElement) {
        const tf = selectElement.value;
        const tensioneInput = document.getElementById('tens_contatto');
        if (tabellaCEI99_3[tf]) { tensioneInput.value = tabellaCEI99_3[tf]; } else { tensioneInput.value = ""; }
        calcolaUc();
    }

    function calcolaUc() {
        const iGuasto = parseFloat(document.getElementById('corr_guasto').value) || 0;
        const rTerra = parseFloat(document.getElementById('val_resistenza_terra')?.value) || 0;
        const calcField = document.getElementById('tn_val_uc');
        const tensContatto = parseFloat(document.getElementById('tens_contatto')?.value) || 0;

        if (iGuasto > 0 && rTerra > 0 && calcField) {
            let uc = iGuasto * rTerra;
            calcField.value = uc.toFixed(1);
            
            if (tensContatto > 0) {
                if (uc <= tensContatto) {
                    calcField.classList.remove('bg-danger', 'text-dark', 'bg-light');
                    calcField.classList.add('bg-success', 'text-white');
                    let radRis = document.getElementById('tn2_ris');
                    if(radRis) radRis.checked = true;
                } else {
                    calcField.classList.remove('bg-success', 'text-dark', 'bg-light');
                    calcField.classList.add('bg-danger', 'text-white');
                    let radNonRis = document.getElementById('tn2_non_ris');
                    if(radNonRis) radNonRis.checked = true;
                }
            }
        }
        salvataggioIntelligente();
    }

    function autoSelezionaArea(radioSistema) {
        const checkAreaII = document.getElementById('area_ii');
        const checkAreaIII = document.getElementById('area_iii');
        if (!checkAreaII || !checkAreaIII) return;
        if (radioSistema.value === 'TT') checkAreaII.checked = true;
        else if (radioSistema.value === 'TN-S') checkAreaIII.checked = true; 
        salvataggioIntelligente();
    }

    function calcolaProssimaVerifica() {
        const dataInizioStr = document.getElementById('data_verifica_obblig').value;
        const tipoVerificaElems = document.getElementsByName('tipo_verifica');
        const campoProssima = document.getElementById('prossima_verifica');
        
        let tipoSelezionato = null;
        for (let radio of tipoVerificaElems) {
            if (radio.checked) { tipoSelezionato = radio.value; break; }
        }

        if (dataInizioStr && tipoSelezionato) {
            let data = new Date(dataInizioStr);
            if (tipoSelezionato === 'biennale') data.setFullYear(data.getFullYear() + 2); 
            else if (tipoSelezionato === 'quinquennale') data.setFullYear(data.getFullYear() + 5); 
            
            let anno = data.getFullYear();
            let mese = ("0" + (data.getMonth() + 1)).slice(-2);
            let giorno = ("0" + data.getDate()).slice(-2);
            campoProssima.value = `${anno}-${mese}-${giorno}`;
        }
        salvataggioIntelligente();
    }

    // --- TABELLE DINAMICHE (Differenziali e NC) ---
    function addDiffRow() {
        const tbody = document.getElementById('diffTable');
        if(!tbody) return;
        const tr = document.createElement('tr');
        tr.className = "diff-row";
        tr.innerHTML = `
            <td class="border-success p-1"><input type="text" name="diff_quadro[]" class="form-control border-0 bg-transparent text-center w-100" oninput="salvataggioIntelligente()"></td>
            <td class="border-success p-1"><input type="number" step="any" inputmode="decimal" name="diff_no[]" class="form-control border-0 bg-transparent text-center w-100" oninput="salvataggioIntelligente()"></td>
            <td class="align-middle border-success"><input type="checkbox" name="diff_003[]" class="form-check-input m-0 border-success" onchange="salvataggioIntelligente()"></td>
            <td class="align-middle border-success"><input type="checkbox" name="diff_03[]" class="form-check-input m-0 border-success" onchange="salvataggioIntelligente()"></td>
            <td class="align-middle border-success"><input type="checkbox" name="diff_05[]" class="form-check-input m-0 border-success" onchange="salvataggioIntelligente()"></td>
            <td class="align-middle border-success"><input type="checkbox" name="diff_1[]" class="form-check-input m-0 border-success" onchange="salvataggioIntelligente()"></td>
            <td class="border-success p-1">
                <div class="d-flex align-items-center gap-1">
                    <input type="text" name="diff_note[]" class="form-control border-0 bg-transparent w-100" oninput="salvataggioIntelligente()">
                    <button type="button" class="btn btn-sm btn-outline-danger border-0 no-print btn-cestino px-1 py-0" onclick="this.closest('tr').remove(); salvataggioIntelligente();">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
        salvataggioIntelligente();
    }

    function addNCRow() {
        const tbody = document.getElementById('ncTable');
        if(!tbody) return;
        const rowCount = tbody.children.length + 1;
        const tr = document.createElement('tr');
        tr.className = "nc-row";
        tr.innerHTML = `
            <td class="align-middle border-primary fw-bold text-center">${rowCount}</td>
            <td class="border-primary p-1 text-start">
                <div class="d-flex align-items-start gap-1">
                    <input type="text" name="nc_descrizione[]" class="form-control border-0 bg-transparent nc-input-desc flex-grow-1 shadow-sm" list="lista-nc" placeholder="Scrivi o seleziona difetto..." oninput="autoCompilaNC(this); salvataggioIntelligente();">
                    <div class="d-flex flex-column gap-1 no-print flex-shrink-0">
                        <label class="btn btn-primary btn-nc-foto m-0 shadow-sm" title="Scatta Fotocamera">📸<input type="file" class="d-none" accept="image/*" capture="environment" onchange="gestisciFoto(this)"></label>
                        <label class="btn btn-outline-primary btn-nc-foto m-0 shadow-sm" title="Scegli dalla galleria">🖼️<input type="file" class="d-none" accept="image/*" onchange="gestisciFoto(this)"></label>
                    </div>
                </div>
                <div class="canvas-container no-print w-100 text-center">
                    <button type="button" class="btn-undo no-print" onclick="undoCanvas(this)" title="Annulla ultimo tratto" style="display:none;">↩️</button>
                    <canvas class="foto-canvas mx-auto"></canvas>
                </div>
            </td>
            <td class="border-primary p-1">
                <div class="d-flex align-items-start gap-1 h-100">
                    <textarea name="nc_note[]" class="form-control border-0 bg-transparent nc-textarea flex-grow-1 shadow-sm" placeholder="Note o prescrizioni..." oninput="salvataggioIntelligente()"></textarea>
                    <div class="d-flex flex-column gap-1 no-print flex-shrink-0">
                        <button type="button" class="btn btn-outline-secondary btn-nc-foto border-0 btn-mic" onclick="avviaDettatura(this)" title="Dettatura vocale">🎙️</button>
                        <button type="button" class="btn btn-outline-danger btn-nc-foto border-0 btn-cestino" onclick="this.closest('tr').remove(); salvataggioIntelligente();">🗑️</button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
        salvataggioIntelligente();
    }

    // --- LIBRERIA NC ---
    let libreriaNC_Dinamica = [];
    function inizializzaLibreria() {
        let salvata = localStorage.getItem('libreriaNC_custom');
        if (salvata) { libreriaNC_Dinamica = JSON.parse(salvata); } 
        else {
            libreriaNC_Dinamica = [
                { desc: "Non è stata esibita la documentazione tecnica dell’impianto", pres: "Mettere a disposizione DiCo, schemi e verbali." },
                { desc: "Documentazione tecnica incompleta o non aggiornata", pres: "Aggiornare la documentazione tecnica." },
                { desc: "Quadro elettrico con pannelli rotti", pres: "Sostituire i pannelli danneggiati con elementi originali." },
                { desc: "Moduli liberi privi di coprifori", pres: "Installare idonei elementi di chiusura modulari." },
                { desc: "Quadro elettrico accesso a parti attive", pres: "Provvedere all’immediata messa in sicurezza." },
                { desc: "Quadri non accessibili", pres: "Rendere accessibili i quadri." },
                { desc: "Scarsa pulizia / polvere nel quadro", pres: "Eseguire accurata pulizia e verifica." },
                { desc: "Differenziali non funzionanti", pres: "Sostituire immediatamente i dispositivi non conformi." },
                { desc: "Dispersori non accessibili / privi di pozzetti", pres: "Realizzare idonei punti di ispezione." },
                { desc: "Nodo equipotenziale non ispezionabile", pres: "Rendere accessibile il nodo equipotenziale." },
                { desc: "Valore di resistenza di terra non compatibile", pres: "Adeguare l’impianto di terra e ripetere le misure." }
            ];
        }
        popolaDatalistNC();
    }

    function popolaDatalistNC() {
        const datalist = document.getElementById('lista-nc');
        if(!datalist) return;
        datalist.innerHTML = '';
        libreriaNC_Dinamica.forEach(item => {
            const option = document.createElement('option');
            option.value = item.desc; datalist.appendChild(option);
        });
    }

    function autoCompilaNC(input) {
        const match = libreriaNC_Dinamica.find(item => item.desc === input.value);
        if (match) {
            const textarea = input.closest('tr').querySelector('textarea[name="nc_note[]"]');
            if(textarea && !textarea.value.trim()) { textarea.value = match.pres; }
        }
    }

    function gestisciImportazioneNC(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const rows = e.target.result.split(/\r?\n/);
            let nuova = [];
            const sep = e.target.result.indexOf(';') > -1 ? ';' : ',';
            for(let i=1; i<rows.length; i++) {
                if(rows[i].trim() === '') continue;
                const re = new RegExp(`${sep}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
                const cols = rows[i].split(re).map(c => c.replace(/^"|"$/g, '').trim());
                if(cols.length > 5) nuova.push({ desc: cols[3], pres: cols[5] });
                else if(cols.length >= 2) nuova.push({ desc: cols[0], pres: cols[1] });
            }
            if(nuova.length > 0) {
                localStorage.setItem('libreriaNC_custom', JSON.stringify(nuova));
                libreriaNC_Dinamica = nuova; popolaDatalistNC();
                alert(`✅ Libreria aggiornata! (${nuova.length} voci)`);
            } else { alert('❌ CSV non valido o vuoto.'); }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
    }

    // --- SENSORI (GPS e MIC) ---
    function trovaPosizione() {
        if (!navigator.geolocation) { alert("⚠️ Geolocation non supportata dal browser."); return; }
        const btnGps = document.querySelector('.btn-gps');
        if(!btnGps) return;
        const org = btnGps.innerHTML; btnGps.innerHTML = '⏳';
        navigator.geolocation.getCurrentPosition(position => {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
            .then(res => res.json()).then(data => {
                if(data && data.address) {
                    const c = data.address.city || data.address.town || data.address.village || "";
                    const v = data.address.road || ""; const n = data.address.house_number || "";
                    if(c) document.getElementById('citta_imp').value = c;
                    if(v) document.getElementById('indirizzo_imp').value = `${v} ${n}`.trim();
                    salvataggioIntelligente();
                }
                btnGps.innerHTML = org;
            }).catch(()=> btnGps.innerHTML = org);
        }, () => btnGps.innerHTML = org);
    }

    function avviaDettatura(btn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("⚠️ Dettatura vocale non supportata sul tuo browser."); return; }
        const rec = new SpeechRecognition(); rec.lang = 'it-IT';
        const tx = btn.closest('div.d-flex').querySelector('textarea');
        const org = btn.innerHTML;
        rec.onstart = () => btn.innerHTML = '🔴';
        rec.onresult = (e) => { tx.value += (tx.value?" ":"") + e.results[0][0].transcript; salvataggioIntelligente(); };
        rec.onend = () => btn.innerHTML = org; rec.onerror = () => btn.innerHTML = org;
        rec.start();
    }

    // --- FOTO E DISEGNO ---
    function canvasToBlobAsync(canvas) {
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
    }

    async function gestisciFoto(input) {
        const file = input.files[0];
        if (!file) return;
        let geoloc = "";
        
        const scatta = () => {
             const reader = new FileReader();
             reader.onload = function(e) {
                 const img = new Image();
                 img.onload = async function() {
                     const canvas = input.closest('td').querySelector('.foto-canvas'); 
                     const MAX = 800; 
                     let w = img.width; let h = img.height;
                     if (w > MAX) { h *= MAX / w; w = MAX; }
                     canvas.width = w; canvas.height = h;
                     const ctx = canvas.getContext('2d');
                     ctx.drawImage(img, 0, 0, w, h);
                     
                     ctx.font = "bold 16px Arial"; ctx.fillStyle = "yellow"; ctx.shadowColor = "black"; ctx.shadowBlur = 4;
                     ctx.fillText(new Date().toLocaleString('it-IT'), 10, h - 15);
                     if(geoloc) { ctx.font = "12px Arial"; ctx.fillText(geoloc, 10, h - 35); }
                     
                     canvas.style.display = 'block';
                     let fotoId = canvas.getAttribute('data-foto-id') || ('foto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
                     canvas.setAttribute('data-foto-id', fotoId);
                     canvas.undoHistory = [canvas.toDataURL()];
                     const undoBtn = canvas.parentElement.querySelector('.btn-undo');
                     if(undoBtn) undoBtn.style.display = 'none';

                     const blob = await canvasToBlobAsync(canvas);
                     await idbKeyval.set(fotoId, blob);
                     
                     abilitareDisegno(canvas);
                     salvataggioIntelligente(); 
                 }
                 img.src = e.target.result;
             }
             reader.readAsDataURL(file);
        };

        if (navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                 (pos) => { geoloc = `Lat: ${pos.coords.latitude.toFixed(5)} Lon: ${pos.coords.longitude.toFixed(5)}`; scatta(); },
                 () => scatta(), { timeout: 3000 }
             );
        } else { scatta(); }
    }

    function abilitareDisegno(canvas) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        if(!canvas.undoHistory) { canvas.undoHistory = [canvas.toDataURL()]; }
        const undoBtn = canvas.parentElement.querySelector('.btn-undo');
        if(undoBtn && canvas.undoHistory.length > 1) undoBtn.style.display = 'block';

        function getPos(evt) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
            let cx = evt.clientX; let cy = evt.clientY;
            if(evt.touches && evt.touches.length > 0) { cx = evt.touches[0].clientX; cy = evt.touches[0].clientY; }
            return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
        }

        function startDraw(e) { isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
        function draw(e) { if (!isDrawing) return; const p = getPos(e); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = 'red'; ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); }
        async function endDraw() {
            if(isDrawing) {
                isDrawing = false;
                canvas.undoHistory.push(canvas.toDataURL());
                if(canvas.undoHistory.length > 10) canvas.undoHistory.shift();
                if(undoBtn) undoBtn.style.display = 'block';
                let id = canvas.getAttribute('data-foto-id');
                if (id) { const blob = await canvasToBlobAsync(canvas); await idbKeyval.set(id, blob); salvataggioIntelligente(); }
            }
        }
        canvas.onmousedown = startDraw; canvas.onmousemove = draw; canvas.onmouseup = endDraw; canvas.onmouseout = endDraw;
        canvas.ontouchstart = startDraw; canvas.ontouchmove = draw; canvas.ontouchend = endDraw;
    }

    async function undoCanvas(btn) {
        const canvas = btn.parentElement.querySelector('canvas');
        if(canvas && canvas.undoHistory && canvas.undoHistory.length > 1) {
            canvas.undoHistory.pop(); 
            const prev = canvas.undoHistory[canvas.undoHistory.length - 1]; 
            const img = new Image();
            img.onload = async function() {
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                canvas.getContext('2d').drawImage(img, 0, 0); 
                if(canvas.undoHistory.length <= 1) btn.style.display = 'none';
                let id = canvas.getAttribute('data-foto-id');
                if (id) { const blob = await canvasToBlobAsync(canvas); await idbKeyval.set(id, blob); salvataggioIntelligente(); }
            };
            img.src = prev;
        }
    }

    async function ripristinaCanvas() {
        const canvases = document.querySelectorAll('canvas.foto-canvas');
        for (let c of canvases) {
            const id = c.getAttribute('data-foto-id');
            if(id) {
                try {
                    const data = await idbKeyval.get(id);
                    if(data) {
                        let dataURL = data;
                        if (data instanceof Blob) {
                            dataURL = await new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(data); });
                        }
                        let img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.onload = () => {
                            c.width = img.width; c.height = img.height;
                            c.getContext('2d').drawImage(img, 0, 0);
                            c.style.display = 'block';
                            abilitareDisegno(c);
                        };
                        img.src = dataURL;
                    }
                } catch(e) { console.error("Errore recupero foto:", e); }
            }
        }
    }

    // --- SALVATAGGIO IN MEMORIA E GESTIONE GLOBALE ---
    function fissaValoriHTML() {
        document.getElementById('area-dati').querySelectorAll('input, select, textarea').forEach(el => {
            if(el.type === 'checkbox' || el.type === 'radio') {
                el.checked ? el.setAttribute('checked', 'checked') : el.removeAttribute('checked');
            } else {
                el.setAttribute('value', el.value);
                if(el.tagName === 'TEXTAREA') {
                    // Previene l'iniezione di codice HTML spaccato nel backup
                    el.innerHTML = el.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                }
                if(el.tagName === 'SELECT') {
                    Array.from(el.options).forEach(opt => opt.value === el.value ? opt.setAttribute('selected', 'selected') : opt.removeAttribute('selected'));
                }
            }
        });
    }

    function aggiornaEsitoGlobale() {
        let isNegativo = false;
        if (document.querySelector('input[name="tn_soddisf_2"][value="Non Risulta"]')?.checked) isNegativo = true;
        if (document.querySelector('input[name="tt_soddisf"][value="Non Risulta"]')?.checked) isNegativo = true;
        document.querySelectorAll('input[name="nc_descrizione[]"]').forEach(el => { if (el.value.trim() !== "") isNegativo = true; });

        const radPositivo = document.getElementById('esito_pos');
        const radNegativo = document.getElementById('esito_neg');

        if (isNegativo) {
            if(radNegativo && !radNegativo.checked) radNegativo.checked = true;
        } else {
            const denom = document.getElementById('denominazione_imp')?.value;
            if(denom && radPositivo && !radPositivo.checked && !radNegativo.checked) radPositivo.checked = true;
        }
    }

    // --- AGGIORNAMENTO 1 ---
    function salvataggioIntelligente() {
        clearTimeout(window.saveTimer);
        window.saveTimer = setTimeout(() => {
            aggiornaEsitoGlobale();
            // Non usiamo più fissaValoriHTML(), usiamo il JSON!
            localStorage.setItem('verbaleVIT_backup', getModuloJSON());
            
            const badge1 = document.getElementById('salvataggio-badge');
            const badge2 = document.getElementById('salvataggio-badge-2');
            if(badge1) { badge1.style.opacity = '1'; setTimeout(() => badge1.style.opacity = '0', 1000); }
            if(badge2) { badge2.style.opacity = '1'; setTimeout(() => badge2.style.opacity = '0', 1000); }
        }, 800);
    }

    function riattivaEventi() {
        const area = document.getElementById('area-dati');
        if(area) {
            area.addEventListener('input', salvataggioIntelligente);
            area.addEventListener('change', salvataggioIntelligente);
        }
    }

    // --- GESTIONE ARCHIVIO INTERNO ---
    async function migraArchivio() {
        let vecchio = localStorage.getItem('verbaleVIT_archivio');
        if (vecchio) {
            await idbKeyval.set('vit_archivio_dati', JSON.parse(vecchio));
            localStorage.removeItem('verbaleVIT_archivio');
        }
    }

    // --- AGGIORNAMENTO 2 ---
    async function salvaInArchivio() {
        let denom = document.getElementById('denominazione_imp')?.value || "SenzaNome";
        let dataV = document.getElementById('data_verifica_obblig')?.value || new Date().toLocaleDateString('it-IT');
        let nome = prompt("Nome verbale da salvare:", `${denom} - ${dataV}`);
        if (!nome) return;
        
        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        archivio[nome] = getModuloJSON(); // SALVIAMO IN JSON!
        await idbKeyval.set('vit_archivio_dati', archivio);
        
        aggiornaSelectArchivio();
        alert(`✅ Verbale "${nome}" salvato nel dispositivo!`);
    }

    // --- AGGIORNAMENTO 4 ---
    async function duplicaVerbale() {
        let denom = document.getElementById('denominazione_imp')?.value || "Copia";
        let nome = prompt("Crea un duplicato come:", `${denom} - Copia`);
        if (!nome) return;
        
        let jsonData = JSON.parse(getModuloJSON());
        
        // Duplica le foto in IndexedDB per non collegare le foto originali al duplicato
        for (let nc of jsonData.non_conformita) {
            if (nc.foto_id) {
                let newId = 'foto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                let base64 = await idbKeyval.get(nc.foto_id);
                if (base64) await idbKeyval.set(newId, base64);
                nc.foto_id = newId; // Assegna la nuova foto clonata al JSON duplicato
            }
        }
        
        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        archivio[nome] = JSON.stringify(jsonData);
        await idbKeyval.set('vit_archivio_dati', archivio);
        aggiornaSelectArchivio();
        alert(`✅ Duplicato salvato in archivio con successo!`);
    }

    async function apriModaleArchivio() {
        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        let lista = Object.keys(archivio).sort((a,b)=>b.localeCompare(a)).map(n => `
            <div class="archivio-item d-flex justify-content-between align-items-center border-bottom py-2 px-1" data-nome="${n.replace(/"/g, '&quot;')}">
                <span class="fw-bold text-truncate me-2" style="max-width: 65%; font-size: 0.85rem;">${n}</span>
                <div class="d-flex gap-1 flex-shrink-0">
                    <button class="btn btn-sm btn-success py-0 px-2 fw-bold" onclick="caricaDaArchivio('${n.replace(/'/g, "\\'")}')" title="Carica">📂</button>
                    <button class="btn btn-sm btn-danger py-0 px-2 fw-bold" onclick="eliminaDaArchivio('${n.replace(/'/g, "\\'")}', this)" title="Elimina">🗑️</button>
                </div>
            </div>`).join('');
        if(!lista) lista = `<p class="text-muted text-center mt-3">L'archivio locale è vuoto.</p>`;
        
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade show no-print" id="archivioModal" style="display:block; background:rgba(0,0,0,0.6);" aria-modal="true">
              <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content text-dark">
                  <div class="modal-header bg-dark-blue text-white py-2">
                    <h5 class="modal-title fw-bold m-0">🗂️ Gestione Archivio</h5>
                    <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('archivioModal').remove()"></button>
                  </div>
                  <div class="modal-body p-2 p-md-3">
                    <input type="text" id="ricercaArchivio" class="form-control mb-3 border-primary" placeholder="🔍 Cerca per nome o data..." onkeyup="filtraArchivio()">
                    <div id="listaVerbali" class="overflow-auto border rounded p-1 bg-white" style="max-height: 50vh;">${lista}</div>
                  </div>
                </div>
              </div>
            </div>`);
    }

    function filtraArchivio() {
        let f = document.getElementById('ricercaArchivio').value.toLowerCase();
        document.querySelectorAll('.archivio-item').forEach(i => i.style.display = i.getAttribute('data-nome').toLowerCase().includes(f) ? "flex" : "none");
    }

    // --- AGGIORNAMENTO 3 ---
    async function caricaDaArchivio(nome) {
        if(!confirm(`Vuoi caricare "${nome}"?\nI dati attuali andranno persi se non salvati.`)) return;
        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        if (archivio[nome]) {
            await setModuloJSON(archivio[nome]); // CARICHIAMO DA JSON!
            document.getElementById('archivioModal')?.remove();
        }
    }

    async function eliminaDaArchivio(nome, btn) {
        if (!nome) {
            if(!confirm("⚠️ Sicuro di voler eliminare il verbale CORRENTE dall'archivio?")) return;
            let d = document.getElementById('denominazione_imp')?.value; let v = document.getElementById('data_verifica_obblig')?.value;
            if(d && v) nome = `${d} - ${v}`; else { alert("Devi prima aver salvato il verbale."); return; }
        } else { if(!confirm(`🗑️ Eliminare permanentemente "${nome}"?`)) return; }

        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        if(archivio[nome]) {
            const doc = new DOMParser().parseFromString(archivio[nome], 'text/html');
            const fotoIds = Array.from(doc.querySelectorAll('canvas')).map(c => c.getAttribute('data-foto-id')).filter(id => id);
            for (const id of fotoIds) await idbKeyval.del(id);
            delete archivio[nome]; await idbKeyval.set('vit_archivio_dati', archivio);
            if (btn) btn.closest('.archivio-item').remove(); else alert("Eliminato dall'archivio.");
        }
    }

    // --- ESPORTAZIONE E IMPORTAZIONE INTERO DATABASE (BACKUP) ---
    async function esportaDB() {
        let archivio = await idbKeyval.get('vit_archivio_dati') || {};
        if (Object.keys(archivio).length === 0) { alert("L'archivio è vuoto. Niente da esportare."); return; }
        let backupData = { archivio: archivio, immagini: {} };
        
        for (let nome in archivio) {
            let tempDiv = document.createElement('div'); tempDiv.innerHTML = archivio[nome];
            for(let canvas of tempDiv.querySelectorAll('canvas.foto-canvas')) {
                let id = canvas.getAttribute('data-foto-id');
                if(id && !backupData.immagini[id]) {
                    let dImg = await idbKeyval.get(id);
                    if(dImg) {
                        if (dImg instanceof Blob) backupData.immagini[id] = await new Promise(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result); rd.readAsDataURL(dImg); });
                        else backupData.immagini[id] = dImg;
                    }
                }
            }
        }
        let blob = new Blob([JSON.stringify(backupData)], {type: "application/json"});
        let link = document.createElement("a"); link.href = URL.createObjectURL(blob);
        link.download = "Backup_VIT_" + new Date().toISOString().split('T')[0] + ".json";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    function importaDB() { document.getElementById('importaFile').click(); }
    
    function eseguiImportazione(event) {
        let file = event.target.files[0]; if (!file) return;
        let reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let data = JSON.parse(e.target.result);
                let archImport = (data.archivio && data.immagini) ? data.archivio : data;
                if (data.immagini) for (let id in data.immagini) await idbKeyval.set(id, data.immagini[id]);
                let archAttuale = await idbKeyval.get('vit_archivio_dati') || {};
                Object.assign(archAttuale, archImport);
                await idbKeyval.set('vit_archivio_dati', archAttuale);
                alert("✅ Database ripristinato con successo!");
            } catch(err) { alert("❌ Errore durante il ripristino del file."); }
        };
        reader.readAsText(file); event.target.value = ''; 
    }

    // --- CREAZIONE PDF O STAMPA NATIVA ---
    function getNomeFileEsportazione() {
        let denom = document.getElementById('denominazione_imp')?.value || "";
        let dataV = document.getElementById('data_verifica_obblig')?.value || "";
        return denom ? `${denom} - ${dataV}` : "Esportazione_VIT";
    }

    function avviaProcessoStampa() {
        const d = document.getElementById('data_verifica_obblig'); 
        const r = document.getElementById('ragione_sociale_obblig'); 
        const n = document.getElementById('denominazione_imp');
        const re = document.getElementById('val_resistenza_terra'); // NUOVO: Campo RE
        
        let err = false;
        
        // 1. Controllo dei campi di testo/numero
        [d, r, n, re].forEach(el => { 
            if(!el?.value){ 
                el?.classList.add('campo-errore'); 
                err = true; 
            } else {
                el?.classList.remove('campo-errore');
            } 
        });

        // 2. Controllo dei Radio Button "Sistema" (Dati impianto)
        const sistemaChecked = document.querySelector('input[name="sistema"]:checked');
        const sistemaRadios = document.querySelectorAll('input[name="sistema"]');
        
        if (!sistemaChecked) {
            // Se nessuno è selezionato, li coloro di rosso
            sistemaRadios.forEach(radio => radio.classList.add('campo-errore'));
            err = true;
        } else {
            // Rimuovo il rosso se tutto è ok
            sistemaRadios.forEach(radio => radio.classList.remove('campo-errore'));
        }

        // 3. Blocco se ci sono errori
        if (err) { 
            alert("⚠️ Mancano campi obbligatori!\n\nVerifica di aver compilato:\n- Data\n- Ragione Sociale\n- Denominazione Impianto\n- Dati Impianto (TT, TN-S, o IT)\n- Misura resistenza Terra (RE)"); 
            return; 
        }
        
        // Se tutto è corretto, proseguo con il modale di stampa
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade show no-print" id="stampaModal" style="display:block; background:rgba(0,0,0,0.6);">
              <div class="modal-dialog modal-dialog-centered"><div class="modal-content text-dark"><div class="modal-body text-center py-4">
                    <p class="mb-4">Scegli la modalità di esportazione del verbale:</p>
                    <div class="d-grid gap-3">
                        <button class="btn btn-danger fw-bold shadow-sm py-2" onclick="document.getElementById('stampaModal').remove(); eseguiStampaPDF();">📄 Salva come PDF (Libreria interna)</button>
                        <button class="btn btn-secondary fw-bold shadow-sm py-2" onclick="document.getElementById('stampaModal').remove(); eseguiStampaBase();">🖨️ Stampa Nativa (Browser / iOS / Android)</button>
                    </div>
              </div></div></div></div>`);
    }

    async function eseguiStampaPDF() {
        if (typeof window.html2pdf === 'undefined') { alert("Errore caricamento libreria PDF."); eseguiStampaBase(); return; }
        const btn = document.querySelector('button[onclick="avviaProcessoStampa()"]');
        const org = btn ? btn.innerHTML : ''; if(btn) btn.innerHTML = "⏳ Creazione in corso...";
        
        try {
            fissaValoriHTML(); await ripristinaCanvas();
            document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
            document.body.classList.add('fase-stampa');
            
            const areaDati = document.getElementById('area-dati'); // Selezioniamo l'area da fotografare

            const opt = { 
                margin: [10,5,15,5], 
                filename: getNomeFileEsportazione().replace(/[\/\\]/g, '-') + '.pdf', 
                image: { type: 'jpeg', quality: 0.98 }, 
                html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, // <-- scale 2 e scrollY 0
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
            };
            // Forza il motore a leggere tutto il documento
            await window.html2pdf().set(opt).from(document.getElementById('area-dati')).save();
            
        } catch(e) { 
            console.error("Errore html2pdf: ", e);
            eseguiStampaBase(); 
        } 
        finally {
            document.querySelectorAll('.no-print').forEach(el => el.style.display = '');
            document.body.classList.remove('fase-stampa'); if(btn) btn.innerHTML = org;
        }
    }

    function eseguiStampaBase() {
        const titoloOriginale = document.title; 
        document.title = getNomeFileEsportazione().replace(/[\/\\]/g, '-');
        
        // Il browser blocca l'esecuzione finché l'utente non chiude il prompt di stampa
        window.print();
        
        // Appena l'utente chiude la stampa, ripristina il titolo originale
        document.title = titoloOriginale; 
    }

    // --- INIT APP E LOGICA DI AVVIO ---
    // --- AGGIORNAMENTO 5 --- (Modifica la parte finale di window.onload)
    window.onload = async function() {
        applicaDarkMode();
        popolaSelectTF();
        popolaPercDropdowns();
        inizializzaLibreria();

        const backup = localStorage.getItem('verbaleVIT_backup');
        
        // SE c'è un backup, lo passiamo al motore JSON, ALTRIMENTI creiamo le righe vuote
        if (backup && backup.trim().length > 20) {
            await setModuloJSON(backup);
        } else {
            for(let i=0; i<3; i++) addDiffRow();
            for(let i=0; i<2; i++) addNCRow();
        }

        riattivaEventi();

        setTimeout(async () => {
            try { await migraArchivio(); await pulisciFotoOrfane(); } 
            catch (e) { console.error("Background task failed", e); }
        }, 1500);
    };

// --- ESPORTAZIONE CSV, XFDF, ZIP E CONDIVISIONE ---

    // Funzione helper per estrarre tutti i dati compilati nel form
    function estraiDatiForm() {
    let dati = {};
    document.getElementById('area-dati').querySelectorAll('input, select, textarea').forEach(el => {
        let nome = el.name || el.id;
        if (!nome) return;
        
        if (el.type === 'checkbox' || el.type === 'radio') {
            if (nome.endsWith('[]')) {
                if (!dati[nome]) dati[nome] = [];
                // Se è una checkbox, inseriamo "Si" se spuntata, "No" se vuota (mantiene allineato Excel)
                if (el.type === 'checkbox') {
                    dati[nome].push(el.checked ? (el.value !== 'on' ? el.value : 'Si') : 'No');
                } else {
                    if (el.checked) dati[nome].push(el.value);
                }
            } else {
                if (el.checked) dati[nome] = el.value !== 'on' ? el.value : 'Si';
            }
        } else {
            if (nome.endsWith('[]')) {
                if (!dati[nome]) dati[nome] = [];
                dati[nome].push(el.value);
            } else {
                dati[nome] = el.value;
            }
        }
    });
    return dati;
}

    // 1. Esporta in CSV (Excel)
    function esportaCSV() {
        let dati = estraiDatiForm();
        let csvContent = "Campo;Valore\n";
        for (let key in dati) {
            let val = Array.isArray(dati[key]) ? dati[key].join(' | ') : dati[key];
            if(val !== undefined && val !== null) {
                csvContent += `"${key}";"${String(val).replace(/"/g, '""')}"\n`;
            }
        }
        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = getNomeFileEsportazione().replace(/[\/\\]/g, '-') + ".csv";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    // 2. Condividi File (Solo su dispositivi che lo supportano, es. Mobile)
    function condividiCSV() {
        let dati = estraiDatiForm();
        let csvContent = "Campo;Valore\n";
        for (let key in dati) {
            let val = Array.isArray(dati[key]) ? dati[key].join(' | ') : dati[key];
            if(val !== undefined && val !== null) csvContent += `"${key}";"${String(val).replace(/"/g, '""')}"\n`;
        }
        let nomeFile = getNomeFileEsportazione().replace(/[\/\\]/g, '-') + ".csv";
        let file = new File([csvContent], nomeFile, {type: "text/csv"});
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                title: 'Dati Verbale VIT',
                text: 'Dati esportati dal modulo Verifica 462/01',
                files: [file]
            }).catch(err => console.error("Errore condivisione:", err));
        } else {
            alert("⚠️ Condivisione nativa non supportata su questo browser. Verrà avviato il download normale.");
            esportaCSV();
        }
    }

    // 3. Esporta in XFDF (Per importazione in moduli PDF di terze parti)
    function esportaXFDF() {
        let dati = estraiDatiForm();
        let xfdf = `<?xml version="1.0" encoding="UTF-8"?>\n<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">\n<fields>\n`;
        for (let key in dati) {
            let val = Array.isArray(dati[key]) ? dati[key].join(', ') : dati[key];
            if (val !== undefined && val !== null && val !== "") {
                let safeKey = key.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                let safeVal = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                xfdf += `  <field name="${safeKey}"><value>${safeVal}</value></field>\n`;
            }
        }
        xfdf += `</fields>\n</xfdf>`;
        let blob = new Blob([xfdf], { type: 'application/vnd.adobe.xfdf' });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = getNomeFileEsportazione().replace(/[\/\\]/g, '-') + ".xfdf";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    // 4. Scarica Foto in archivio ZIP
    async function scaricaFotoZip(btn) {
        if (typeof JSZip === 'undefined') {
            alert("⚠️ La libreria JSZip non è caricata. Controlla la connessione o i file locali.");
            return;
        }
        
        let orgText = btn.innerHTML;
        btn.innerHTML = "⏳";
        
        try {
            let zip = new JSZip();
            let imgFolder = zip.folder("Foto_Rilievi");
            let canvases = document.querySelectorAll('canvas.foto-canvas');
            let counter = 1;
            let fotoTrovate = false;

            for (let c of canvases) {
                let id = c.getAttribute('data-foto-id');
                if (id) {
                    let data = await idbKeyval.get(id);
                    if (data) {
                        fotoTrovate = true;
                        if (data instanceof Blob) {
                            imgFolder.file(`Foto_Rilievo_${counter}.jpg`, data);
                        } else {
                            let base64Data = data.split(',')[1];
                            imgFolder.file(`Foto_Rilievo_${counter}.jpg`, base64Data, {base64: true});
                        }
                        counter++;
                    }
                }
            }

            if (!fotoTrovate) {
                alert("Nessuna foto presente in questo verbale.");
                btn.innerHTML = orgText;
                return;
            }

            let content = await zip.generateAsync({type: "blob"});
            let link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = "Foto_" + getNomeFileEsportazione().replace(/[\/\\]/g, '-') + ".zip";
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            
        } catch (e) {
            console.error("Errore generazione ZIP:", e);
            alert("❌ Errore durante la creazione del file ZIP.");
        } finally {
            btn.innerHTML = orgText;
        }
    }
// --- 1. MOTORE JSON (ESTRAZIONE) ---
    function getModuloJSON() {
        let json = {
            campi_semplici: {},
            differenziali: [],
            non_conformita: []
        };
        
        // 1. Campi Semplici (tutto ciò che non è nelle tabelle dinamiche)
        document.querySelectorAll('#verificaForm input:not([name*="[]"]), #verificaForm select:not([name*="[]"]), #verificaForm textarea:not([name*="[]"]), #data_verifica_obblig, #verbale_n1, #prossima_verifica').forEach(el => {
            let key = el.name || el.id;
            if (!key) return;
            
            if (el.type === 'checkbox') {
                json.campi_semplici[key] = el.checked; // Salva Vero/Falso
            } else if (el.type === 'radio') {
                if (el.checked) json.campi_semplici[key] = el.value; // Salva solo se selezionato
            } else {
                json.campi_semplici[key] = el.value;
            }
        });

        // 2. Tabella Differenziali
        document.querySelectorAll('.diff-row').forEach(row => {
            json.differenziali.push({
                quadro: row.querySelector('[name="diff_quadro[]"]').value,
                no: row.querySelector('[name="diff_no[]"]').value,
                chk_003: row.querySelector('[name="diff_003[]"]').checked,
                chk_03: row.querySelector('[name="diff_03[]"]').checked,
                chk_05: row.querySelector('[name="diff_05[]"]').checked,
                chk_1: row.querySelector('[name="diff_1[]"]').checked,
                note: row.querySelector('[name="diff_note[]"]').value
            });
        });

        // 3. Tabella NC e Foto
        document.querySelectorAll('.nc-row').forEach(row => {
            let canvas = row.querySelector('canvas.foto-canvas');
            json.non_conformita.push({
                descrizione: row.querySelector('[name="nc_descrizione[]"]').value,
                note: row.querySelector('[name="nc_note[]"]').value,
                foto_id: canvas ? canvas.getAttribute('data-foto-id') : null
            });
        });

        return JSON.stringify(json);
    }

    // --- 2. MOTORE JSON (INIEZIONE) ---
    async function setModuloJSON(jsonString) {
        if (!jsonString) return;
        
        // COMPATIBILITÀ VECCHI VERBALI (LEGACY HTML)
        // Controllo infallibile: se non inizia con una parentesi graffa, è sicuramente vecchio HTML
        if (!jsonString.trim().startsWith('{')) {
            document.getElementById('area-dati').innerHTML = jsonString;
            riattivaEventi(); 
            await ripristinaCanvas();
            return;
        }

        try {
            let data = JSON.parse(jsonString);

            // Svuota tutto il form prima di caricare i nuovi dati
            const form = document.getElementById('verificaForm');
            if (form) form.reset();
            
            const dataVal = document.getElementById('data_verifica_obblig');
            if (dataVal) dataVal.value = "";
            const nVal = document.getElementById('verbale_n1');
            if (nVal) nVal.value = "";

            // 1. Ripristina Campi Semplici
            if (data.campi_semplici) {
                for (let key in data.campi_semplici) {
                    let els = document.querySelectorAll(`[name="${key}"], #${key}`);
                    els.forEach(el => {
                        if (el.type === 'checkbox') {
                            el.checked = data.campi_semplici[key];
                        } else if (el.type === 'radio') {
                            if (el.value === data.campi_semplici[key]) el.checked = true;
                        } else {
                            el.value = data.campi_semplici[key] || "";
                        }
                    });
                }
            }

            // 2. Ripristina Differenziali
            if (data.differenziali) {
                const diffTable = document.getElementById('diffTable');
                if (diffTable) diffTable.innerHTML = ''; 
                data.differenziali.forEach(diff => {
                    addDiffRow(); 
                    let lastRow = diffTable.lastElementChild;
                    if (lastRow) {
                        let q = lastRow.querySelector('[name="diff_quadro[]"]'); if (q) q.value = diff.quadro || "";
                        let n = lastRow.querySelector('[name="diff_no[]"]'); if (n) n.value = diff.no || "";
                        let c003 = lastRow.querySelector('[name="diff_003[]"]'); if (c003) c003.checked = diff.chk_003 || false;
                        let c03 = lastRow.querySelector('[name="diff_03[]"]'); if (c03) c03.checked = diff.chk_03 || false;
                        let c05 = lastRow.querySelector('[name="diff_05[]"]'); if (c05) c05.checked = diff.chk_05 || false;
                        let c1 = lastRow.querySelector('[name="diff_1[]"]'); if (c1) c1.checked = diff.chk_1 || false;
                        let nt = lastRow.querySelector('[name="diff_note[]"]'); if (nt) nt.value = diff.note || "";
                    }
                });
            }

            // 3. Ripristina NC e Foto
            if (data.non_conformita) {
                const ncTable = document.getElementById('ncTable');
                if (ncTable) ncTable.innerHTML = ''; 
                data.non_conformita.forEach(nc => {
                    addNCRow();
                    let lastRow = ncTable.lastElementChild;
                    if (lastRow) {
                        let d = lastRow.querySelector('[name="nc_descrizione[]"]'); if (d) d.value = nc.descrizione || "";
                        let nt = lastRow.querySelector('[name="nc_note[]"]'); if (nt) nt.value = nc.note || "";
                        if (nc.foto_id) {
                            let canvas = lastRow.querySelector('canvas.foto-canvas');
                            if (canvas) canvas.setAttribute('data-foto-id', nc.foto_id);
                        }
                    }
                });
            }

            // Ricalcola variabili automatiche
            calcolaUc();
            aggiornaEsitoGlobale();
            await ripristinaCanvas();

        } catch (e) {
            console.error("Errore parser JSON:", e);
            alert("Errore nel caricamento del file. I dati potrebbero essere corrotti.");
        }
    }
