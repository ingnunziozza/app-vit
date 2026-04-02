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

// --- TABELLA RILIEVI ---
function ridimensionaTextarea(el) {
    el.style.height = 'auto'; // Resetta l'altezza
    el.style.height = (el.scrollHeight + 2) + 'px'; // La imposta all'altezza esatta del testo
}

// --- LOGICHE FORM E SELEZIONI ---
const tabellaCEI99_3 = {
        "0,01": "790", "0,02": "770", "0,03": "750", "0,04": "732", "0,05": "716", "0,06": "703", "0,07": "690", "0,08": "677", "0,09": "666",
        "0,1": "654", "0,11": "643", "0,12": "632", "0,13": "621", "0,14": "610", "0,15": "599", "0,16": "587", "0,17": "574", "0,18": "562", "0,19": "549",
        "0,2": "537", "0,21": "522", "0,22": "508", "0,23": "493", "0,24": "479", "0,25": "464", "0,26": "451", "0,27": "437", "0,28": "424", "0,29": "410",
        "0,3": "397", "0,31": "386", "0,32": "374", "0,33": "363", "0,34": "351", "0,35": "340", "0,36": "330", "0,37": "321", "0,38": "311", "0,39": "302",
        "0,4": "292", "0,41": "284", "0,42": "276", "0,43": "268", "0,44": "260", "0,45": "252", "0,46": "246", "0,47": "239", "0,48": "233", "0,49": "226",
        "0,5": "220", "0,51": "215", "0,52": "211", "0,53": "206", "0,54": "202", "0,55": "197", "0,56": "194", "0,57": "190", "0,58": "187", "0,59": "183",
        "0,6": "180", "0,61": "177", "0,62": "175", "0,63": "172", "0,64": "170", "0,65": "167", "0,66": "165", "0,67": "163", "0,68": "161", "0,69": "159",
        "0,7": "157", "0,71": "155", "0,72": "154", "0,73": "153", "0,74": "150", "0,75": "148", "0,76": "146", "0,77": "144", "0,78": "143", "0,79": "141",
        "0,8": "139", "0,81": "138", "0,82": "137", "0,83": "135", "0,84": "134", "0,85": "133", "0,86": "132", "0,87": "131", "0,88": "129", "0,89": "128",
        "0,9": "127", "1": "117", "1,1": "114", "1,2": "111", "1,3": "108", "1,4": "105", "1,5": "102", "1,6": "101", "1,7": "100", "1,8": "98", "1,9": "97",
        "2": "96", "2,2": "95", "2,4": "94", "2,6": "92", "2,8": "91", "3": "90", "3,67": "89", "4,3": "87", "5": "86", "7": "85", "10": "85", ">10": "80"
    };

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
                <textarea name="nc_descrizione[]" class="form-control border-0 bg-transparent nc-textarea flex-grow-1 shadow-sm auto-expand" placeholder="Scrivi la descrizione..." oninput="ridimensionaTextarea(this); salvataggioIntelligente();"></textarea>
                
                <div class="d-flex flex-column gap-1 no-print flex-shrink-0">
                    <select class="form-select border-primary shadow-sm text-primary p-0 text-center" style="width: 38px; height: 38px; cursor: pointer; appearance: none; font-size: 0.8rem;" title="Libreria NC" onchange="inserisciDaLibreria(this)">
                        <option value="">📚</option>
                    </select>
                    <label class="btn btn-primary btn-nc-foto m-0 shadow-sm p-1" style="width: 38px; height: 38px;" title="Scatta Fotocamera">📸<input type="file" class="d-none" accept="image/*" capture="environment" onchange="gestisciFoto(this)"></label>
                    <label class="btn btn-outline-primary btn-nc-foto m-0 shadow-sm p-1" style="width: 38px; height: 38px;" title="Scegli dalla galleria">🖼️<input type="file" class="d-none" accept="image/*" onchange="gestisciFoto(this)"></label>
                </div>
            </div>
            <div class="canvas-container no-print w-100 text-center">
                <button type="button" class="btn-undo no-print" onclick="undoCanvas(this)" title="Annulla ultimo tratto" style="display:none;">↩️</button>
                <canvas class="foto-canvas mx-auto"></canvas>
            </div>
        </td>
        <td class="border-primary p-1">
            <div class="d-flex align-items-start gap-1 h-100">
                <textarea name="nc_note[]" class="form-control border-0 bg-transparent nc-textarea flex-grow-1 shadow-sm auto-expand" placeholder="Note o prescrizioni..." oninput="ridimensionaTextarea(this); salvataggioIntelligente()"></textarea>
                <div class="d-flex flex-column gap-1 no-print flex-shrink-0">
                    <button type="button" class="btn btn-outline-secondary btn-nc-foto border-0 btn-mic p-1" style="width: 38px; height: 38px;" onclick="avviaDettatura(this)" title="Dettatura vocale">🎙️</button>
                    <button type="button" class="btn btn-outline-danger btn-nc-foto border-0 btn-cestino p-1" style="width: 38px; height: 38px;" onclick="this.closest('tr').remove(); salvataggioIntelligente();">🗑️</button>
                </div>
            </div>
        </td>
    `;
    tbody.appendChild(tr);
    
    // Popola subito la tendina della nuova riga appena creata
    popolaSingolaTendina(tr.querySelector('select[title="Libreria NC"]'));
    salvataggioIntelligente();
}

// --- LIBRERIA NC ---
let libreriaNC_Dinamica = [];
function inizializzaLibreria() {
    let salvata = localStorage.getItem('libreriaNC_custom');
    if (salvata) { libreriaNC_Dinamica = JSON.parse(salvata); }
    else {
        libreriaNC_Dinamica = [
            { desc: "A1. All’atto della verifica non è stata esibita la documentazione tecnica dell’impianto (dichiarazione di conformità/rispondenza, progetto ove previsto, schemi elettrici, precedenti verbali di verifica). In assenza della suddetta documentazione non è stato possibile effettuare la verifica documentale prevista dalla normativa vigente.", pres: "Si richiama l’obbligo del datore di lavoro di conservare ed esibire la documentazione relativa agli impianti elettrici ai sensi del D.P.R. 462/2001 e del D.Lgs. 81/2008." },
            { desc: "A2. La documentazione tecnica dell’impianto è risultata incompleta e/o non aggiornata rispetto allo stato dei luoghi.", pres: "Si richiama l’obbligo del datore di lavoro di aggiornare la documentazione tecnica relativa agli impianti elettrici ai sensi del D.P.R. 462/2001 e del D.Lgs. 81/2008." },
            { desc: "A3. I dispersori di terra non risultano ispezionabili in quanto non accessibili e privi di pozzetti di verifica.", pres: "Realizzare idonei punti di ispezione o documentare tecnicamente la configurazione del dispersore." },
            { desc: "A4. Considerata la non accessibilità dei dispersori, in quanto inglobati sotto il manto stradale e privi di idonei punti di ispezione, non è stato possibile effettuare la verifica visiva diretta degli stessi. La verifica dell’impianto di terra è stata condotta esclusivamente mediante prove strumentali e controlli indiretti, nei limiti delle condizioni riscontrate. Pertanto, il presente verbale non costituisce attestazione dello stato di conservazione dei dispersori non accessibili né della loro corretta posa in opera.", pres: "Realizzare idonei punti di ispezione o documentare tecnicamente la configurazione del dispersore." },
            { desc: "A5. Componenti elettrici installati in un corridoio/via di esodo, con possibile interferenza con i requisiti di sicurezza dell’esodo.", pres: "Verificare la conformità dell’installazione e valutare la ricollocazione in vano tecnico dedicato." },
            { desc: "A5. Il sito risulta attualmente in fase di ristrutturazione; la verifica è stata eseguita limitatamente alle parti dell’impianto accessibili al momento del sopralluogo.", pres: "Ripetere la verifica sulle parti attualmente non accessibili a ultimazione dei lavori." },
            { desc: "V1. Presenza di moduli liberi privi di tappo di protezione/otturatore all’interno di qualche quadro. Tale condizione determina la presenza di aperture non protette con possibile accesso a parti attive e conseguente rischio di contatto diretto, nonché potenziale alterazione del grado di protezione IP dichiarato dal costruttore.", pres: "Si prescrive la sostituzione dei pannelli danneggiati con elementi originali o equivalenti conformi alle caratteristiche costruttive del quadro, al fine di ripristinare il grado di protezione e le condizioni di sicurezza." },
            { desc: "V2. Danneggiamento dei pannelli di chiusura di qualche quadro (fratture/distacchi/mancanza di parti), con possibile riduzione del grado di protezione IP dichiarato dal costruttore e potenziale accessibilità a parti attive", pres: "Sostituire i pannelli danneggiati con elementi originali." },            
            { desc: "V3. Nodo equipotenziale non ispezionabile", pres: "Rendere accessibile il nodo equipotenziale." },
            { desc: "V4. Rilevata la presenza di locali con condizioni di umidità significativa, tali da richiedere componenti idonei all’ambiente di installazione.", pres: "rilevata la presenza di locali con condizioni di umidità significativa, tali da richiedere componenti idonei all’ambiente di installazione." },
            { desc: "V5. Nodo equipotenziale non ispezionabile", pres: "Rendere accessibile il nodo equipotenziale." },
            { desc: "V6. Quadri non accessibili", pres: "Rendere accessibili i quadri." },
            { desc: "V7. Scarsa pulizia / polvere nel quadro", pres: "Eseguire accurata pulizia e verifica." },
            { desc: "S1. Alcuni interruttori differenziali sono risultati non funzionanti; si evidenzia tuttavia una protezione differenziale a monte dell’impianto.", pres: "Sostituire i dispositivi non conformi al fine di ripristinare la protezione differenziale." },
            { desc: "S2. Alcuni interruttori differenziali presentano tempi di intervento superiori ai limiti previsti.", pres: "Sostituire i dispositivi, verificando il coordinamento del sistema di protezione.." },
            { desc: "S3. È stata rilevata l’assenza della protezione differenziale a valle del gruppo di misura dell’energia elettrica.", pres: "Installare idonea protezione differenziale conforme alle caratteristiche dell’impianto." },
            { desc: "S4. È stata rilevata l’assenza della protezione differenziale su circuiti/utenze per i quali la stessa risulta necessaria.", pres: "Installare idonea protezione differenziale conforme alle caratteristiche dell’impianto." },
        ];
    }
    popolaDatalistNC();
}

// Popola una singola tendina con le voci della libreria
function popolaSingolaTendina(select) {
    if(!select) return;
    
    // Il libro lo forziamo al centro
    let optionsHtml = '<option value="" style="font-size: 1.2rem; text-align: center;">📚</option>';
    
    libreriaNC_Dinamica.forEach((item, index) => {
        // Le voci di testo le forziamo a sinistra con text-align: left;
        optionsHtml += `<option value="${index}" style="font-size: 0.80rem; text-align: left;">📋 ${item.desc.substring(0, 95)}...</option>`;
    });
    
    select.innerHTML = optionsHtml;
}

// Aggiorna tutte le tendine contemporaneamente (utile se importi un nuovo CSV)
function popolaDatalistNC() {
    document.querySelectorAll('select[title="Libreria NC"]').forEach(select => {
        popolaSingolaTendina(select);
    });
}

// Scatta quando scegli una voce dal pulsantino a forma di libro 📚
function inserisciDaLibreria(select) {
    if (select.value === "") return; // Se selezioni il libro vuoto, non fa nulla
    
    const index = select.value;
    const item = libreriaNC_Dinamica[index];
    const tr = select.closest('tr');
    
    const textDesc = tr.querySelector('textarea[name="nc_descrizione[]"]');
    const textNote = tr.querySelector('textarea[name="nc_note[]"]');
    
    // Incolla la descrizione e allarga la casella
    if (textDesc) {
        textDesc.value = item.desc;
        ridimensionaTextarea(textDesc);
    }
    
    // Incolla le note (solo se vuote) e allarga la casella
    if (textNote && !textNote.value.trim()) {
        textNote.value = item.pres;
        ridimensionaTextarea(textNote);
    }
    
    // Riporta la tendina all'icona del libro
    select.value = ""; 
    salvataggioIntelligente();
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

function salvataggioIntelligente() {
    clearTimeout(window.saveTimer);
    window.saveTimer = setTimeout(() => {
        aggiornaEsitoGlobale();
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

// --- GESTIONE ARCHIVIO INTERNO E NUOVI TASTI ---
async function aggiornaSelectArchivio() {
    const select = document.getElementById('archivio_select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Verbali --</option>';
    let archivio = await idbKeyval.get('vit_archivio_dati') || {};
    Object.keys(archivio).sort((a,b)=>b.localeCompare(a)).forEach(nome => {
        let opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        select.appendChild(opt);
    });
}

async function caricaDaArchivioSelezionato() {
    const select = document.getElementById('archivio_select');
    if (!select || !select.value) {
        alert("⚠️ Seleziona un verbale dalla tendina prima di caricare!");
        return;
    }
    caricaDaArchivio(select.value);
}

async function eliminaDaArchivioRapido() {
    const select = document.getElementById('archivio_select');
    if (!select || !select.value) {
        alert("⚠️ Seleziona un verbale dalla tendina prima di eliminare!");
        return;
    }
    eliminaDaArchivio(select.value);
}

async function migraArchivio() {
    let vecchio = localStorage.getItem('verbaleVIT_archivio');
    if (vecchio) {
        await idbKeyval.set('vit_archivio_dati', JSON.parse(vecchio));
        localStorage.removeItem('verbaleVIT_archivio');
    }
}

async function salvaInArchivio() {
    fissaValoriHTML();
    let denom = document.getElementById('denominazione_imp')?.value || "SenzaNome";
    let dataV = document.getElementById('data_verifica_obblig')?.value || new Date().toLocaleDateString('it-IT');
    let nome = prompt("Nome verbale da salvare:", `${denom} - ${dataV}`);
    if (!nome) return;

    let archivio = await idbKeyval.get('vit_archivio_dati') || {};
    archivio[nome] = getModuloJSON();
    await idbKeyval.set('vit_archivio_dati', archivio);

    aggiornaSelectArchivio();
    alert(`✅ Verbale "${nome}" salvato nel dispositivo!`);
}

async function duplicaVerbale() {
    let denom = document.getElementById('denominazione_imp')?.value || "Copia";
    let nome = prompt("Crea un duplicato come:", `${denom} - Copia`);
    if (!nome) return;

    let jsonData = JSON.parse(getModuloJSON());

    for (let nc of jsonData.non_conformita) {
        if (nc.foto_id) {
            let newId = 'foto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            let base64 = await idbKeyval.get(nc.foto_id);
            if (base64) await idbKeyval.set(newId, base64);
            nc.foto_id = newId;
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

async function caricaDaArchivio(nome) {
    if(!confirm(`Vuoi caricare "${nome}"?\nI dati attuali andranno persi se non salvati.`)) return;
    let archivio = await idbKeyval.get('vit_archivio_dati') || {};
    if (archivio[nome]) {
        await setModuloJSON(archivio[nome]);
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
        aggiornaSelectArchivio();
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
            aggiornaSelectArchivio();
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
    const re = document.getElementById('val_resistenza_terra');

    let err = false;

    [d, r, n, re].forEach(el => {
        if(!el?.value){
            el?.classList.add('campo-errore');
            err = true;
        } else {
            el?.classList.remove('campo-errore');
        }
    });

    const sistemaChecked = document.querySelector('input[name="sistema"]:checked');
    const sistemaRadios = document.querySelectorAll('input[name="sistema"]');

    if (!sistemaChecked) {
        sistemaRadios.forEach(radio => radio.classList.add('campo-errore'));
        err = true;
    } else {
        sistemaRadios.forEach(radio => radio.classList.remove('campo-errore'));
    }

    if (err) {
        alert("⚠️ Mancano campi obbligatori!\n\nVerifica di aver compilato:\n- Data\n- Ragione Sociale\n- Denominazione Impianto\n- Dati Impianto (TT, TN-S, o IT)\n- Misura resistenza Terra (RE)");
        return;
    }

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

        const areaDati = document.getElementById('area-dati');
        const opt = {
            margin: [10,5,15,5],
            filename: getNomeFileEsportazione().replace(/[\/\\]/g, '-') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            pagebreak: { mode: ['css', 'legacy'] },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowHeight: areaDati.scrollHeight + 50 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await window.html2pdf().set(opt).from(areaDati).save();

    } catch(e) {
        console.error("Errore html2pdf: ", e);
        eseguiStampaBase();
    } finally {
        document.querySelectorAll('.no-print').forEach(el => el.style.display = '');
        document.body.classList.remove('fase-stampa'); if(btn) btn.innerHTML = org;
    }
}

function eseguiStampaBase() {
    const titoloOriginale = document.title;
    document.title = getNomeFileEsportazione().replace(/[\/\\]/g, '-');

    window.print();

    document.title = titoloOriginale;
}

// --- INIT APP E LOGICA DI AVVIO ---
window.onload = async function() {
    applicaDarkMode();
    popolaSelectTF();
    popolaPercDropdowns();
    inizializzaLibreria();
    
    if(typeof aggiornaSelectArchivio === "function") {
        await aggiornaSelectArchivio();
    }

    const backup = localStorage.getItem('verbaleVIT_backup');

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

// --- ESTRAZIONE DATI FORM E XFDF ---
function estraiDatiForm() {
    let dati = {};
    document.getElementById('area-dati').querySelectorAll('input, select, textarea').forEach(el => {
        let nome = el.name || el.id;
        if (!nome) return;

        if (el.type === 'checkbox' || el.type === 'radio') {
            if (nome.endsWith('[]')) {
                if (!dati[nome]) dati[nome] = [];
                if (el.checked) {
                    dati[nome].push((el.value && el.value !== 'on') ? el.value : 'Si');
                } else if (el.type === 'checkbox') {
                    dati[nome].push('No');
                }
            } else {
                if (el.checked) {
                    dati[nome] = (el.value && el.value !== 'on') ? el.value : 'Si';
                } else {
                    if (dati[nome] === undefined) dati[nome] = 'No';
                }
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

// --- DIZIONARIO COLLEGAMENTO PDF ---
const mappaCampiPDF = {
    // --- INTESTAZIONE ---
    "verbale_n1": "verbale_n1",
    "data_verifica": "data_verifica",

    // --- 1. DATI DEL COMMITTENTE ---
    "ragione_sociale": "Ragione sociale",
    "citta_comm": "città.0.0.0",
    "indirizzo_comm": "indirizzo.0",
    "tipo_verifica": "tipo_verifica",

    // --- 2. IMPIANTO SOGGETTO A VERIFICA ---
    "denominazione_imp": "denominazione_imp",
    "citta_imp": "città.1",
    "indirizzo_imp": "indirizzo.1.0",
    "locale_uso": "Locale ad uso",
    "sistema": "sistema",
    "area": "area",
    "pod": "POD",
    "kw": "Kw",
    "volt": "TENSIONE",
    "tens_nominale": "kV",
    "corr_guasto": "Corrente di guasto monofase a terra",
    "tempo_guasto": "SEC. GUASTO",
    "tens_contatto": "contatto ammissibile",

    // --- 3. ESAME DOCUMENTALE ---
    "chk_doc_conf": "DI.CO.0",
    "doc_conf_il": "DICO DATA.0",
    "doc_conf_da": "DICO Rilasciata.0",
    "chk_doc_risp": "DI.RI",
    "doc_risp_il": "DIRI DATA.1",
    "doc_risp_da": "DIRI Rilasciata.1",
    "chk_doc_prog": "Progetto",
    "doc_prog_il": "PROJ DATA.2.0",
    "doc_prog_da": "PROJ Rilasciata.2",
    "chk_inail": "INAIL",
    "inail_matr": "Matricola Inail",
    "inail_data": "INAIL DATA.2.1",
    "chk_asl": "ASL_chk",
    "asl_matr": "Matricola ASL",
    "asl_data": "ASL DATA.2.2.0",
    "doc_schemi": "SCHEMI",
    "doc_planimetria": "PLAN.0",
    "doc_verbale_prec": "VIT PREC",
    "tns_comunicazione": "GESTORE DATA",

    // --- 4. ESAME A VISTA ---
    "inf_tubo": "Sistema disperdente.2.1",
    "inf_profilo": "Sistema disperdente.2.2.0.1",
    "inf_mass": "Sistema disperdente.2.2.0.0",
    "mat_inf_zinc": "Sistema disperdente.2.2.1.0.0.0",
    "mat_inf_rame": "Sistema disperdente.2.2.1.1.0.0",
    "picchetti_num": "picchetti_num",
    "posa_nastro": "Sistema disperdente.0.2",
    "posa_tondino": "Sistema disperdente.1.",
    "posa_cordato": "Sistema disperdente.1.1",
    "mat_posa_zinc": "Sistema disperdente.2.2.1.0.1.0",
    "mat_posa_rame": "Sistema disperdente.2.2.1.1.1.0",
    "nodo_collettore": "nodo_collettore",
    "stato_conn": "stato_conn",
    "realiz_bulloni": "Connessioni.1.0",
    "realiz_morsetti": "Connessioni.1.1",
    "realiz_capicorda": "Connessioni.1.2",

    // --- 5. ESAME CONDUTTORI ---
    "id_terra": "id_terra",
    "id_prot": "id_prot",
    "id_giunz": "id_giunz",
    "sez_terra": "SEZIONE.0",
    "ct_isolati": "CAVI.0.0",
    "ct_rame": "CAVI.0.1",
    "ct_nastri": "CAVI.0.2",
    "ct_strutt": "CAVI.0.3",
    "sez_prot": "SEZIONE.1",
    "cp_isolati": "CAVI.1.0",
    "cp_nudi": "CAVI.1.1",
    "cp_anime": "CAVI.1.2",
    "cp_involucri": "CAVI.1.3",
    "sez_eq": "SEZIONE.2",
    "ce_isolati": "CAVI.2.0.0",
    "ce_nudi": "CAVI.2.1.0",
    "ce_richiesti": "CAVI.2.2.0",
    "ce_non_richiesti": "CAVI.2.3.0",
    "cont_cond": "cont_cond",
    "cont_eq": "cont_eq",
    "int_diff": "Interruttori D.0.0",
    "int_max_corr": "Interruttori MAX.0.0",
    "condizioni": "condizioni",

    // --- 6. CAMPIONAMENTO E CONTINUITÀ ---
    "tipo_ambiente": "tipo_ambiente",
    "perc_disp": "%.0",
    "perc_coll": "%.1",
    "perc_pe": "%.2",
    "perc_masse_coll": "%.3",
    "perc_masse_est": "%masse",
    "presente_verifica": "committente delegato",

    // --- 7. ESAME STRUMENTALE ---
    "misura_resistenza_terra": "RE",
    "metodo_misura": "metodo_misura",
    "tt_soddisf": "tt_soddisf",
    "val_ul_scelta": "UL",
    "tn_soddisf_2": "tn_soddisf_2",
    "tn_val_uc": "tn_val_uc",

    // --- 8. DIFFERENZIALI (TABELLA DINAMICA) ---
    "diff_quadro[]": "Quadro",
    "diff_no[]": "No_Diff",
    "diff_note[]": "Note",

    // --- 9. NON CONFORMITÀ (TABELLA DINAMICA) ---
    "nc_descrizione[]": "nc_descrizione",
    "nc_note[]": "nc_note",

    // --- 10. ESITO VERIFICA ---
    "esito_globale": "esito_globale",
    "tempo_impiegato": "ORA/UOMO",
    "prossima_verifica": "prossima_verifica"
};

// --- DIZIONARIO SPECIALE: Da HTML a Checkbox Multiple (PDF) ---
const mappaRadioCheckbox = {
    "tipo_verifica": {
        "biennale": "Check Box1.1",        
        "quinquennale": "Check Box1.0"
    },
    "sistema": {
        "tt": "TT",        
        "tn-s": "TNS",     
        "it": "IT"
    },
    "area": {
        "ii": "Area II.0",
        "iii": "MT.0"
    },
    "sist_disp_ispez": {
        "Ispezionabile": "Ispezionabile.0.0",
        "Non Ispezionabile": "NON Ispezionabile.3"
    },
    "sist_disp_regol": {
        "Regolamentare": "REG.0",
        "Non Regolamentare": "NO REG"
    },
    "picchetti_num": {
        "1": "PDF_check_Picchetti1",
        "2": "PDF_check_Picchetti2",
        "3": "PDF_check_Picchetti3",
        "4": "PDF_check_PicchettiVari",
        "vari": "PDF_check_PicchettiVari"
    },
    "nodo_collettore": {
        "Acciaio Zincato": "CAVI.2.0.1",
        "Morsetto": "CAVI.2.1.1",
        "Rame": "CAVI.2.2.1",
        "Non Identificato": "CAVI.2.3.1"
    },
    "id_terra": {
        "idonei": "TERRA.1.0",
        "nonidonei": "TERRA.2.0"
    },
    "id_prot": {
        "idonei": "TERRA.1.1.0",
        "nonidonei": "TERRA.2.1.0"
    },
    "id_giunz": {
        "idonee": "TERRA.1.1.1",
        "nonidonee": "TERRA.2.1.1"
    },
    "cont_cond": {
        "Si": "Si_cont",
        "No": "No_cont",
        "N/A": "NA_cont"
    },
    "cont_eq": {
        "Si": "Si_eq",
        "No": "No_eq",
        "N/A": "NA_eq"
    },
    "tipo_ambiente": {
        "ordinario": "ordinario",
        "speciale": "speciale"
    },
    "metodo_misura": {
        "ttok": "TT OK.0",
        "ttko": "TT KO.0"
    },
    "tt_soddisf": {
        "Risulta": "TT OK.0",
        "Non Risulta": "TT KO.0"
    },
    "tn_soddisf_2": {
        "Risulta": "TN OK.1.0",
        "Non Risulta": "TN KO.1.0"
    },
    "esito_globale": {
        "esito.ok": "OK",
        "esito.ko": "KO"
    },
    "stato_conn": {
        "idonee": "Connessioni.0.0",      
        "nonidonee": "Connessioni.0.1"       
    },
    "condizioni": {
        "buone": "Buone", 
        "discrete": "Discrete",
        "mediocri": "Mediocri", 
        "scarse": "Scarse" 
    }
};

// --- FUNZIONE DEFINITIVA PER ESPORTAZIONE XFDF ---
function esportaXFDF() {
    let dati = estraiDatiForm();
    let xfdf = `<?xml version="1.0" encoding="UTF-8"?>\n<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">\n<fields>\n`;

    // ---> GESTIONE 4 CHECKBOX VERSO TENDINA A RANGE <---
    let nomeGruppoPdf = "Corrente_Idn"; 
    if (dati["diff_003[]"]) {
        let numRighe = dati["diff_003[]"].length;
        for (let i = 0; i < numRighe; i++) {
            let selezioni = [];
            if (dati["diff_003[]"][i] === "Si" || dati["diff_003[]"][i] === "on" || dati["diff_003[]"][i] === "Sì") selezioni.push("0,03");
            if (dati["diff_03[]"][i] === "Si" || dati["diff_03[]"][i] === "on" || dati["diff_03[]"][i] === "Sì") selezioni.push("0,3");
            if (dati["diff_05[]"][i] === "Si" || dati["diff_05[]"][i] === "on" || dati["diff_05[]"][i] === "Sì") selezioni.push("0,5");
            if (dati["diff_1[]"][i] === "Si" || dati["diff_1[]"][i] === "on" || dati["diff_1[]"][i] === "Sì") selezioni.push("1");
            
            let valoreScelto = "Off";
            if (selezioni.length === 1) {
                valoreScelto = selezioni[0];
            } else if (selezioni.length > 1) {
                valoreScelto = selezioni[0] + "÷" + selezioni[selezioni.length - 1];
            }
            
            if (valoreScelto !== "Off") {
                let nomeIndicizzato = `${nomeGruppoPdf}_${i + 1}`; 
                let safeKey = nomeIndicizzato.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                let safeVal = String(valoreScelto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                xfdf += `  <field name="${safeKey}"><value>${safeVal}</value></field>\n`;
            }
        }
        delete dati["diff_003[]"]; delete dati["diff_03[]"]; delete dati["diff_05[]"]; delete dati["diff_1[]"];
    }

    // "TRITATUTTO": Rimuove tutti gli spazi e mette in minuscolo per rendere i nomi indistruttibili
    const pulisciTesto = (str) => String(str || "").toLowerCase().replace(/\s+/g, '');

    for (let key in dati) {
        let valori = dati[key];

        // 1. GESTIONE SPECIALE: Da Radio Button a Checkbox Multiple
        if (typeof mappaRadioCheckbox !== 'undefined' && mappaRadioCheckbox[key]) {
            let valoreSelezionato = pulisciTesto(valori);
            for (let opzione in mappaRadioCheckbox[key]) {
                let nomeCheckboxPDF = mappaRadioCheckbox[key][opzione];
                let opzionePulita = pulisciTesto(opzione); 
                
                // Acrobat si aspetta "Sì" (con l'accento) per le caselle di controllo, come da tua conferma
                let isChecked = (valoreSelezionato === opzionePulita) ? "Sì" : "Off";
                let safeKey = nomeCheckboxPDF.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                xfdf += `  <field name="${safeKey}"><value>${isChecked}</value></field>\n`;
            }
            continue; 
        }

        // 2. GESTIONE STANDARD E TABELLE
        let nomeBasePDF = mappaCampiPDF[key] || key.replace('[]', '');

        // Mini-funzione per processare e formattare i valori
        let processaValore = (val, i) => {
            if (val === undefined || val === null || val === "") return;

            // Forza standardizzazione del Sì per Acrobat
            if (val === "Si" || val === "on" || val === "Yes") val = "Sì";
            if (val === "No") val = "Off";
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                let p = val.split('-'); val = `${p[2]}/${p[1]}/${p[0]}`;
            }
            
            // CONVERSIONE PERCENTUALI PER XFDF (Rimessa la virgola al posto del punto per Acrobat ITA)
            if (typeof val === 'string' && val.endsWith('%')) {
                let numero = parseFloat(val.replace('%', ''));
                if (!isNaN(numero)) {
                    val = (numero / 100).toString().replace('.', ','); 
                }
            }

            let suff = i !== undefined ? `_${i + 1}` : '';
            let nomeIndicizzato = `${nomeBasePDF}${suff}`;
            let safeKey = nomeIndicizzato.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            let safeVal = String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            xfdf += `  <field name="${safeKey}"><value>${safeVal}</value></field>\n`;
        };

        if (Array.isArray(valori)) {
            for (let i = 0; i < valori.length; i++) processaValore(valori[i], i);
        } else {
            processaValore(valori, undefined);
        }
    }

    xfdf += `</fields>\n</xfdf>`;

    let blob = new Blob([xfdf], { type: 'application/vnd.adobe.xfdf' });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = getNomeFileEsportazione().replace(/[\/\\]/g, '-') + ".xfdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- MOTORE JSON (ESTRAZIONE) ---
