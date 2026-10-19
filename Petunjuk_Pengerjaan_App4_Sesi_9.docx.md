# **Petunjuk Pengerjaan App 4: Bengkel Cemerlang Jaya Motor**

Bootcamp AI Web Programming · Sesi 9 · Kerja kelompok

## **Apa yang Dibangun Hari Ini?**

Hari ini kamu bekerja dalam **kelompok empat orang** untuk membangun aplikasi manajemen Bengkel Cemerlang Jaya Motor. Aplikasi ini mencatat perjalanan satu mobil di bengkel dalam satu *work order* (WO): dari mobil datang, dikerjakan, diperiksa, ditagih, sampai diambil pemiliknya.

**Situasinya.** Mentor sudah menyiapkan *starter* di GitHub. Pondasi aplikasi sudah jadi:

* login, *route guard*, dan sidebar per peran;

* semua tabel, aturan akses (RLS), dan data contoh;

* halaman Pelanggan dan Tim Mekanik sebagai contoh pola.

Halaman empat fitur sudah ada, tetapi **baru kerangka**. Isinya hanya tulisan “Halaman ini belum dibangun”.

**Tugas kelompokmu:**

1. Menyiapkan repo GitHub dan proyek Supabase kelompok.

2. Membagi empat fitur. Setiap anggota memegang satu fitur.

3. Membangun *database function* dan halaman fitur masing-masing di *branch* sendiri.

4. Menggabungkan keempat fitur ke main lewat *pull request*.

5. Menguji alur lengkap bersama, lalu diuji kelompok lain.

6. Menayangkan aplikasi ke Netlify.

Semua *prompt* yang disebut di petunjuk ini ada di dokumen **Daftar Prompt App 4**.

## **Jadwal dan Alur Kerja**

| Waktu | Tahap | Hasil yang dicapai | *Prompt* |
| :---- | :---- | :---- | :---- |
| 10.15 | Membentuk kelompok | Pembagian fitur dan ketua sudah jelas |  |
| 10.25 | Persiapan | Starter berjalan di laptop setiap anggota, database berisi data contoh | K1, K2, 0, *Branch* |
| 11.00 | Fitur: *database function* | Fungsi fiturmu terpasang di database bersama | A1, B1, C1, D1 |
| 12.00 | ISOMA | *Commit* dulu sebelum istirahat |  |
| 13.00 | Fitur: halaman | Halaman fiturmu berfungsi dan lolos uji | A2, B2, C2, D2, D3 |
| 14.15 | *Pull request* dan *review* | Keempat fitur masuk main | *Push*, Coba, Tarik Main |
| 14.45 | Integrasi | Satu kunjungan mobil berjalan dari awal sampai akhir | Konflik, bila perlu |
| 15.15 | Uji silang | Laporan temuan dari kelompok lain |  |
| 15.40 | Tayang | Aplikasi terbuka di URL Netlify | Tayang |

## **Bahan yang Dipakai**

