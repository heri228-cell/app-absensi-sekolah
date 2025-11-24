// =======================================================
// FULL SCRIPT OTAR (LOGIKA INPUT & REKAP)
// =======================================================

// ⚠️ PASTE URL ANDA DI BAWAH INI (Di dalam tanda kutip)
const API_URL = "https://script.google.com/macros/s/AKfycbzKAFI3DgcHb6tyTq275DhwTUD9AKViehn7yICsa-O1XKt5XrH1nGmPIxBIKpOdMZnh/exec"; 

// Variabel Global
let daftarLibur = []; 

// 1. SAAT HALAMAN DIBUKA (ON LOAD)
document.addEventListener("DOMContentLoaded", function() {
    // Set tanggal hari ini di input
    const today = new Date().toISOString().split('T')[0];
    const inputTgl = document.getElementById("inputTanggal");
    if(inputTgl) inputTgl.value = today;

    // Ambil Data Config
    fetchConfig();
});

// 2. FUNGSI AMBIL CONFIG
function fetchConfig() {
    showLoading(true);
    fetch(API_URL + "?action=getConfig")
    .then(response => response.json())
    .then(data => {
        if(data.status === "success") {
            const info = `Tahun Ajaran: <b>${data.config.Tahun_Ajaran}</b> | Semester: <b>${data.config.Semester}</b>`;
            document.getElementById("infoTahunAjaran").innerHTML = info;
            daftarLibur = data.hari_libur; 
        }
        showLoading(false);
    })
    .catch(err => {
        console.error(err);
        showLoading(false);
        alert("Gagal mengambil data konfigurasi!");
    });
}

// 3. FUNGSI TAMPILKAN SISWA (INPUT)
function loadSiswa() {
    const kelas = document.getElementById("selectKelas").value;
    const tanggal = document.getElementById("inputTanggal").value;

    if (kelas === "") {
        showToast("Pilih kelas dulu bos!", "bg-warning");
        return;
    }

    const tglSplit = tanggal.split("-");
    const tglCek = `${tglSplit[2]}/${tglSplit[1]}/${tglSplit[0]}`; 

    if (daftarLibur.includes(tglCek)) {
        const yakin = confirm("PERINGATAN: Tanggal ini tercatat sebagai HARI LIBUR.\n\nYakin mau tetap absen?");
        if (!yakin) return;
    }

    showLoading(true);
    document.getElementById("panelAbsensi").classList.add("d-none");

    fetch(API_URL + "?action=getSiswa&kelas=" + kelas)
    .then(response => response.json())
    .then(response => {
        if (response.status === "success") {
            renderTabel(response.data);
            document.getElementById("labelKelas").innerText = "Kelas " + kelas;
            document.getElementById("panelAbsensi").classList.remove("d-none");
        } else {
            alert("Error: " + response.message);
        }
        showLoading(false);
    })
    .catch(err => {
        console.error(err);
        showLoading(false);
        alert("Gagal koneksi ke server.");
    });
}