function getModuloJSON() {
    let json = {
        campi_semplici: {},
        differenziali: [],
        non_conformita: []
    };

    document.querySelectorAll('#verificaForm input:not([name*="[]"]), #verificaForm select:not([name*="[]"]), #verificaForm textarea:not([name*="[]"]), #data_verifica_obblig, #verbale_n1, #prossima_verifica').forEach(el => {
        let key = el.name || el.id;
        if (!key) return;

        if (el.type === 'checkbox') {
            json.campi_semplici[key] = el.checked;
        } else if (el.type === 'radio') {
            if (el.checked) json.campi_semplici[key] = el.value;
        } else {
            json.campi_semplici[key] = el.value;
        }
    });

    document.querySelectorAll('.diff-row').forEach(row => {
        json.differenziali.push({
            quadro: row.querySelector('[name="diff_quadro[]"]')?.value || "",
            no: row.querySelector('[name="diff_no[]"]')?.value || "",
            chk_003: row.querySelector('[name="diff_003[]"]')?.checked || false,
            chk_03: row.querySelector('[name="diff_03[]"]')?.checked || false,
            chk_05: row.querySelector('[name="diff_05[]"]')?.checked || false,
            chk_1: row.querySelector('[name="diff_1[]"]')?.checked || false,
            note: row.querySelector('[name="diff_note[]"]')?.value || ""
        });
    });

    document.querySelectorAll('.nc-row').forEach(row => {
        let canvas = row.querySelector('canvas.foto-canvas');
        json.non_conformita.push({
            descrizione: row.querySelector('[name="nc_descrizione[]"]')?.value || "",
            note: row.querySelector('[name="nc_note[]"]')?.value || "",
            foto_id: canvas ? canvas.getAttribute('data-foto-id') : null
        });
    });

    return JSON.stringify(json);
}

