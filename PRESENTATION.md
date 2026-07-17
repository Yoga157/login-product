# Panduan Presentasi ProductHub

Dokumen ini adalah naskah presentasi singkat (sekitar 8–10 menit) sekaligus penjelasan langkah pembuatan.

## 1. Pembuka (30 detik)

“Saya membangun ProductHub, aplikasi product management dengan ASP.NET Core .NET 10. Fokus saya bukan hanya memenuhi CRUD, tetapi membuat alur yang production-minded: autentikasi JWT, pemisahan layer, validasi, centralized error handling, structured logging, caching, automated test, dan portability.”

## 2. Gambaran arsitektur (1 menit)

```text
Browser / Swagger
       │ HTTP + JWT
       ▼
Controllers ── request validation + status codes
       │
       ▼
Services ───── business rules + mapping + cache invalidation
       │
       ▼
Repositories ─ async data access abstraction
       │
       ▼
EF Core + SQLite

Cross-cutting: JWT middleware │ exception middleware │ Serilog
```

Alasan pemisahan layer:

- Controller tetap tipis dan hanya menangani kontrak HTTP.
- Service menjadi tempat business rule sehingga mudah di-unit-test.
- Repository menyembunyikan detail EF Core dan memudahkan penggantian database.
- DTO memisahkan input/output API dari entity database, sehingga client tidak dapat mengubah `Id` atau `CreatedAt`.

## 3. Step-by-step yang dibuat (2 menit)

### Step 1 — Fondasi project

- Starter lama dipindahkan ke solution netral `ProductHub.slnx`.
- Target framework benar-benar diubah ke `net10.0`.
- Dependency utama: EF Core SQLite, JWT Bearer, Serilog, Swagger, xUnit, dan coverlet.
- Nama solution/repository dibuat netral agar memenuhi aturan submission.

### Step 2 — Domain dan persistence

- Entity `Product` mengikuti properti yang diminta: `Id`, `Name`, `Description`, `Price`, `CreatedAt`.
- Entity `User` menyimpan email, password hash, role, dan waktu pembuatan.
- `AppDbContext` mengatur unique index email, index nama produk, dan presisi harga.
- Seluruh operasi database memakai `async`/`await` serta `CancellationToken`.

### Step 3 — Authentication dan security

- Register menormalisasi email, menolak duplikasi, lalu menyimpan password sebagai salted PBKDF2 hash.
- Login memverifikasi password dengan constant-time comparison.
- Token berisi subject, email, role, unique token ID, dan expiry.
- Semua route produk diberi `[Authorize]`.
- Secret produksi diambil dari environment variable, bukan hard-coded secret nyata.

### Step 4 — Product API dan business rules

- Repository menangani query EF Core.
- Service menangani mapping, not-found rule, price-range rule, logging, dan cache invalidation.
- Search mendukung nama, harga minimum, dan harga maksimum pada endpoint yang sama.
- `CreatedAt` selalu dibuat server dalam UTC.

### Step 5 — Reliability

- Data Annotations menjaga panjang nama/deskripsi, format email, panjang password, serta range harga.
- Exception middleware menerjemahkan exception menjadi status yang tepat: 400, 401, 404, 409, atau 500.
- Response error menggunakan `ProblemDetails` dan menyertakan trace ID.
- Serilog membuat structured log ke console dan rolling file.
- GET daftar produk tanpa filter di-cache selama 5 menit; create/update/delete langsung menghapus cache.

### Step 6 — Frontend dan testing

- Bootstrap UI menyediakan register/login, list, search, add, edit, delete, logout, serta feedback error/sukses.
- JWT otomatis dikirim sebagai Bearer token ke backend.
- Unit test menguji service, cache, mapping, not-found, validasi range, dan password hashing.
- Functional test menjalankan server in-memory dan menguji alur HTTP asli dari register sampai delete.
- Hasil terakhir: 14/14 test lulus, 99,25% line coverage, 83,87% branch coverage.

## 4. Urutan live demo (3–4 menit)

Sebelum presentasi:

```powershell
$env:Jwt__Key="demo-secret-key-at-least-32-characters-long"
dotnet run --project src/ProductHub.Api
```

Demo UI:

