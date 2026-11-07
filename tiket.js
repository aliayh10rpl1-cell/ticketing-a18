// Firebase Configuration (Mock/Fallback Compatible)
const firebaseConfig = {
    databaseURL: "https://astaraka18land-default-rtdb.firebaseio.com"
};

let db = null;
let ticketsData = {};

// Default CSV Data Embedded (1 - 720)
const INITIAL_CSV_DATA = {};

// Class Options
const CLASS_OPTIONS = [
    "X TEI 1", "X TEI 2", "X TEI 3", "X TEI 4", "X TEI 5",
    "X TKR 1", "X TKR 2", "X TKR 3", "X TKR 4", "X TKR 5",
    "X TKJ 1", "X TKJ 2", "X TKJ 3", "X TKJ 4",
    "X RPL 1", "X RPL 2", "X RPL 3", "X RPL 4",
    "X TBSM 1", "X TBSM 2"
];

// Seed 720 Data
function generateInitialCSVSeed() {
    for (let i = 1; i <= 720; i++) {
        let cls = "X TEI 1";
        if (i >= 181 && i <= 399) cls = "X TKR 1";
        else if (i >= 400 && i <= 542) cls = "X TKJ 1";
        else if (i >= 543 && i <= 649) cls = "X RPL 1";
        else if (i >= 650) cls = "X TBSM 1";

        INITIAL_CSV_DATA[`ASTARAKA-${i}`] = {
            name: `Peserta ${i}`,
            class: cls,
            checkedIn: false
        };
    }
}
generateInitialCSVSeed();

// Initialize Firebase / Storage Fallback
function initDataConnection() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            
            // Realtime Listener
            db.ref('tickets').on('value', (snapshot) => {
                const val = snapshot.val();
                if (val) {
                    ticketsData = val;
                } else {
                    ticketsData = INITIAL_CSV_DATA;
                    db.ref('tickets').set(INITIAL_CSV_DATA);
                }
                renderSavedList();
                renderTablePage();
            });
        } else {
            fallbackLocalData();
        }
    } catch (e) {
        fallbackLocalData();
    }
}

function fallbackLocalData() {
    const stored = localStorage.getItem('ASTARAKA_TIKETS_CLOUD');
    if (stored) {
        ticketsData = JSON.parse(stored);
    } else {
        ticketsData = INITIAL_CSV_DATA;
        localStorage.setItem('ASTARAKA_TIKETS_CLOUD', JSON.stringify(ticketsData));
    }
}

function saveDataToCloud() {
    if (db) {
        db.ref('tickets').set(ticketsData);
    } else {
        localStorage.setItem('ASTARAKA_TIKETS_CLOUD', JSON.stringify(ticketsData));
    }
}

// Navigation Tabs
function switchTab(tabName) {
    ['search', 'create', 'list'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}-btn`).classList.remove('bg-forest-700', 'text-white');
        document.getElementById(`tab-${t}-btn`).classList.add('bg-retro-card', 'text-retro-cream');
    });

    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-${tabName}-btn`);
    activeBtn.classList.add('bg-forest-700', 'text-white');
    activeBtn.classList.remove('bg-retro-card', 'text-retro-cream');

    if (tabName === 'create') renderTablePage();
    if (tabName === 'list') renderSavedList();
}

// Search Logic
let currentSearchedCode = null;

function searchTicket(e) {
    if (e) e.preventDefault();
    const num = document.getElementById('search-input').value.trim();
    if (!num) return;

    const code = `ASTARAKA-${num}`;
    currentSearchedCode = code;

    const resContainer = document.getElementById('search-result');
    const foundCard = document.getElementById('result-found');
    const notFoundCard = document.getElementById('result-notfound');

    resContainer.classList.remove('hidden');

    if (ticketsData[code]) {
        const data = ticketsData[code];
        document.getElementById('res-code').innerText = code;
        document.getElementById('res-name').innerText = data.name;
        document.getElementById('res-class').innerText = data.class;
        
        const btnCheck = document.getElementById('btn-checkin');
        const badge = document.getElementById('res-status-badge');
        const timeText = document.getElementById('res-checkin-time');

        if (data.checkedIn) {
            badge.innerText = "STATUS: SUDAH CHECK-IN";
            badge.className = "bg-yellow-900 text-yellow-300 font-mono text-xs px-3 py-1 border border-yellow-600 rounded";
            btnCheck.innerHTML = '<i class="fa-solid fa-undo"></i> BATALKAN CHECK-IN';
            timeText.innerText = data.checkInTime || "Checked-In";
        } else {
            badge.innerText = "STATUS: TIKET VALID";
            badge.className = "bg-forest-800 text-retro-accent font-mono text-xs px-3 py-1 border border-forest-600 rounded";
            btnCheck.innerHTML = '<i class="fa-solid fa-check"></i> TANDAI MASUK (CHECK-IN)';
            timeText.innerText = "Belum Check-In";
        }

        foundCard.classList.remove('hidden');
        notFoundCard.classList.add('hidden');
    } else {
        foundCard.classList.add('hidden');
        notFoundCard.classList.remove('hidden');
    }
}

function toggleCheckIn() {
    if (!currentSearchedCode || !ticketsData[currentSearchedCode]) return;
    
    const current = ticketsData[currentSearchedCode].checkedIn;
    ticketsData[currentSearchedCode].checkedIn = !current;
    ticketsData[currentSearchedCode].checkInTime = !current ? new Date().toLocaleTimeString('id-ID') : null;

    saveDataToCloud();
    searchTicket();
}

function quickSearch(num) {
    document.getElementById('search-input').value = num;
    switchTab('search');
    searchTicket();
}