// --- MOTORE JSON E MIGRAZIONE (INIEZIONE) ---
async function setModuloJSON(jsonString) {
    if (!jsonString) return;

    if (!jsonString.trim().startsWith('{')) {
        try {
            const parser = new DOMParser();
            const oldDoc = parser.parseFromString(jsonString, 'text/html');

            const form = document.getElementById('verificaForm');
            if (form) form.reset();

            const dataVal = document.getElementById('data_verifica_obblig');
            if (dataVal) dataVal.value = "";
            const nVal = document.getElementById('verbale_n1');
            if (nVal) nVal.value = "";

            const diffRowsCount = oldDoc.querySelectorAll('.diff-row').length;
            const diffTable = document.getElementById('diffTable');
            if (diffTable) {
                diffTable.innerHTML = '';
                for(let i=0; i<diffRowsCount; i++) addDiffRow();
            }

            const ncRowsCount = oldDoc.querySelectorAll('.nc-row').length;
            const ncTable = document.getElementById('ncTable');
            if (ncTable) {
                ncTable.innerHTML = '';
                for(let i=0; i<ncRowsCount; i++) addNCRow();
            }

            let oldInputs = oldDoc.querySelectorAll('input, select, textarea');
            oldInputs.forEach(oldEl => {
                let name = oldEl.name || oldEl.id;
                if (!name) return;

                let isArray = name.endsWith('[]');
                let newEls = isArray ? document.querySelectorAll(`[name="${name}"]`) : document.querySelectorAll(`[name="${name}"], #${name}`);

                let oldElsList = isArray ? Array.from(oldDoc.querySelectorAll(`[name="${name}"]`)) : [oldEl];
                let index = isArray ? oldElsList.indexOf(oldEl) : 0;

                let newEl = newEls[index];
                if (newEl) {
                    if (oldEl.type === 'checkbox' || oldEl.type === 'radio') {
                        newEl.checked = oldEl.hasAttribute('checked');
                    } else if (oldEl.tagName === 'SELECT') {
                        let selectedOpt = oldEl.querySelector('option[selected]');
                        if (selectedOpt) newEl.value = selectedOpt.value;
                    } else if (oldEl.tagName === 'TEXTAREA') {
                        newEl.value = oldEl.textContent || oldEl.innerHTML || "";
                    } else {
                        newEl.value = oldEl.getAttribute('value') || "";
                    }
                }
            });

            let oldCanvases = oldDoc.querySelectorAll('canvas.foto-canvas');
            let newCanvases = document.querySelectorAll('canvas.foto-canvas');
            oldCanvases.forEach((oldCanvas, index) => {
                let fotoId = oldCanvas.getAttribute('data-foto-id');
                if (fotoId && newCanvases[index]) {
                    newCanvases[index].setAttribute('data-foto-id', fotoId);
                }
            });

            calcolaUc();
            aggiornaEsitoGlobale();
            await ripristinaCanvas();

            salvataggioIntelligente();

            return;
        } catch (e) {
            console.error("Errore migrazione vecchi verbali:", e);
            alert("Errore nell'adattamento del vecchio verbale.");
            return;
        }
    }

    try {
        let data = JSON.parse(jsonString);

        const form = document.getElementById('verificaForm');
        if (form) form.reset();

        const dataVal = document.getElementById('data_verifica_obblig');
        if (dataVal) dataVal.value = "";
        const nVal = document.getElementById('verbale_n1');
        if (nVal) nVal.value = "";

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

        calcolaUc();
        aggiornaEsitoGlobale();
        await ripristinaCanvas();

    } catch (e) {
        console.error("Errore parser JSON:", e);
        alert("Errore nel caricamento del file. I dati potrebbero essere corrotti.");
    }
}