1. Buka `http://localhost:5080`.
2. Register dengan email baru; jelaskan bahwa response backend langsung memberikan JWT.
3. Tambahkan dua produk.
4. Edit satu produk dan hapus produk lainnya.
5. Gunakan search nama dan price range.
6. Logout; jelaskan bahwa endpoint produk sekarang kembali terlindungi.

Demo Swagger:

1. Buka `/swagger`.
2. Panggil `GET /api/products` tanpa token dan tunjukkan HTTP 401.
3. Login, salin token, klik **Authorize**, lalu panggil endpoint yang sama.
4. Cari ID yang tidak ada untuk menunjukkan HTTP 404 `ProblemDetails` dan trace ID.

Demo quality:

```powershell
dotnet test ProductHub.slnx -c Release --collect:"XPlat Code Coverage"
```

Tunjukkan bahwa semua test lulus. Jelaskan bahwa functional test tidak me-mock HTTP pipeline: authentication, model validation, controller, service, repository, dan SQLite benar-benar dilalui.

## 5. Highlight yang layak disebut reviewer (1 menit)

- Security: password tidak pernah disimpan plain text; JWT divalidasi issuer, audience, lifetime, signature, dan hanya punya clock skew 30 detik.
- Clean design: dependency injection dan interface membuat komponen dapat diuji atau diganti.
- Correct HTTP semantics: create `201`, delete `204`, bad input `400`, invalid credentials `401`, missing data `404`, duplicate email `409`.
- Cache correctness: hanya query tanpa filter yang di-cache dan semua mutation meng-invalidasi cache agar tidak stale.
- Portable: satu command .NET di Windows/Linux/macOS dan tersedia multi-stage Dockerfile.
- Supply-chain check: dependency yang terdeteksi memiliki advisory sudah diperbarui/di-pin ke versi aman.

## 6. Pertanyaan yang mungkin muncul

**Kenapa SQLite?**  
Supaya reviewer bisa menjalankan aplikasi tanpa memasang database dan tetap memenuhi batas maksimal lima langkah. Untuk multi-instance production, connection string dan repository dapat diarahkan ke PostgreSQL/SQL Server, disertai EF migrations.

**Kenapa in-memory cache, bukan Redis?**  
Requirement mengizinkan keduanya dan assessment berjalan single-node. Abstraksi cache dapat diganti distributed Redis saat scale-out.

**Kenapa repository plus service? Bukankah EF Core sudah repository?**  
Repository di sini membatasi query persistence yang tersedia, sedangkan service memegang business rule. Pemisahan ini membuat unit test tidak bergantung database dan controller tetap tipis.

**Bagaimana mencegah stale cache?**  
Semua create, update, dan delete memanggil satu fungsi invalidasi. Query berfilter tidak di-cache karena kombinasi key-nya dapat sangat banyak.

**Apakah sudah production-ready sepenuhnya?**  
Fondasinya production-minded, tetapi sebelum traffic nyata saya akan menambah EF migrations, rate limiting, refresh token/revocation, secret manager, health checks, pagination, managed database, Redis, telemetry, dan CI/CD.

**Kenapa coverage tinggi bukan berarti tidak ada bug?**  
Coverage hanya menunjukkan jalur kode dijalankan. Kualitas dijaga dengan assertions yang menguji behavior, integration test pipeline asli, code review, dan nantinya observability serta load/security test.

## 7. Penutup (20 detik)

“Solusi ini memenuhi seluruh requirement inti dan kriteria senior: async data access, repository pattern, caching, unit/functional testing di atas 80%, serta dapat dijalankan lokal atau melalui Docker. Trade-off dan langkah produksi berikutnya saya dokumentasikan transparan di README.”

## Checklist sebelum submit

- Jalankan `dotnet build ProductHub.slnx -c Release`.
- Jalankan test dan simpan screenshot hasil coverage.
- Pastikan `Jwt__Key` production disimpan sebagai secret, bukan di repository.
- Pastikan nama repository publik netral dan tidak memuat nama client/perusahaan.
- Ikuti urutan commit yang disarankan di README.
- Clone repository ke folder baru dan ulangi lima langkah local run.
- Bila deploy cloud, uji URL dari incognito dan pertahankan aktif minimal dua minggu.
