// --- SETUP AWAL ---
// Mengambil elemen canvas dari HTML untuk menggambar game.
const canvas = document.getElementById('gameCanvas');
// Mendapatkan konteks 2D dari canvas, yang merupakan API untuk menggambar.
const ctx = canvas.getContext('2d');

// --- VARIABEL GLOBAL GAME ---
let gameRunning = false; // Status untuk melacak apakah game sedang berjalan atau tidak.
let score = 0;           // Skor pemain saat ini.
let startTime = 0;       // Waktu saat game dimulai, untuk menghitung durasi.
let currentTime = 0;     // Durasi permainan saat ini.
let animationId;         // ID untuk requestAnimationFrame, digunakan untuk menghentikan loop game.

// --- PENGATURAN USER & HIGH SCORE ---
// Mengambil username dari localStorage, jika tidak ada, gunakan 'Player'.
let username = localStorage.getItem('dinoCurrentUser') || 'Player';
// Mengambil data leaderboard dari localStorage, jika tidak ada, gunakan array kosong.
let leaderboardData = JSON.parse(localStorage.getItem('dinoLeaderboard')) || [];
// Mencari data pemain saat ini di leaderboard.
let userEntry = leaderboardData.find(entry => entry.username === username);
// Mengatur high score pribadi pemain, jika tidak ada, atur ke 0.
let highScore = userEntry ? userEntry.score : 0;


// -------------------- PENGELOLAAN ASET (GAMBAR) --------------------
// Daftar URL gambar yang akan dimuat.
const ASSET_URLS = {
    player: "dino.png",
    obstacle: "tree.png",
    background: "background.jpg",
    ground: "ground.png"
};

// Objek untuk menyimpan gambar yang sudah dimuat.
const ASSET_IMAGES = {};

/**
 * Fungsi untuk memuat semua gambar aset secara asynchronous.
 * Menggunakan Promise untuk memberi tahu kapan semua aset selesai dimuat.
 * @returns {Promise} - Promise yang akan resolve setelah semua aset selesai dimuat.
 */
function loadAssets() {
    let loaded = 0; // Inisialisasi penghitung aset yang sudah dimuat.
    // Menghitung total aset yang perlu dimuat dari objek ASSET_URLS.
    const total = Object.keys(ASSET_URLS).length;
    
    // Mengembalikan Promise agar kode pemanggil tahu kapan semua aset siap.
    return new Promise(resolve => {
        // Iterasi melalui setiap URL aset yang didefinisikan.
        for (let key in ASSET_URLS) {
            const img = new Image(); // Membuat objek gambar HTML baru.
            
            // Menetapkan event handler `onload` yang akan dipanggil ketika gambar selesai dimuat.
            img.onload = () => { 
                ASSET_IMAGES[key] = img; // Menyimpan objek gambar yang sudah dimuat ke dalam cache ASSET_IMAGES.
                loaded++; // Menambah hitungan aset yang sudah dimuat.
                // Jika semua aset sudah dimuat (penghitung `loaded` sama dengan `total`),
                // panggil `resolve()` untuk menandai Promise selesai.
                if (loaded === total) resolve(); 
            };
            // Mengatur sumber (src) gambar untuk memulai pemuatan.
            // Jalur gambar disatukan dengan direktori 'assets/'.
            img.src = "assets/" + ASSET_URLS[key];
        }
    });
}
// -------------------- LOGIKA PEMAIN (PLAYER) --------------------
const groundY = 350; // Posisi Y (vertikal) dari tanah.
// Objek yang merepresentasikan pemain (dino).
const player = { 
    x: 50, y: groundY - 100, // Posisi awal
    width: 70, height: 100,   // Ukuran
    velocityY: 0,             // Kecepatan vertikal (untuk lompat)
    gravity: 0.5,             // Gaya gravitasi yang menarik pemain ke bawah
    jumpPower: -15,           // Kekuatan lompatan (nilai negatif karena sumbu Y ke bawah)
    jumping: false            // Status apakah pemain sedang melompat
};

// Fungsi untuk menggambar pemain (dino) di canvas menggunakan gambar aset.
function drawPlayer() { if (ASSET_IMAGES.player) ctx.drawImage(ASSET_IMAGES.player, player.x, player.y, player.width, player.height); }

// Fungsi untuk membuat pemain melompat dengan mengatur kecepatan vertikal
// dan status jumping agar tidak bisa melompat di udara.
function jump() { if (!player.jumping) { 
    player.jumping = true;
    player.velocityY = player.jumpPower; } }

// Fungsi untuk memperbarui posisi vertikal pemain setiap frame,
// menerapkan gravitasi dan menghentikan lompatan saat menyentuh tanah.
function updatePlayer() {
    player.velocityY += player.gravity;
    player.y += player.velocityY;
    // Mencegah pemain jatuh menembus tanah.
    if (player.y >= groundY - player.height) { player.y = groundY - player.height; player.jumping = false; }
}