function clearSearchResult() {
    document.getElementById('search-result').classList.add('hidden');
}

// Table 720 Rows (Pagination 50/page)
let currentPage = 1;

function initPaginationSelect() {
    const pageSelect = document.getElementById('page-select');
    if (!pageSelect) return;
    pageSelect.innerHTML = '';
    for (let p = 1; p <= 15; p++) {
        const start = (p - 1) * 50 + 1;
        const end = Math.min(p * 50, 720);
        pageSelect.innerHTML += `<option value="${p}">Halaman ${p} (${start}-${end})</option>`;
    }
}

function renderTablePage() {
    const pageSelect = document.getElementById('page-select');
    if (!pageSelect) return;
    currentPage = parseInt(pageSelect.value) || 1;
    const tbody = document.getElementById('table-body-720');
    if (!tbody) return;
    tbody.innerHTML = '';

    const start = (currentPage - 1) * 50 + 1;
    const end = Math.min(currentPage * 50, 720);

    for (let i = start; i <= end; i++) {
        const code = `ASTARAKA-${i}`;
        const item = ticketsData[code] || { name: '', class: 'X TEI 1' };

        let classOptionsHtml = CLASS_OPTIONS.map(c => 
            `<option value="${c}" ${item.class === c ? 'selected' : ''}>${c}</option>`
        ).join('');

        const tr = `
            <tr class="hover:bg-forest-900/40">
                <td class="p-2 text-center font-bold text-retro-gold">${i}</td>
                <td class="p-2 font-bold text-retro-accent">${code}</td>
                <td class="p-2">
                    <input type="text" id="row-name-${i}" value="${item.name}" placeholder="Nama..."
                        class="w-full bg-retro-bg text-retro-cream p-1.5 border border-retro-border rounded text-xs focus:border-retro-accent">
                </td>
                <td class="p-2">
                    <select id="row-class-${i}" class="w-full bg-retro-bg text-retro-cream p-1.5 border border-retro-border rounded text-xs">
                        ${classOptionsHtml}
                    </select>
                </td>
            </tr>
        `;
        tbody.innerHTML += tr;
    }
}

function saveCurrentPageData() {
    const start = (currentPage - 1) * 50 + 1;
    const end = Math.min(currentPage * 50, 720);

    for (let i = start; i <= end; i++) {
        const code = `ASTARAKA-${i}`;
        const nameInput = document.getElementById(`row-name-${i}`);
        const classInput = document.getElementById(`row-class-${i}`);
        if (nameInput && classInput) {
            const nameVal = nameInput.value.trim();
            const classVal = classInput.value;

            if (!ticketsData[code]) ticketsData[code] = {};
            ticketsData[code].name = nameVal;
            ticketsData[code].class = classVal;
        }
    }

    saveDataToCloud();
    alert(`Berhasil menyimpan data Halaman ${currentPage}!`);
}

function applyBatchPaste() {
    const batchInput = document.getElementById('batch-paste-input');
    if (!batchInput) return;
    const text = batchInput.value.trim();
    if (!text) return;

    const lines = text.split('\n');
    let count = 0;

    lines.forEach(line => {
        const parts = line.split('-');
        if (parts.length >= 2) {
            const numStr = parts[parts.length - 1].trim();
            const num = parseInt(numStr);
            const name = parts.slice(0, parts.length - 1).join('-').trim();

            if (!isNaN(num) && num >= 1 && num <= 720) {
                const code = `ASTARAKA-${num}`;
                if (!ticketsData[code]) ticketsData[code] = { class: "X TEI 1" };
                ticketsData[code].name = name;
                count++;
            }
        }
    });

    saveDataToCloud();
    renderTablePage();
    alert(`Berhasil memperbarui ${count} data tiket secara massal!`);
}

// Saved List Tab
function renderSavedList() {
    const tbody = document.getElementById('saved-tickets-tbody');
    if (!tbody) return;
    const searchInput = document.getElementById('filter-input');
    const classSelect = document.getElementById('filter-class-select');
    
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const clsFilter = classSelect ? classSelect.value : '';

    tbody.innerHTML = '';
    let count = 0;

    for (let i = 1; i <= 720; i++) {
        const code = `ASTARAKA-${i}`;
        const item = ticketsData[code];
        if (!item) continue;

        const matchSearch = code.toLowerCase().includes(search) || item.name.toLowerCase().includes(search);
        const matchClass = clsFilter === '' || item.class.includes(clsFilter);

        if (matchSearch && matchClass) {
            count++;
            const statusBadge = item.checkedIn 
                ? `<span class="bg-yellow-950 text-yellow-300 px-2 py-0.5 rounded border border-yellow-800">Check-In</span>`
                : `<span class="bg-forest-900 text-retro-accent px-2 py-0.5 rounded border border-forest-600">Valid</span>`;

            const tr = `
                <tr class="hover:bg-forest-900/30">
                    <td class="p-2.5 font-bold text-retro-accent">${code}</td>
                    <td class="p-2.5 text-white font-bold">${item.name}</td>
                    <td class="p-2.5 text-retro-cream">${item.class}</td>
                    <td class="p-2.5 text-center">${statusBadge}</td>
                </tr>
            `;
            tbody.innerHTML += tr;
        }
    }

    if (count === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-retro-gray">Tidak ada data ditemukan.</td></tr>`;
    }
}

function resetToCSVData() {
    if (confirm("Reset ulang seluruh database ke data CSV awal?")) {
        ticketsData = INITIAL_CSV_DATA;
        saveDataToCloud();
        renderSavedList();
        renderTablePage();
    }
}

// Init App on Load
window.addEventListener('DOMContentLoaded', () => {
    initPaginationSelect();
    initDataConnection();
});
