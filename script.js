// =======================================================
// KONFIGURASI UTAMA
// Silakan paste URL Script Google kamu di bawah ini
// =======================================================
const API_URL = "https://script.google.com/macros/s/AKfycbzav3FXwxZII7Al_dtqSYriy5o1YTV2JifXcC48ZYWHmSlFH5QGrIsp_EO_NjlHND3_/exec"; 


// Variabel Global
let daftarLibur = []; 

// 1. SAAT HALAMAN DIBUKA (ON LOAD)
document.addEventListener("DOMContentLoaded", function() {
    // Set tanggal hari ini di input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("inputTanggal").value = today;

    // Ambil Data Config (Tahun Ajaran & Libur)
    fetchConfig();
});

// 2. FUNGSI AMBIL CONFIG
function fetchConfig() {
    showLoading(true);
    fetch(API_URL + "?action=getConfig")
    .then(response => response.json())
    .then(data => {
        if(data.status === "success") {
            // Tampilkan Info Tahun Ajaran
            const info = `Tahun Ajaran: <b>${data.config.Tahun_Ajaran}</b> | Semester: <b>${data.config.Semester}</b>`;
            document.getElementById("infoTahunAjaran").innerHTML = info;
            
            // Simpan daftar libur ke memori
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

// 3. FUNGSI TAMPILKAN SISWA (TOMBOL KLIK)
function loadSiswa() {
    const kelas = document.getElementById("selectKelas").value;
    const tanggal = document.getElementById("inputTanggal").value;

    if (kelas === "") {
        showToast("Pilih kelas dulu bos!", "bg-warning");
        return;
    }

    // Cek Apakah Hari Libur?
    // Ubah format yyyy-mm-dd ke dd/MM/yyyy untuk pengecekan
    const tglSplit = tanggal.split("-");
    const tglCek = `${tglSplit[2]}/${tglSplit[1]}/${tglSplit[0]}`; // dd/mm/yyyy

    if (daftarLibur.includes(tglCek)) {
        const yakin = confirm("PERINGATAN: Tanggal ini tercatat sebagai HARI LIBUR di sistem.\n\nYakin mau tetap absen?");
        if (!yakin) return;
    }

    // Ambil Data Siswa
    showLoading(true);
    document.getElementById("panelAbsensi").classList.add("d-none"); // Sembunyikan dulu

    fetch(API_URL + "?action=getSiswa&kelas=" + kelas)
    .then(response => response.json())
    .then(response => {
        if (response.status === "success") {
            renderTabel(response.data);
            document.getElementById("labelKelas").innerText = "Kelas " + kelas;
            document.getElementById("panelAbsensi").classList.remove("d-none"); // Munculkan
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

// 4. RENDER TABEL (MUNCULKAN BARIS SISWA)
function renderTabel(siswaList) {
    const tbody = document.getElementById("tabelSiswaBody");
    tbody.innerHTML = ""; // Bersihkan isi lama

    siswaList.forEach((siswa, index) => {
        const row = document.createElement("tr");
        
        // Logika Radio Button: Name harus unik per siswa (pake NISN)
        // Default Checked = H (Hadir)
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>
                <div class="fw-bold">${siswa.nama}</div>
                <small class="text-muted">${siswa.nisn}</small>
            </td>
            <td class="text-center">
                <div class="d-flex justify-content-center gap-2">
                    <div class="form-check">
                        <input class="form-check-input status-radio bg-success" type="radio" name="status_${siswa.nisn}" value="H" checked title="Hadir">
                        <label class="d-block small fw-bold">H</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input status-radio bg-warning" type="radio" name="status_${siswa.nisn}" value="S" title="Sakit">
                        <label class="d-block small fw-bold">S</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input status-radio bg-info" type="radio" name="status_${siswa.nisn}" value="I" title="Izin">
                        <label class="d-block small fw-bold">I</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input status-radio bg-danger" type="radio" name="status_${siswa.nisn}" value="A" title="Alpha">
                        <label class="d-block small fw-bold">A</label>
                    </div>
                </div>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm" id="ket_${siswa.nisn}" placeholder="Ket.">
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 5. KIRIM DATA KE GOOGLE SHEET
function kirimAbsensi() {
    const tableRows = document.getElementById("tabelSiswaBody").querySelectorAll("tr");
    const kelas = document.getElementById("selectKelas").value;
    const tanggal = document.getElementById("inputTanggal").value;

    let dataSiswa = [];
    let countH = 0; // Hitung jumlah hadir buat laporan singkat

    // Loop setiap baris tabel
    tableRows.forEach(row => {
        // Ambil NISN dari teks kecil
        const nisn = row.querySelector("small").innerText; 
        const nama = row.querySelector(".fw-bold").innerText;
        
        // Cari Radio Button yang dicentang
        const statusEl = row.querySelector(`input[name="status_${nisn}"]:checked`);
        const status = statusEl ? statusEl.value : "A"; // Default A kalau error
        
        const ket = row.querySelector(`#ket_${nisn}`).value;

        if(status === 'H') countH++;

        dataSiswa.push({
            nisn: nisn,
            nama: nama,
            status: status,
            keterangan: ket
        });
    });

    // Validasi
    if (dataSiswa.length === 0) return;
    const konfirmasi = confirm(`Simpan Absensi Kelas ${kelas}?\n\nHadir: ${countH} Siswa\nTotal: ${dataSiswa.length} Siswa`);
    if (!konfirmasi) return;

    // Siapkan Paket Data
    const paketData = {
        action: "simpanAbsen",
        tanggal: tanggal,
        kelas: kelas,
        data: dataSiswa
    };

    showLoading(true);

    // Kirim POST Request
    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(paketData) // Kirim sebagai Text/String JSON
    })
    .then(response => response.json())
    .then(hasil => {
        showLoading(false);
        if (hasil.status === "success") {
            showToast("Berhasil! Data tersimpan.", "bg-success");
            // Reset tabel agar tidak double input
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