// -------------------- LOGIKA LATAR BELAKANG (BACKGROUND) --------------------
let groundX = 0; const groundSpeed = 4;
let cloudX = 0; const cloudSpeed = 1;

// Menggambar latar belakang awan yang bergerak.
function drawClouds() {
    if (!ASSET_IMAGES.background) return;
    cloudX -= cloudSpeed;
    if (cloudX <= -canvas.width) cloudX = 0;
    ctx.drawImage(ASSET_IMAGES.background, cloudX, 0, canvas.width, canvas.height);
    ctx.drawImage(ASSET_IMAGES.background, cloudX + canvas.width, 0, canvas.width, canvas.height);
}
// Menggambar tanah yang bergerak lebih cepat untuk efek parallax.
function drawGround() {
    if (!ASSET_IMAGES.ground) { ctx.fillStyle = "#777"; ctx.fillRect(0, groundY, canvas.width, 50); return; }
    groundX -= groundSpeed;
    if (groundX <= -canvas.width) groundX = 0;
    ctx.drawImage(ASSET_IMAGES.ground, groundX, groundY - 5, canvas.width + 290, 60);
    ctx.drawImage(ASSET_IMAGES.ground, groundX + canvas.width, groundY - 5, canvas.width + 290, 60);
}

// -------------------- LOGIKA RINTANGAN (OBSTACLE) --------------------
let obstacles = []; // Array untuk menyimpan semua rintangan di layar
let obstacleTimer = 0; // Waktu untuk memunculkan rintangan berikutnya
let obstacleInterval = 100; // Interval default untuk rintangan

/**
 * Membuat rintangan baru (pohon dengan ukuran acak).
 */
function createObstacle() { 
    // Tentukan ukuran dasar untuk pohon
    const baseHeight = 110;
    const baseWidth = 70;
    
    // Buat skala acak antara 80% hingga 120%
    const scale = 0.8 + Math.random() * 0.4;
    
    // Hitung ukuran baru berdasarkan skala
    const newHeight = baseHeight * scale;
    const newWidth = baseWidth * scale;
    
    // Tambahkan rintangan baru ke dalam array dengan ukuran yang sudah diacak
    obstacles.push({ 
        x: canvas.width, 
        y: groundY - newHeight, // Sesuaikan posisi Y agar bagian bawah pohon tetap di tanah
        width: newWidth, 
        height: newHeight, 
        speed: 6 + Math.floor(score / 300) 
    }); 
}

/**
 * Menggambar satu rintangan di canvas.
 * @param {object} o - Objek rintangan yang akan digambar.
 */
function drawObstacle(o) { 
    if (ASSET_IMAGES.obstacle) {
        ctx.drawImage( ASSET_IMAGES.obstacle, o.x, o.y, o.width, o.height ); 
    } else {
        // Gambar kotak sebagai placeholder jika gambar gagal dimuat
        ctx.fillStyle = "red";
        ctx.fillRect(o.x, o.y, o.width, o.height);
    }
}

/**
 * Memperbarui posisi rintangan yang ada dan membuat rintangan baru berdasarkan timer.
 */
function updateObstacles() { 
    obstacleTimer++; 
    if (obstacleTimer >= obstacleInterval) { 
        createObstacle(); 
        obstacleTimer = 0; 
    } 
    obstacles.forEach(o => { o.x -= o.speed; }); 
    obstacles = obstacles.filter(o => o.x + o.width > 0); 
}

/**
 * Mengecek tabrakan antara pemain dan rintangan.
 * @returns {boolean} - True jika ada tabrakan, False jika tidak.
 */
function checkCollision() { 
    for (let o of obstacles) { 
        if (player.x < o.x + o.width &&   
            player.x + player.width > o.x && 
            player.y < o.y + o.height &&
            player.y + player.height > o.y) {
            return true; 
        }
    } 
    return false; 
}


// -------------------- PEMBARUAN UI (USER INTERFACE) --------------------
// Fungsi untuk memperbarui tampilan skor dan waktu di UI selama permainan berjalan.
function updateUI() {
    score++;
    currentTime = (Date.now() - startTime) / 1000;
    document.getElementById("score").textContent = score;
    document.getElementById("time").textContent = currentTime.toFixed(1) + "s";
}

// -------------------- KONTROL GAME & LEADERBOARD --------------------
/**
 * Fungsi untuk memulai permainan.
 */
function startGame() {
    if (gameRunning) return; // Mencegah fungsi berjalan jika game sudah berjalan.
    gameRunning = true;
    score = 0;
    obstacles = [];
    startTime = Date.now();
    document.getElementById("gameOver").style.display = "none";
    document.getElementById('highScore').textContent = highScore; // Tampilkan high score pribadi saat game dimulai.
    gameLoop();
}

/**
 * Fungsi untuk memperbarui data leaderboard di localStorage.
 * @param {number} finalScore - Skor akhir yang didapat pemain.
 */
