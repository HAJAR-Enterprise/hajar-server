# Hajar Project Backend

  

Backend sederhana untuk manajemen komentar YouTube menggunakan autentikasi Google OAuth dan Firestore.

  

## Tentang Proyek Ini?

  

Proyek ini adalah backend untuk mengelola komentar di YouTube. Kamu bisa login dengan akun Google, ambil daftar komentar, dan hapus komentar (maksimal 50 sekaligus). Token disimpan aman di Firestore dengan enkripsi. Rencananya, akan ada analisis komentar pakai IndoBERT (tunggu tim selesai).

  

## Yang Dibutuhkan

  

- Node.js (versi 14 atau lebih baru)

- Akun Google Cloud (untuk YouTube API)

- Akun Firebase (untuk Firestore)

  

## API Dokumentation

https://documenter.getpostman.com/view/8931846/2sB2x2LagF

  

## Cara Pasang

  

1. **Ambil Kode Ini**

```bash

git clone https://github.com/username/hajar-project.git

cd hajar-project/backend

```

2. **Install Paket**

```bash

npm install

```

3. **Buat File `.env`**

- Salin `.env.example` jadi `.env`:

```bash

cp .env.example .env

```

- Isi file `.env` dengan informasi berikut:

```

# YouTube API Credentials (dari Google Cloud Console)

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

```

- **Penjelasan `.env`**:

- `YOUTUBE_CLIENT_ID` dan `YOUTUBE_CLIENT_SECRET`: Ambil dari Google Cloud Console → APIs & Services → Credentials → Buat OAuth Client ID.

- `YOUTUBE_REDIRECT_URI`: Harus sama persis dengan yang diatur di Google Cloud Console (default: `http://localhost:3000/api/login/callback`).

- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`: Ambil dari Firebase Console → Project Settings → Service Accounts → Generate New Private Key.

- `ENCRYPTION_KEY`: Buat kunci acak dengan perintah:

```bash

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

```

- `PORT`: Port server (default: 3000).

4. **Jalankan Server**

```bash

node src/main.js

```

Atau pakai Nodemon biar otomatis restart kalau ada perubahan:

```bash

npm install -g nodemon

nodemon src/main.js

```

Server akan jalan di `http://localhost:3000`.

  

## Cara Pakai

  

1. **Login**

- Buka `http://localhost:3000/api/login` di browser.

- Login pakai akun Google.

- Setelah berhasil, kamu akan dapat `access_token` dari response di `/api/login/callback`.

2. **Ambil Komentar**

- Gunakan token dari login untuk request:

- **URL**: `http://localhost:3000/api/{channelId}/{videoId}/comments`

- **Metode**: GET

- **Header**: `Authorization: Bearer your-access-token`

- Ganti `{channelId}` dan `{videoId}` dengan ID channel dan video YouTube.

3. **Hapus Komentar**

- Hapus satu komentar:

- **URL**: `http://localhost:3000/api/{channelId}/{videoId}/{commentId}`

- **Metode**: DELETE

- **Header**: `Authorization: Bearer your-access-token`

- Hapus semua (maks 50):

- **URL**: `http://localhost:3000/api/{channelId}/{videoId}/comments`

- **Metode**: DELETE

- **Header**: `Authorization: Bearer your-access-token`

4. **Logout**

- **URL**: `http://localhost:3000/api/logout`

- **Metode**: POST

- **Header**: `Authorization: Bearer your-access-token`

  
## **Deskripsi Endpoint**

### **1. GET /api/login**

- **Deskripsi**: Endpoint ini digunakan untuk memulai proses autentikasi pengguna. Ketika diakses, sistem akan mengarahkan (redirect) pengguna ke halaman login (misalnya OAuth dengan Google atau YouTube) untuk mendapatkan token akses. Ini adalah langkah awal untuk mengautentikasi pengguna sebelum mengakses data channel atau video.
- **Alur**:
    - Pengguna mengakses endpoint ini.
    - Sistem melakukan redirect ke halaman login eksternal.
- **Response**:
    - Redirect ke URL login (contoh: Google OAuth consent screen).
- **Catatan**: Endpoint ini biasanya memerlukan konfigurasi redirect URI di backend dan penyedia autentikasi.

### **2. GET /api/channel**

- **Deskripsi**: Endpoint ini digunakan untuk mengakses data channel YouTube setelah autentikasi. Sistem akan memeriksa validitas token yang diberikan oleh pengguna. Jika token valid, endpoint akan mengambil data semua channel yang tersedia untuk pengguna tersebut.
- **Alur**:
    - Pengguna mengakses endpoint dengan token.
    - Sistem melakukan Check Validasi Token.
    - Jika valid, mengambil data channel; jika tidak, redirect ke /login atau proses refresh token.
