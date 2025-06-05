const preprocessText = (text) => {
  // Sementara kosong, nanti tambah logika normalisasi (misalnya ganti "t0g3l" jadi "togel")
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ""); // Hapus simbol sederhana
};

module.exports = { preprocessText };
