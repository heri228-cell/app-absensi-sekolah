// =======================================================
// SCRIPT UTAMA (EDISI NIPD)
// =======================================================

// ⚠️ PASTE URL ANDA DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbzKAFI3DgcHb6tyTq275DhwTUD9AKViehn7yICsa-O1XKt5XrH1nGmPIxBIKpOdMZnh/exec"; 

let daftarLibur = []; 

document.addEventListener("DOMContentLoaded", function() {
    const today = new Date().toISOString().split('T')[0];
    const inputTgl = document.getElementById("inputTanggal");
    if(inputTgl) inputTgl.value = today;
    if(document.getElementById("rekapMulai")) document.getElementById("rekapMulai").value = today;
    if(document.getElementById("rekapAkhir")) document.getElementById("rekapAkhir").value = today;
    fetchConfig();
});

function fetchConfig() {
    showLoading(true);
    fetch(API_URL + "?action=getConfig")
    .then(res => res.json())
    .then(data => {
        if(data.status === "success") {
            document.getElementById("infoTahunAjaran").innerHTML = `TP: <b>${data.config.Tahun_Ajaran}</b> | Sem: <b>${data.config.Semester}</b>`;
            daftarLibur = data.hari_libur; 
        }
        showLoading(false);
    })
    .catch(err => { console.error(err); showLoading(false); });
}

function loadSiswa() {
    const kelas = document.getElementById("selectKelas").value;
    const tanggal = document.getElementById("inputTanggal").value;

    if (kelas === "") return showToast("Pilih kelas dulu!", "bg-warning");

    const tglSplit = tanggal.split("-");
    const tglCek = `${tglSplit[2]}/${tglSplit[1]}/${tglSplit[0]}`; 
    if (daftarLibur.includes(tglCek)) {
        if(!confirm("PERINGATAN: Hari ini LIBUR. Lanjut?")) return;
    }

    showLoading(true);
    document.getElementById("panelAbsensi").classList.add("d-none");

    fetch(API_URL + "?action=getSiswa&kelas=" + kelas)
    .then(res => res.json())
    .then(res => {
        if (res.status === "success") {
            renderTabel(res.data);
            document.getElementById("panelAbsensi").classList.remove("d-none");
        } else {
            alert("Error: " + res.message);
        }
        showLoading(false);
    })
    .catch(err => { showLoading(false); alert("Gagal koneksi server."); });
}

function renderTabel(siswaList) {
    const tbody = document.getElementById("tabelSiswaBody");
    tbody.innerHTML = ""; 
    siswaList.forEach((siswa, index) => {
        const row = document.createElement("tr");
        // PERUBAHAN: Menggunakan NIPD
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td><div class="fw-bold">${siswa.nama}</div><small class="text-muted">NIPD: ${siswa.nipd}</small></td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-2">
                    <div class="form-check"><input class="form-check-input status-radio bg-success" type="radio" name="status_${siswa.nipd}" value="H" checked><label class="d-block small fw-bold">H</label></div>
                    <div class="form-check"><input class="form-check-input status-radio bg-warning" type="radio" name="status_${siswa.nipd}" value="S"><label class="d-block small fw-bold">S</label></div>
                    <div class="form-check"><input class="form-check-input status-radio bg-info" type="radio" name="status_${siswa.nipd}" value="I"><label class="d-block small fw-bold">I</label></div>
                    <div class="form-check"><input class="form-check-input status-radio bg-danger" type="radio" name="status_${siswa.nipd}" value="A"><label class="d-block small fw-bold">A</label></div>
                </div>
            </td>
            <td><input type="text" class="form-control form-control-sm" id="ket_${siswa.nipd}"></td>
        `;
        tbody.appendChild(row);
    });
}

function kirimAbsensi() {
    const rows = document.getElementById("tabelSiswaBody").querySelectorAll("tr");
    const kelas = document.getElementById("selectKelas").value;
    const tanggal = document.getElementById("inputTanggal").value;
    let dataSiswa = [];
    let countH = 0;

    rows.forEach(row => {
        // PERUBAHAN: Ambil NIPD dari text small
        const rawText = row.querySelector("small").innerText; 
        const nipd = rawText.replace("NIPD: ", "").trim();
        const nama = row.querySelector(".fw-bold").innerText;
        const statusEl = row.querySelector(`input[name="status_${nipd}"]:checked`);
        const status = statusEl ? statusEl.value : "A";
        const ket = row.querySelector(`#ket_${nipd}`).value;

        if(status === 'H') countH++;
        dataSiswa.push({ nipd: nipd, nama: nama, status: status, keterangan: ket });
    });

    if (dataSiswa.length === 0) return;
    if (!confirm(`Simpan Absensi Kelas ${kelas}?\nHadir: ${countH} Siswa`)) return;

    showLoading(true);
    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "simpanAbsen", tanggal: tanggal, kelas: kelas, data: dataSiswa })
    })
    .then(res => res.json())
    .then(hasil => {
        showLoading(false);
        if (hasil.status === "success") {
            showToast("Berhasil disimpan!", "bg-success");
            document.getElementById("panelAbsensi").classList.add("d-none");
            document.getElementById("selectKelas").value = "";
        } else {
            alert("Gagal: " + hasil.message);
        }
    })
    .catch(err => { showLoading(false); alert("Error jaringan."); });
}

function tarikRekap() {
    const tglMulai = document.getElementById("rekapMulai").value;
    const tglAkhir = document.getElementById("rekapAkhir").value;
    const kelas = document.getElementById("rekapKelas").value;

    if(!tglMulai || !tglAkhir) return alert("Isi tanggal dulu!");

    showLoading(true);
    document.getElementById("panelRekap").classList.add("d-none");

    const params = `?action=getRekap&tglMulai=${tglMulai}&tglAkhir=${tglAkhir}&kelas=${kelas}`;
    
    fetch(API_URL + params)
    .then(res => res.json())
    .then(hasil => {
        showLoading(false);
        if (hasil.status === "success") {
            renderTabelRekap(hasil.data);
            document.getElementById("panelRekap").classList.remove("d-none");
        } else {
            alert("Gagal: " + hasil.message);
        }
    })
    .catch(err => { showLoading(false); alert("Error jaringan."); });
}

function renderTabelRekap(data) {
    const tbody = document.getElementById("tabelRekapBody");
    tbody.innerHTML = ""; 

    if (data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' class='text-center py-3'>Tidak ada data.</td></tr>";
        return;
    }

    data.forEach((siswa, index) => {
        const total = siswa.h + siswa.s + siswa.i + siswa.a;
        let persen = 0;
        if (total > 0) persen = Math.round((siswa.h / total) * 100);
        let badgeColor = persen < 70 ? "bg-danger" : (persen < 90 ? "bg-warning text-dark" : "bg-success");

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="text-start fw-bold">${siswa.nama}</td>
            <td>${siswa.h}</td>
            <td>${siswa.s}</td>
            <td>${siswa.i}</td>
            <td>${siswa.a}</td>
            <td><span class="badge ${badgeColor}">${persen}%</span></td>
        `;
        tbody.appendChild(row);
    });
}

function showLoading(isLoading) {
    document.getElementById("loading").style.display = isLoading ? "flex" : "none";
}
function showToast(msg, color) {
    const toastEl = document.getElementById("toastMessage");
    document.getElementById("toastText").innerText = msg;
    toastEl.className = `toast align-items-center text-white border-0 ${color}`;
    new bootstrap.Toast(toastEl).show();
}