- **Response**:
    - Jika valid: Data channel dalam bentuk JSON (misalnya daftar channel yang terkait dengan akun).
    - Jika tidak valid: Redirect atau pesan error.
- **Catatan**: Token hanya berlaku dalam 1 jam (sesuai catatan di flowchart), jadi perlu penanganan refresh.

### **3. GET /api/channelId/video**

- **Deskripsi**: Endpoint ini digunakan untuk mengakses metadata video dari channel tertentu berdasarkan channelId. Setelah validasi token, sistem akan mengambil semua video yang tersedia dari channel tersebut.
- **Alur**:
    - Pengguna mengakses endpoint dengan channelId dan token.
    - Sistem melakukan Check Validasi Token.
    - Jika valid, mengambil metadata video; jika tidak, redirect ke proses autentikasi.
- **Response**:
    - Jika valid: Metadata video (misalnya judul, ID, dll.) dalam JSON.
    - Jika tidak valid: Redirect atau pesan error.
- **Catatan**: Endpoint ini berguna untuk listing video sebelum sync komentar.

### **4. GET /api/channelId/videoId/comments**

- **Deskripsi**: Endpoint ini digunakan untuk mengambil dan mengelola komentar dari video tertentu berdasarkan channelId dan videoId. Setelah validasi token, sistem mengambil semua komentar yang tersedia, mengirimkannya ke bagian Machine Learning untuk analisis, lalu menyimpan dan menampilkan hasilnya.
- **Alur**:
    - Pengguna mengakses endpoint dengan channelId dan videoId serta token.
    - Sistem melakukan Check Validasi Token.
    - Jika valid, mengambil komentar, mengirim ke ML, menyimpan hasil (hanya "judi" ke Firestore), dan mengembalikan response.
- **Response**:
    - Data komentar yang terdeteksi sebagai "judi" dalam JSON.
- **Catatan**: Integrasi dengan ML dilakukan di sini, dan hanya komentar "judi" yang disimpan ke database.

### **5. DELETE /api/channelId/videoId/commentId**

- **Deskripsi**: Endpoint ini digunakan untuk menghapus komentar tertentu dari database berdasarkan channelId, videoId, dan commentId, atau mengubah statusnya (misalnya jadi "deleted" atau "hidden"). Setelah validasi token, sistem memeriksa apakah komentar tersedia, lalu melakukan penghapusan atau perubahan status menggunakan YouTube API.
- **Alur**:
    - Pengguna mengakses endpoint dengan channelId, videoId, dan commentId serta token.
    - Sistem melakukan Check Validasi Token.
    - Jika valid, memeriksa komentar, menghapusnya dari YouTube API, mengubah status di Firestore, dan mengembalikan response.
- **Response**:
    - Konfirmasi penghapusan atau perubahan status dalam JSON.
- **Catatan**: Endpoint ini juga bisa digunakan untuk mengelola status komentar (misalnya dari "pending" ke "deleted").
### **6. DELETE /api/v1/channelId/videoId/comments**

- **Deskripsi**: Endpoint ini digunakan untuk menghapus semua komentar yang terkait dengan video tertentu berdasarkan channelId dan videoId dari database, dengan validasi token terlebih dahulu. Setelah validasi, sistem mengakses komentar yang sudah disimpan, menghapusnya menggunakan YouTube API, mengubah status komentar menjadi "deleted" atau "hidden" di Firestore, dan mengembalikan response konfirmasi.
- **Alur**:
    - Pengguna mengakses endpoint dengan channelId dan videoId serta token.
    - Sistem melakukan Check Validasi Token.
    - Jika valid, mengakses komentar yang sudah disimpan di database.
    - Sistem menghapus komentar menggunakan YouTube API.
    - Status komentar diubah menjadi "deleted" atau "hidden" di Firestore.
    - Mengembalikan response konfirmasi.
    - Jika tidak valid atau tidak ada komentar, redirect ke proses autentikasi atau kembalikan pesan error.
- **Response**:
    - Jika berhasil: JSON dengan pesan konfirmasi (misalnya { "message": "All comments deleted successfully" }).
    - Jika gagal: Pesan error (misalnya { "error": "Invalid token or no comments found" }) dengan status code 400 atau 401.
- **Catatan**:
    - Endpoint ini berbeda dari DELETE /api/v1/channelId/videoId/commentId yang fokus ke penghapusan satu komentar spesifik.
    - Pastikan ada pengecekan apakah komentar sudah ada di Firestore sebelum penghapusan, dan hanya hapus yang bukan "deleted" atau "hidden" (sesuai logika sebelumnya)

## Catatan

- Proyek ini masih dalam pengembangan.

- Pastikan `.env` tidak diupload ke GitHub (sudah diabaikan di `.gitignore`).