function updateLeaderboard(finalScore) {
    const username = localStorage.getItem('dinoCurrentUser') || 'Anonymous';
    let leaderboard = JSON.parse(localStorage.getItem('dinoLeaderboard')) || [];
    
    const userIndex = leaderboard.findIndex(entry => entry.username === username);

    if (userIndex > -1) {
        // Jika user sudah ada di leaderboard, update skor jika lebih tinggi.
        if (finalScore > leaderboard[userIndex].score) {
            leaderboard[userIndex].score = finalScore;
        }
    } else {
        // Jika user baru, tambahkan entri baru.
        leaderboard.push({ username: username, score: finalScore });
    }

    // Urutkan leaderboard dan simpan kembali ke localStorage.
    leaderboard.sort((a, b) => b.score - a.score);
    localStorage.setItem('dinoLeaderboard', JSON.stringify(leaderboard));

    // Update tampilan high score pribadi jika skor baru lebih tinggi.
    if (finalScore > highScore) {
        highScore = finalScore;
        document.getElementById('highScore').textContent = highScore;
    }
}

/**
 * Fungsi yang dipanggil saat game berakhir.
 */
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId); // Menghentikan loop game.

    // Menampilkan panel game over.
    document.getElementById("finalScore").textContent = score;
    document.getElementById("finalTime").textContent = currentTime.toFixed(1);
    document.getElementById("gameOver").style.display = "block";

    // Memperbarui leaderboard dengan skor akhir.
    updateLeaderboard(score);
}

/**
 * Fungsi untuk memulai ulang permainan.
 */
function restartGame() {
    startGame();
}

// -------------------- GAME LOOP UTAMA --------------------
/**
 * Game loop adalah jantung dari permainan. Fungsi ini dipanggil berulang kali
 * (sekitar 60 kali per detik) untuk memperbarui dan menggambar ulang semua elemen game.
 */
function gameLoop() {
    if (!gameRunning) return; // Hentikan loop jika game tidak berjalan.

    // Membersihkan canvas sebelum menggambar frame baru.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Menggambar semua elemen.
    drawClouds();
    drawGround();
    drawPlayer();
    // Memperbarui posisi elemen.
    updatePlayer();
    updateObstacles();
    // Menggambar rintangan.
    obstacles.forEach(drawObstacle);
    // Cek tabrakan.
    if (checkCollision()) { 
        gameOver(); 
        return; // Hentikan loop ini jika game over.
    }
    // Perbarui UI.
    updateUI();

    // Minta browser untuk memanggil gameLoop lagi di frame berikutnya.
    animationId = requestAnimationFrame(gameLoop);
}


// -------------------- INPUT PENGGUNA --------------------
// Event listener untuk keyboard (tombol spasi).
// Memulai game jika belum berjalan, atau membuat pemain melompat.
document.addEventListener("keydown", e => { if (e.code === "Space") { if (!gameRunning) startGame(); jump(); } });
// Event listener untuk klik mouse/tap pada area canvas.
// Memulai game jika belum berjalan, atau membuat pemain melompat.
canvas.addEventListener("click", () => { if (!gameRunning) startGame(); jump(); });


// -------------------- INISIALISASI GAME --------------------
/**
 * Fungsi yang berjalan sekali saat halaman dimuat untuk menyiapkan game.
 */
async function initializeGame() {
    // Menampilkan teks "Memuat Aset...".
    ctx.fillStyle = "#333";
    ctx.font = "24px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Memuat Aset...", canvas.width / 2, canvas.height / 2);
    
    // Memuat semua gambar.
    await loadAssets();
    
    // Setelah aset dimuat, bersihkan canvas dan gambar tampilan awal.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawClouds();
    drawGround();
    drawPlayer();
    ctx.fillText("Tekan SPASI atau Klik untuk Mulai", canvas.width / 2, canvas.height / 2);
    
    // Tampilkan high score pribadi di awal.
    document.getElementById('highScore').textContent = highScore;
}

// Memulai proses inisialisasi game.
initializeGame();

// Mute button functionality
const music = document.getElementById('background-music');
const muteButton = document.getElementById('mute-button');
let isMuted = localStorage.getItem('isMuted') === 'true';

const updateMuteState = () => {
    // Fungsi ini memperbarui status mute musik berdasarkan variabel isMuted
    // dan mengubah teks tombol mute sesuai status.
    if (isMuted) {
        music.muted = true;
        muteButton.textContent = '🔇';
    } else {
        music.muted = false;
        muteButton.textContent = '🔊';
    }
};

updateMuteState();

muteButton.addEventListener('click', () => {
    // Ketika tombol mute diklik, status isMuted akan dibalik,
    // disimpan ke localStorage, dan status mute musik akan diperbarui.
    isMuted = !isMuted;
    localStorage.setItem('isMuted', isMuted);
    updateMuteState();
});