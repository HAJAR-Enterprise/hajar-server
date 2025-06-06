Hajar Project Backend
Backend sederhana untuk manajemen komentar YouTube menggunakan autentikasi Google OAuth dan Firestore.
Apa Itu Proyek Ini?
Proyek ini adalah backend untuk mengelola komentar di YouTube. Kamu bisa login dengan akun Google, ambil daftar komentar, dan hapus komentar (maksimal 50 sekaligus). Token disimpan aman di Firestore dengan enkripsi. Rencananya, akan ada analisis komentar pakai IndoBERT (tunggu tim selesai).
Yang Dibutuhkan

Node.js (versi 14 atau lebih baru)
Akun Google Cloud (untuk YouTube API)
Akun Firebase (untuk Firestore)

Cara Pasang

Ambil Kode Ini
git clone https://github.com/username/hajar-project.git
cd hajar-project/backend


Install Paket
npm install


Buat File .env

Salin .env.example jadi .env:cp .env.example .env


Isi file .env dengan informasi berikut:# YouTube API Credentials (dari Google Cloud Console)
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/login/callback

# Firebase Config (dari Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key-replace-newlines"
FIREBASE_CLIENT_EMAIL=your-client-email

# Encryption Key (untuk refresh_token)
ENCRYPTION_KEY=your-64-char-random-hex-key

# Port
PORT=3000


Penjelasan .env:
YOUTUBE_CLIENT_ID dan YOUTUBE_CLIENT_SECRET: Ambil dari Google Cloud Console → APIs & Services → Credentials → Buat OAuth Client ID.
YOUTUBE_REDIRECT_URI: Harus sama persis dengan yang diatur di Google Cloud Console (default: http://localhost:3000/api/login/callback).
FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL: Ambil dari Firebase Console → Project Settings → Service Accounts → Generate New Private Key.
ENCRYPTION_KEY: Buat kunci acak dengan perintah:node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"


PORT: Port server (default: 3000).




Jalankan Server
node src/main.js

Atau pakai Nodemon biar otomatis restart kalau ada perubahan:
npm install -g nodemon
nodemon src/main.js

Server akan jalan di http://localhost:3000.


Cara Pakai

Login

Buka http://localhost:3000/api/login di browser.
Login pakai akun Google.
Setelah berhasil, kamu akan dapat access_token dari response di /api/login/callback.


Ambil Komentar

Gunakan token dari login untuk request:
URL: http://localhost:3000/api/{channelId}/{videoId}/comments
Metode: GET
Header: Authorization: Bearer your-access-token


Ganti {channelId} dan {videoId} dengan ID channel dan video YouTube.


Hapus Komentar

Hapus satu komentar:
URL: http://localhost:3000/api/{channelId}/{videoId}/{commentId}
Metode: DELETE
Header: Authorization: Bearer your-access-token


Hapus semua (maks 50):
URL: http://localhost:3000/api/{channelId}/{videoId}/comments
Metode: DELETE
Header: Authorization: Bearer your-access-token




Logout

URL: http://localhost:3000/api/logout
Metode: POST
Header: Authorization: Bearer your-access-token



Catatan

Proyek ini masih dalam pengembangan.
Fitur analisis komentar dengan IndoBERT belum selesai (tunggu tim).
Pastikan .env tidak diupload ke GitHub (sudah diabaikan di .gitignore).