function renderTabel(siswaList) {
    const tbody = document.getElementById("tabelSiswaBody");
    tbody.innerHTML = ""; 

    siswaList.forEach((siswa, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>
                <div class="fw-bold">${siswa.nama}</div>
                <small class="text-muted">${siswa.nisn}</small>
            </td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-2">
                    <div class="form-check"><input class="form-check-input status-radio bg-success" type="radio" name="status_${siswa.nisn}" value="H" checked><label class="d-block small fw-bold">H</label></div>
                    <div class="form-check"><input class="form-check-input status-radio bg-warning" type="radio" name="status_${siswa.nisn}" value="S"><label class="d-block small fw-bold">S</label></div>
                    <div class="form-check"><input class="form-check-input status-radio bg-info" type="radio" name="status_${siswa.nisn}" value="I"><label class="d-block small fw-bold">I</label></div>
                    <div class="form-check"><input class="form-check-input status-radio bg-danger" type="radio" name="status_${siswa.nisn}" value="A"><label class="d-block small fw-bold">A</label></div>
                </div>
            </td>
            <td><input type="text" class="form-control form-control-sm" id="ket_${siswa.nisn}" placeholder="Ket."></td>
        `;
        tbody.appendChild(row);
    });
}

// 4. KIRIM DATA KE GOOGLE SHEET
function kirimAbsensi() {
    const tableRows = document.getElementById("tabelSiswaBody").querySelectorAll("tr");
    const kelas = document.getElementById("selectKelas").value;
    const tanggal = document.getElementById("inputTanggal").value;

    let dataSiswa = [];
    let countH = 0;

    tableRows.forEach(row => {
        const nisn = row.querySelector("small").innerText; 
        const nama = row.querySelector(".fw-bold").innerText;
        const statusEl = row.querySelector(`input[name="status_${nisn}"]:checked`);
        const status = statusEl ? statusEl.value : "A";
        const ket = row.querySelector(`#ket_${nisn}`).value;

        if(status === 'H') countH++;

        dataSiswa.push({ nisn: nisn, nama: nama, status: status, keterangan: ket });
    });

    if (dataSiswa.length === 0) return;
    const konfirmasi = confirm(`Simpan Absensi Kelas ${kelas}?\n\nHadir: ${countH} Siswa\nTotal: ${dataSiswa.length} Siswa`);
    if (!konfirmasi) return;

    const paketData = { action: "simpanAbsen", tanggal: tanggal, kelas: kelas, data: dataSiswa };

    showLoading(true);
    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(paketData)
    })
    .then(response => response.json())
    .then(hasil => {
        showLoading(false);
        if (hasil.status === "success") {
            showToast("Berhasil! Data tersimpan.", "bg-success");
            document.getElementById("panelAbsensi").classList.add("d-none");
            document.getElementById("selectKelas").value = "";
        } else {
            alert("Gagal menyimpan: " + hasil.message);
        }
    })
    .catch(err => {
        showLoading(false);
        console.error(err);
        alert("Terjadi kesalahan jaringan.");
    });
}

// 5. TARIK REKAP (LAPORAN)
function tarikRekap() {
    const bulan = document.getElementById("rekapBulan").value;
    const tahun = document.getElementById("rekapTahun").value;
    const kelas = document.getElementById("rekapKelas").value;

    showLoading(true);
    document.getElementById("panelRekap").classList.add("d-none");

    const params = `?action=getRekap&bulan=${bulan}&tahun=${tahun}&kelas=${kelas}`;
    
    fetch(API_URL + params)
    .then(response => response.json())
    .then(hasil => {
        showLoading(false);
        if (hasil.status === "success") {
            renderTabelRekap(hasil.data);
            document.getElementById("panelRekap").classList.remove("d-none");
        } else {
            alert("Gagal menarik rekap: " + hasil.message);
        }
    })
    .catch(err => {
        showLoading(false);
        console.error(err);
        alert("Kesalahan jaringan.");
    });
}

function renderTabelRekap(data) {
    const tbody = document.getElementById("tabelRekapBody");
    tbody.innerHTML = ""; 

    if (data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' class='text-center py-3'>Belum ada data absensi di bulan ini.</td></tr>";
        return;
    }

    data.forEach((siswa, index) => {
        const total = siswa.h + siswa.s + siswa.i + siswa.a;
        let persen = 0;
        if (total > 0) persen = Math.round((siswa.h / total) * 100);

        let badgeColor = "bg-success";
        if (persen < 70) badgeColor = "bg-danger";
        else if (persen < 90) badgeColor = "bg-warning text-dark";

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

// UTILITIES
function showLoading(isLoading) {
    const loading = document.getElementById("loading");
    if (isLoading) loading.style.display = "flex";
    else loading.style.display = "none";
}

function showToast(message, colorClass) {
    const toastEl = document.getElementById("toastMessage");
    const toastBody = document.getElementById("toastText");
    toastEl.className = `toast align-items-center text-white border-0 ${colorClass}`;
    toastBody.innerText = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