| Bahan | Keterangan |
| :---- | :---- |
| Repo *starter* | [https\://github.com/rohmatramadhan/APP4-bengkel-cemerlang-jaya.git](https://github.com/rohmatramadhan/APP4-bengkel-cemerlang-jaya.git)  |
| docs/PRD.md | PRD lengkap App 4\. Agen membacanya sebelum bekerja |
| AGENTS.md | Aturan kerja agen, termasuk aturan kerja kelompok |
| Daftar Prompt App 4 | Semua *prompt* yang disalin ke agen |
| Akun GitHub dan Supabase | Dipakai untuk menerima undangan dari ketua |
| Supabase MCP | Sudah dipasang di Sesi 8\. Token yang sama tetap dipakai |

## **Pembagian Peran di Kelompok**

Setiap anggota memegang satu fitur. Salah satu anggota juga menjadi ketua.

| Fitur | Halaman yang dilengkapi | *Database function* dan lainnya | *Branch* |
| :---- | :---- | :---- | :---- |
| A. *Work Order* | /work-orders, /work-orders/baru, /work-orders/\[id\] | buat\_work\_order, tugaskan\_mekanik, ubah\_status\_wo, *trigger* jaga\_wo, *bucket* foto-wo | fitur/work-order |
| B. Tagihan dan *Invoice* | /work-orders/\[id\]/tagihan, /work-orders/\[id\]/invoice | tambah\_item\_tagihan, hapus\_item\_tagihan, sesuaikan\_harga\_item, atur\_diskon, terbitkan\_invoice, catat\_pembayaran | fitur/tagihan |
| C. Inventory dan Pengguna | /inventory, /pengguna, /setelan | catat\_stok\_masuk, sesuaikan\_stok, *bucket* publik | fitur/inventory |
| D. *Dashboard* dan *Audit Log* | /dashboard, /audit-log, /laporan-laba | isi dashboard.sql, *trigger* catat\_audit | fitur/dashboard |

**Tugas tambahan ketua:**

1. Menyiapkan repo GitHub dan proyek Supabase kelompok.

2. Memimpin cek singkat pukul 11.30 dan 13.45.

3. Menggabungkan *pull request* ke main.

4. Menayangkan aplikasi ke Netlify.

Ketua tetap mengerjakan satu fitur.

## **Aturan Kerja Kelompok**

**Kode.** Setiap fitur dikerjakan di *branch*\-nya sendiri dan hanya mengubah folder halamannya sendiri. Bila perlu mengubah file bersama, misalnya sidebar, sampaikan dulu ke kelompok.

**Database.** Kode punya *branch*, tetapi database tidak. Keempat anggota memakai satu proyek Supabase yang sama, jadi perubahan seseorang langsung terasa oleh semua. Karena itu:

1. Sampaikan ke kelompok sebelum menyetujui SQL dari agen, misalnya: “Aku mau menyetujui fungsi tagihan, ya.”

2. Minta agen menyimpan SQL yang berhasil ke supabase/migrations/fitur\_\<nama\>.sql, supaya ikut terlihat di *pull request*.

3. Jangan membuat, mengubah, atau menghapus tabel. Tabel sudah lengkap di *starter*.

4. Setelah ada perubahan database, buat ulang src/types/database.ts lewat agen.

**Kabar.** Kelompok duduk berdekatan, jadi kabar disampaikan langsung di tiga saat ini:

* sebelum mengubah database;

* saat terhambat;

* saat *pull request* siap.

Pada pukul 11.30 dan 13.45, ketua memimpin cek singkat tiga menit. Setiap anggota menyebut apa yang **sudah**, apa yang **sedang** dikerjakan, dan apa yang **menghambat**.

## **Langkah 1: Persiapan Ketua**

Ketua mengerjakan langkah ini sementara anggota lain menyiapkan laptopnya.

1. Buka repo *starter* di GitHub, klik **Use this template › Create a new repository**. Beri nama cemerlang-jaya-k1, sesuaikan dengan nomor kelompok.

2. Di repo baru, buka **Settings › Collaborators**, lalu undang tiga anggota lewat nama pengguna GitHub mereka.

3. Di supabase.com, buat proyek baru bernama cemerlang-jaya-k1, region Singapore. Paket gratis hanya mengizinkan dua proyek aktif, jadi jeda proyek latihan Sesi 8 bila perlu.

4. Buka **Organization › Team › Invite**, undang tiga anggota sebagai **Administrator**.

5. *Clone* repo kelompok ke Local Disk D, buka foldernya di Antigravity, lalu kirim **Prompt K1**.

6. Di Supabase, buka **Authentication › Users › Add user › Create new user**. Buat empat akun uji (Bagian Akun Uji) dengan kata sandi Bengkel123\! dan centang **Auto Confirm User**.

7. Kirim **Prompt K2**.

8. Sampaikan ke kelompok: “Database siap.”

9. Kirim **Prompt Branch** dengan *branch* fiturmu.

**Cek hasil:**

* ☐ Agen melaporkan 12 baris di work\_orders.

* ☐ Di localhost:3000, Pak Darto bisa masuk dan sidebar berisi sembilan menu.

## **Langkah 2: Persiapan Anggota**

1. Buka email, terima undangan dari GitHub dan dari Supabase.

2. *Clone* repo kelompok ke Local Disk D, lalu buka di Antigravity.

3. Pastikan Supabase di daftar MCP Servers aktif. Token dari Sesi 8 tetap dipakai, dan setelah undangan diterima token itu bisa mengakses proyek kelompok.

4. Tunggu ketua menyampaikan “Database siap”, lalu kirim **Prompt 0**.

5. Kirim **Prompt Branch**. Ganti fitur/tagihan dengan *branch* fiturmu.

6. Masuk sebagai Pak Darto di localhost:3000 untuk memastikan semua berjalan.

**Cek hasil:**

* ☐ Agen menyebut *branch* yang aktif sesuai fiturmu.

* ☐ Halaman fiturmu menampilkan “Halaman ini belum dibangun”.

## **Langkah 3: Mengerjakan Fitur**

Setiap anggota mengikuti pola yang sama:

1. Kirim *prompt database function* fiturmu (A1, B1, C1, atau D1).

2. Agen membaca PRD dan menampilkan SQL. Agen belum menjalankannya.

3. Baca SQL itu dengan daftar periksa di bawah.

4. Sampaikan ke kelompok, lalu setujui. Agen menjalankan SQL dan menyimpannya ke folder supabase/migrations.

5. Kirim *prompt* halaman fiturmu.

6. Uji dengan akun yang sesuai, lalu *commit* di *branch* fiturmu.

**Daftar periksa SQL.** Sebelum menyetujui, cari empat hal ini:

1. **Fungsi aman:** ada security definer dan set search\_path \= ''.

2. **Peran diperiksa di awal:** lewat private.peran\_saya(), sebelum mengubah apa pun.

3. **Baris dikunci:** ada for update pada data yang bisa direbut, misalnya stok dan nomor *invoice*.

4. **Nama sama dengan PRD:** nama fungsi dan parameternya persis PRD 9.2.

Tolak SQL yang membuat, mengubah, atau menghapus tabel. Minta agen memperbaikinya.

### **Fitur A: Work Order**

**Target:** membuat WO dari plat nomor, menunjuk mekanik, dan memindahkan status sesuai aturan PRD 7.2. Status hanya berpindah lewat *database function*, dan Kepala Mekanik hanya bisa mengubah WO milik timnya.

***Prompt*****:** A1, A2, Uji A.

* ☐ Rina membuat WO dari plat lama: data pelanggan terisi dan nomor WO lanjut dari nomor terakhir.

* ☐ Pak Joko menunjuk Andi lalu menekan Mulai Kerjakan: status menjadi dikerjakan.

* ☐ Pak Joko membuka WO milik Tim B: tombol status tidak tampil.

* ☐ Alamat foto STNK dengan /sign/ diganti /public/, dibuka tanpa login: ditolak.

* ☐ Prompt Uji A: kedua panggilan ditolak dengan pesan berbahasa Indonesia.

### **Fitur B: Tagihan dan Invoice**

**Target:** mencatat spare part dan jasa di WO, menyesuaikan harga dengan alasan, menerbitkan *invoice*, dan mencatat pembayaran. Stok terakhir hanya bisa dipakai satu kali dan nomor *invoice* tidak pernah ganda.

***Prompt*****:** B1, B2.

Fitur B tidak perlu menunggu Fitur A. Data contoh sudah berisi WO berstatus dikerjakan milik Tim A dan WO siap diambil yang belum ditagih.

* ☐ Pak Joko menambah Lampu H4 (stok 1\) dari dua tab bersamaan: satu berhasil, satu “Stok Lampu H4 hanya 0”.

* ☐ Rina menyesuaikan harga tanpa alasan: ditolak.

* ☐ Rina menerbitkan *invoice* untuk WO siap diambil: nomor INV berikutnya muncul dan tagihan terkunci.

* ☐ Bayar sebagian lalu lunas: status bayar berubah.

* ☐ *Invoice* dicetak rapi dengan Ctrl+P.

### **Fitur C: Inventory dan Pengguna**

**Target:** mengelola spare part, jasa, dan stok, serta halaman Owner untuk mengatur akun dan setelan bengkel. Harga modal hanya terkirim ke *browser* Owner.

***Prompt*****:** C1, C2, dan Prompt Uji C di bagian Prompt Bantuan.

* ☐ Pak Darto membuka Inventory: kolom harga modal tampil.

* ☐ Rina membuka Inventory: kolom modal tidak ada, dan di DevTools › Network tidak ada harga\_modal.

* ☐ Rina mencatat stok masuk: stok bertambah dan tercatat di Riwayat Stok.

* ☐ Pak Darto menonaktifkan Pak Slamet: Pak Slamet tidak bisa masuk. Aktifkan lagi setelahnya.

* ☐ Pak Darto mengunggah logo bengkel di Setelan.

### **Fitur D: Dashboard dan Audit Log**

**Target:** menampilkan *dashboard* yang berbeda untuk tiga peran, mencatat setiap perubahan penting di *audit log*, dan membuat laporan laba untuk Owner. Angka *dashboard* dihitung di database supaya *egress* tetap kecil.

***Prompt*****:** D1, D2, D3, dan Prompt Uji D di bagian Prompt Bantuan.

* ☐ Masuk dengan tiga peran: isi *dashboard* berbeda, Rina dan Pak Joko tidak melihat laba.

* ☐ Ganti periode: semua kartu dan grafik ikut berubah.

* ☐ Klik irisan status di grafik donat: membuka daftar WO dengan status itu.

* ☐ Ubah harga jual satu item, lalu buka *Audit Log* sebagai Pak Darto: tercatat dengan nilai sebelum dan sesudah.

* ☐ Laporan Laba hanya bisa dibuka Pak Darto.

Bila Fitur C belum digabungkan, minta agen mengubah harga jual satu item lewat execute\_sql. Barisnya tercatat tanpa nama pelaku karena tidak lewat akun.

## **Langkah 4: Pull Request, Review, dan Merge**

**Membuat *pull request*** (setiap anggota, setelah semua uji fiturnya lolos):

1. Kirim **Prompt Push**. Agen menarik main terbaru, melakukan *commit* dan *push*, lalu menuliskan ringkasan perubahan.

2. Buka repo kelompok di GitHub, klik **Compare & pull request**.

3. Tempel ringkasan dari agen ke kolom deskripsi.

4. Di **Reviewers**, pilih satu teman kelompok.

5. Klik **Create pull request**, lalu sampaikan ke *reviewer*.

**Mereview** (teman yang dipilih):

1. Buka PR, baca tab **Files changed**.

2. Kirim **Prompt Coba** untuk mencoba fitur temanmu di laptopmu.

3. Periksa empat hal:

   * deskripsi menjelaskan apa yang dibuat dan cara mengujinya;

   * fiturnya berjalan;

   * tidak ada file milik fitur lain yang ikut berubah;

   * tidak ada isi .env.local atau *secret key*.

4. Tulis komentar, lalu klik **Review changes › Approve**.

Contoh komentar yang membantu: “Tombol Terbitkan Invoice masih muncul untuk Pak Joko. Bisa dicek lagi?”

**Menggabungkan** (ketua):

1. Pastikan PR sudah disetujui satu teman.

2. Klik **Merge pull request › Confirm merge**.

3. Sampaikan ke kelompok: “PR fitur B sudah masuk main.”

Setiap kali ada PR yang masuk main, **semua anggota** mengirim **Prompt Tarik Main**.

## **Langkah 5: Bila Terjadi Merge Conflict**

*Merge conflict* adalah keadaan ketika dua *branch* mengubah baris yang sama di satu file, sehingga Git tidak tahu versi mana yang dipakai.

1. Kirim **Prompt Konflik**. Agen menjelaskan kedua versi sebelum mengubah apa pun.

2. Bila konflik ada di file milik fitur lain, putuskan bersama pemilik fiturnya.

3. Untuk src/types/database.ts, jangan digabung manual. Agen membuatnya ulang.

4. Setelah selesai, pastikan npm run build berhasil, lalu *push* lagi.

## **Langkah 6: Uji Alur Lengkap Bersama**

Setelah keempat PR masuk main, semua anggota menarik main terbaru. Setiap anggota masuk dengan **satu akun** di laptopnya sendiri, lalu jalankan satu kunjungan mobil:

| No | Akun | Langkah | Hasil |
| :---- | :---- | :---- | :---- |
| 1 | Rina | Buat WO baru dari plat B 1234 KJ | ☐ |
| 2 | Pak Joko | Tunjuk mekanik, mulai, tambah aki, selesai, QC lulus | ☐ |
| 3 | Rina | Terbitkan *invoice*, catat pembayaran lunas | ☐ |
| 4 | Rina | Unggah foto kondisi akhir, Serahkan Mobil | ☐ |
| 5 | Pak Darto | Lihat pendapatan di *dashboard* dan jejaknya di *Audit Log* | ☐ |

Bila ada langkah yang gagal, pemilik fiturnya memperbaiki di *branch*\-nya lalu membuat PR baru.

## **Langkah 7: Uji Silang Antarkelompok**

Kelompok dipasangkan. Dua orang dari kelompokmu menguji aplikasi kelompok pasangan selama 15 menit, dua orang lainnya tetap sebagai pembuat.

* **Penguji** memegang laptop, mencoba skenario, mengucapkan apa yang sedang dilakukan, dan menulis laporan temuan.

* **Pembuat** menyiapkan aplikasi dan akun uji, mengamati tanpa mengarahkan, dan mencatat.

**Skenario uji:**

| No | Skenario | Akun | Hasil yang benar |
| :---- | :---- | :---- | :---- |
| 1 | Buka WO milik Tim B dan coba ubah statusnya | Pak Joko | Tidak bisa |
| 2 | Ketik /audit-log dan /laporan-laba di alamat | Rina | Dialihkan |
| 3 | Cari harga modal di Inventory dan DevTools › Network | Rina | Tidak ada |
| 4 | Tambah stok terakhir dari dua tab bersamaan | Pak Joko | Satu ditolak |
| 5 | Serahkan mobil sebelum *invoice* lunas | Rina | Ditolak |

**Format laporan temuan.** Tulis di lembar temuan, lalu serahkan ke kelompok pemilik.

| Bagian | Isi |
| :---- | :---- |
| Akun | Contoh: Pak Joko (Tim A) |
| Langkah | Contoh: Buka WO-2610-0011 milik Tim B, klik Mulai Kerjakan |
| Seharusnya | Contoh: Tombol tidak tampil atau ditolak |
| Yang terjadi | Contoh: Status berubah menjadi dikerjakan |
| Bukti | Tangkapan layar |

**Saat menerima temuan,** ucapkan terima kasih dan minta ditunjukkan langkahnya. Hindari kalimat seperti “Di laptopku jalan kok” atau “Itu bukan bug”. Catat temuannya, perbaiki, lalu minta teman menguji ulang.

## **Langkah 8: Tayang**

Dikerjakan ketua setelah semua PR masuk main dan uji alur lengkap lolos.

1. Kirim **Prompt Tayang**. Agen menayangkan main ke Netlify dan mengisi dua *environment variable* tanpa menampilkan nilainya.

2. Buka URL Netlify, masuk sebagai Pak Darto.

3. Di Supabase, buka **Authentication › URL Configuration**, ganti **Site URL** dengan URL Netlify.

4. Serahkan URL ke trainer.

5. Seluruh anggota mencoba masuk dari laptop masing-masing.

## **Akun Uji**

| Nama | Email | Peran | Tim |
| :---- | :---- | :---- | :---- |
| Pak Darto | owner@cemerlangjaya.test | Owner |  |
| Rina | admin@cemerlangjaya.test | Admin |  |
| Pak Joko | joko@cemerlangjaya.test | Kepala Mekanik | Tim A (Andi, Bayu) |
| Pak Slamet | slamet@cemerlangjaya.test | Kepala Mekanik | Tim B (Dedi, Eko) |

Kata sandi semua akun: Bengkel123\!. Kata sandi ini hanya untuk latihan di kelas.

## **Bila Ada Kendala**

| Kendala | Yang dilakukan |
| :---- | :---- |
| Agen tidak bisa membuka proyek kelompok lewat MCP | Pastikan undangan Supabase sudah diterima dan perannya Administrator, lalu muat ulang MCP Servers |
| Agen menampilkan SQL yang mengubah tabel | Tolak, lalu minta agen mengikuti AGENTS.md: tabel tidak boleh diubah |
| Editor menandai nama fungsi atau kolom sebagai error | Kirim Prompt Memperbarui Tipe di Daftar Prompt |
| Halaman menampilkan error | Kirim Prompt Mencari Penyebab Error dan tempel pesan error-nya |
| Fitur teman belum masuk main | Uji fiturmu memakai data contoh. Jangan menunggu |
| Dua anggota ingin mengubah file yang sama | Putuskan bersama siapa yang mengubah, lalu yang lain menarik main terbaru setelahnya |
| *Merge conflict* | Ikuti Langkah 5 |

## **Kriteria Selesai Kelompok**

* ☐ Keempat fitur masuk main lewat *pull request* yang disetujui satu teman.

* ☐ Folder supabase/migrations berisi 01\_dasar.sql dan keempat file fitur.

* ☐ Uji alur lengkap lolos.

* ☐ Laporan temuan dari kelompok lain sudah diterima.

* ☐ Aplikasi terbuka di URL Netlify dan bisa dipakai masuk.

## **Tugas di Rumah**

| Tugas | Siapa |
| :---- | :---- |
| Memperbaiki temuan uji silang lewat *branch* dan *pull request* | Pemilik fitur |
| Membangun halaman depan publik dengan logo, layanan, dan galeri dari *bucket* publik (PRD 6.2) | Kelompok |
| Menayangkan ulang main setelah semua perbaikan masuk | Ketua |
| Eksplorasi login Google dengan Modul Bacaan 6 Sesi 8 | Pribadi |

Kirim URL Netlify dan link repo kelompok sebelum Sesi 10\.