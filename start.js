// Generate random stars
const starsContainer = document.getElementById('stars-container');
for (let i = 0; i < 20; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 60 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    starsContainer.appendChild(star);
}

/**
 * Fungsi untuk menampilkan leaderboard dari localStorage
 */
function displayLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    const leaderboardData = JSON.parse(localStorage.getItem('dinoLeaderboard')) || [];

    leaderboardList.innerHTML = '';

    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = '<li><span class="username">Belum ada skor.</span></li>';
        return;
    }

    // Urutkan berdasarkan skor tertinggi
    leaderboardData.sort((a, b) => b.score - a.score);

    // Tampilkan top 10
    leaderboardData.slice(0, 10).forEach((entry, index) => {
        const li = document.createElement('li');
        let medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        
        li.innerHTML = `
            <span class="rank">${medal} ${index + 1}.</span>
            <span class="username">${entry.username}</span>
            <span class="score">${entry.score}</span>
        `;
        leaderboardList.appendChild(li);
    });
}

/**
 * Fungsi untuk menangani start game
 */
function handleStart() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();

    if (username) {
        // Simpan username ke localStorage
        localStorage.setItem('dinoCurrentUser', username);
        
        // Redirect ke halaman game
        window.location.href = 'game.html';
    } else {
        // Tampilkan error jika username kosong
        usernameInput.style.borderColor = 'red';
        setTimeout(() => {
            usernameInput.style.borderColor = '#ddd';
        }, 1000);
        alert('Username tidak boleh kosong!');
    }
}

// Event listener saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Tampilkan leaderboard
    displayLeaderboard();
    
    // Event listener untuk tombol start
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', handleStart);

    // Event listener untuk Enter key pada input
    const usernameInput = document.getElementById('username-input');
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleStart();
        }
    });
});a