# BLUEPRINT: SmartSchool Permit System — Java Desktop OOP
# Gunakan file ini sebagai prompt untuk generate kode Java

> **KONTEKS**: Project ini adalah konversi aplikasi web Next.js/Firebase (sistem izin siswa sekolah) menjadi aplikasi Java Desktop untuk tugas besar PBO. File ini berisi SEMUA informasi yang diperlukan untuk men-generate kode Java yang lengkap.

> **SCOPE KAMU**: Buat SEMUA class KECUALI UI (Swing). UI akan dibuat oleh anggota tim lain. Kamu fokus pada: Model, Enum, Repository, Service, Utility, dan App config. Pastikan semua class sudah siap dipanggil dari UI layer.

---

## BAGIAN 1: ANALISIS PROJECT ASAL (Web)

### Entity yang Ada di Web
| Entity | Deskripsi |
|--------|-----------|
| `StudentPermit` | Data izin siswa (terlambat masuk / izin keluar) |
| `AdminUser` | Admin yang mengelola sistem (Super Admin / Admin Piket) |
| `SchoolProfile` | Profil sekolah (nama, alamat, dll) |

### Firestore Collections
| Collection | Deskripsi |
|------------|-----------|
| `permits` | Semua data izin siswa. Read/Create: public. Update/Delete: admin only |
| `admins` | Profil admin. Read: authenticated. Write: Super Admin only |

### Alur Bisnis
1. Siswa terlambat/mau keluar → isi form → data masuk ke Firestore (status: PENDING)
2. Admin Piket login → lihat dashboard → review izin → approve (status: APPROVED)
3. Admin bisa: CRUD izin, lihat laporan/rekap, filter per kelas/bulan
4. Super Admin bisa: semua hal di atas + kelola akun Admin Piket

### User Roles
- `SUPER_ADMIN` — Full access + kelola admin
- `ADMIN_PIKET` — Kelola izin, approve, laporan

---

## BAGIAN 2: ARSITEKTUR JAVA DESKTOP

### Teknologi
- Java 17+, Java Swing (UI oleh tim lain), Google Cloud Firestore SDK, Maven
- Pattern: MVC (Model-View-Controller)

### Struktur Package
```
com.smartschool.permit/
├── app/                  ← Main, FirestoreConnection, UserSession
├── model/                ← BaseModel, StudentPermit, AdminUser, SchoolProfile
│   └── enums/            ← PermitType, PermitStatus, UserRole
├── repository/           ← BaseRepository, PermitRepository, AdminRepository
├── service/              ← AuthService, PermitService, AdminService, ReportService
├── util/                 ← SchoolUtils, DateUtils
└── ui/                   ← (TIDAK PERLU DIBUAT — dikerjakan tim lain)
```

### Layer Flow
```
UI (Swing) → Service → Repository → Firestore
                ↕
              Model
```

---

## BAGIAN 3: DAFTAR CLASS YANG HARUS DIBUAT

### A. Enums (3 class)

#### 1. `PermitType` (enum)
```
Package: com.smartschool.permit.model.enums
Values: LATE_ENTRY, EXIT_PERMIT
```

#### 2. `PermitStatus` (enum)
```
Package: com.smartschool.permit.model.enums
Values: PENDING, APPROVED
```

#### 3. `UserRole` (enum)
```
Package: com.smartschool.permit.model.enums
Values: SUPER_ADMIN, ADMIN_PIKET
Method: isSuperAdmin() → boolean
```

---

### B. Model Layer (5 class)

#### 4. `BaseModel` (abstract class)
```
Package: com.smartschool.permit.model
Fields:
  - protected String id

Methods:
  - getId(): String
  - setId(String): void
  - abstract toMap(): Map<String, Object>        ← konversi ke Firestore map
  - abstract fromMap(Map<String, Object>): void   ← parse dari Firestore map

Implements: (none)
Catatan: Parent class untuk semua entity. Menyediakan kontrak konversi Firestore.
```

#### 5. `StudentPermit` (extends BaseModel, implements Exportable, Filterable)
```
Package: com.smartschool.permit.model
Fields:
  - private PermitType type
  - private String studentName
  - private String className
  - private String reason
  - private long timestamp          ← epoch millis saat izin dibuat
  - private String schoolId
  - private String tahunAjaran      ← "2025/2026"
  - private PermitStatus status     ← default PENDING
  - private String approvedBy       ← nama admin yang approve
  - private String approvedById     ← uid admin
  - private long approvedAt         ← epoch millis saat di-approve
  - private boolean isSuperAdminApproved
  - private long arrivalTimestamp   ← khusus terlambat: waktu tiba
  - private long exitTimestamp      ← khusus izin keluar: waktu keluar
  - private long returnTimestamp    ← khusus izin keluar: waktu kembali

Methods:
  - getter/setter semua field
  - approve(AdminUser admin): void
      → set status=APPROVED, approvedBy=admin.name, approvedById=admin.uid,
        approvedAt=now, isSuperAdminApproved=admin.isSuperAdmin()
  - isPending(): boolean → status == PENDING
  - isLateEntry(): boolean → type == LATE_ENTRY
  - isExitPermit(): boolean → type == EXIT_PERMIT
  - getDurationMinutes(): int
      → Terlambat: (timestamp - 07:00 hari itu) / 60000
      → Keluar + ada return: (returnTimestamp - timestamp) / 60000
      → Keluar + tanpa return: (15:00 hari itu - timestamp) / 60000
  - toMap(): Map<String, Object>   ← override, semua field ke map
  - fromMap(Map): void             ← override, parse map ke field
  - toExportRow(): Map<String, Object>  ← implement Exportable
  - matchesFilter(String keyword): boolean ← implement Filterable, cek nama/kelas contains keyword
```

#### 6. `AdminUser` (extends BaseModel, implements Filterable)
```
Package: com.smartschool.permit.model
Fields:
  - private String email
  - private String name
  - private UserRole role
  - private String schoolId
  - private long createdAt
  - private String createdBy     ← uid Super Admin yang membuat

Methods:
  - getter/setter semua field
  - isSuperAdmin(): boolean → role == SUPER_ADMIN
  - toMap(): Map<String, Object>
  - fromMap(Map): void
  - matchesFilter(String keyword): boolean ← cek nama/email contains keyword
```

#### 7. `SchoolProfile`
```
Package: com.smartschool.permit.model
Fields:
  - private String id
  - private String name           ← "SMAN 1 Rejotangan"
  - private String address        ← "Jl. Raya Buntaran - Rejotangan"
  - private String phone
  - private String email
  - private String headmasterName
  - private String studentAffairsName

Methods: getter/setter saja
Catatan: Data statis, di-hardcode. Tidak perlu Firestore.
```

#### 8. `StatisticsData`
```
Package: com.smartschool.permit.model
Fields:
  - private int totalLateEntry
  - private int totalExitPermit
  - private int pendingCount
  - private int todayCount

Methods:
  - getter/setter
  - calculate(List<StudentPermit> permits): void
      → iterate permits, hitung masing-masing counter
      → todayCount = permits yang timestamp-nya hari ini

Catatan: DTO untuk dashboard stats
```

#### 9. `PermitSummary` (implements Exportable)
```
Package: com.smartschool.permit.model
Fields:
  - private String studentName
  - private String className
  - private int lateCount
  - private int exitCount

Methods:
  - getter/setter
  - getTotalCount(): int → lateCount + exitCount
  - toExportRow(): Map<String, Object>

Catatan: DTO untuk rekap per siswa di laporan
```

---

### C. Interfaces (3 class)

#### 10. `CrudRepository<T>` (interface)
```
Package: com.smartschool.permit.repository
Methods:
  - List<T> getAll()
  - T getById(String id)
  - String create(T entity)
  - void update(String id, Map<String, Object> data)
  - void delete(String id)
```

#### 11. `Exportable` (interface)
```
Package: com.smartschool.permit.model
Methods:
  - Map<String, Object> toExportRow()
Catatan: Untuk class yang bisa di-export ke format tabel
```

#### 12. `Filterable` (interface)
```
Package: com.smartschool.permit.model
Methods:
  - boolean matchesFilter(String keyword)
Catatan: Untuk class yang mendukung pencarian/filter
```

---

### D. App Config (2 class)

#### 13. `FirestoreConnection` (Singleton)
```
Package: com.smartschool.permit.app
Fields:
  - private static FirestoreConnection instance
  - private Firestore db

Methods:
  - static getInstance(): FirestoreConnection
  - getDb(): Firestore
  - private constructor:
      → Load service account JSON dari resources
      → Initialize FirebaseApp + Firestore

Catatan: Gunakan google-cloud-firestore Maven dependency
  <dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-firestore</artifactId>
    <version>3.x.x</version>
  </dependency>
```

#### 14. `UserSession` (Singleton)
```
Package: com.smartschool.permit.app
Fields:
  - private static UserSession instance
  - private AdminUser currentUser

Methods:
  - static getInstance(): UserSession
  - login(AdminUser user): void → set currentUser
  - logout(): void → set currentUser = null
  - getCurrentUser(): AdminUser
  - isLoggedIn(): boolean → currentUser != null
  - isSuperAdmin(): boolean → currentUser != null && currentUser.isSuperAdmin()
  - getSchoolId(): String → currentUser.getSchoolId()
```

---

### E. Repository Layer (3 class)

#### 15. `BaseRepository<T extends BaseModel>` (abstract, implements CrudRepository<T>)
```
Package: com.smartschool.permit.repository
Fields:
  - protected String collectionName
  - protected Firestore db  ← dari FirestoreConnection.getInstance().getDb()

Constructor:
  - BaseRepository(String collectionName)

Methods (implement CrudRepository):
  - getAll(): List<T>
      → db.collection(collectionName).get() → iterate docs → toEntity(doc) per doc
  - getById(String id): T
      → db.collection(collectionName).document(id).get() → toEntity(doc)
  - create(T entity): String
      → db.collection(collectionName).add(entity.toMap()) → return doc.id
  - update(String id, Map data): void
      → db.collection(collectionName).document(id).update(data)
  - delete(String id): void
      → db.collection(collectionName).document(id).delete()

Abstract:
  - protected abstract T toEntity(DocumentSnapshot doc)
      → child class implements: parse doc ke entity spesifik
```

#### 16. `PermitRepository` (extends BaseRepository<StudentPermit>)
```
Package: com.smartschool.permit.repository
Constructor: super("permits")

Override:
  - toEntity(DocumentSnapshot doc): StudentPermit
      → new StudentPermit(), fromMap(doc.getData()), setId(doc.getId())

Additional Methods:
  - getBySchool(String schoolId): List<StudentPermit>
      → query where("schoolId", "==", schoolId) → sort by timestamp desc
  - getByType(String schoolId, PermitType type): List<StudentPermit>
      → getBySchool filtered by type
  - approvePermit(String permitId, Map<String, Object> approvalData): void
      → update(permitId, approvalData)
```

#### 17. `AdminRepository` (extends BaseRepository<AdminUser>)
```
Package: com.smartschool.permit.repository
Constructor: super("admins")

Override:
  - toEntity(DocumentSnapshot doc): AdminUser
      → new AdminUser(), fromMap(doc.getData()), setId(doc.getId())

Additional Methods:
  - getBySchool(String schoolId): List<AdminUser>
      → query where("schoolId", "==", schoolId)
  - getByUid(String uid): AdminUser
      → getById(uid)  ← di Firestore, doc ID = uid
```

---

### F. Service Layer (4 class)

#### 18. `AuthService`
```
Package: com.smartschool.permit.service
Fields:
  - private AdminRepository adminRepo

Methods:
  - login(String email, String password): AdminUser
      1. Panggil Firebase Auth REST API:
         POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyB9L6LOrxcnDZov4xEH522MZEqOtmTXfmg
         Body: { email, password, returnSecureToken: true }
      2. Parse response → ambil localId (uid)
      3. adminRepo.getByUid(uid)
      4. Jika null → throw "Akun tidak terdaftar sebagai admin"
      5. UserSession.getInstance().login(adminUser)
      6. Return adminUser
  - logout(): void
      → UserSession.getInstance().logout()
  - isAuthorized(String uid): boolean
      → adminRepo.getByUid(uid) != null

Catatan: Gunakan HttpURLConnection atau OkHttp untuk REST API call
```

#### 19. `PermitService`
```
Package: com.smartschool.permit.service
Fields:
  - private PermitRepository permitRepo

Methods:
  - getAllPermits(String schoolId): List<StudentPermit>
      → permitRepo.getBySchool(schoolId)
  - getPermitsByType(String schoolId, PermitType type): List<StudentPermit>
      → permitRepo.getByType(schoolId, type)
  - createPermit(StudentPermit permit): String
      → set permit.timestamp = System.currentTimeMillis()
      → set permit.status = PENDING
      → set permit.tahunAjaran = SchoolUtils.getTahunAjaran(permit.timestamp)
      → set permit.schoolId = UserSession.getInstance().getSchoolId()
      → return permitRepo.create(permit)
  - updatePermit(String id, StudentPermit permit): void
      → permitRepo.update(id, permit.toMap())
  - deletePermit(String id): void
      → permitRepo.delete(id)
  - approvePermit(String permitId, AdminUser admin): void
      → Map approval = {status: "APPROVED", approvedBy: admin.name,
         approvedById: admin.id, approvedAt: now,
         isSuperAdminApproved: admin.isSuperAdmin()}
      → permitRepo.approvePermit(permitId, approval)
  - filterPermits(List<StudentPermit> permits, String classFilter, String search): List<StudentPermit>
      → filter by className.startsWith(classFilter) if not empty
      → filter by matchesFilter(search) if not empty
      → return filtered list
```

#### 20. `AdminService`
```
Package: com.smartschool.permit.service
Fields:
  - private AdminRepository adminRepo

Methods:
  - getAllAdmins(String schoolId): List<AdminUser>
      → adminRepo.getBySchool(schoolId)
  - createAdmin(String email, String password, String name, String schoolId): AdminUser
      1. Panggil Firebase Auth REST API signUp:
         POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=API_KEY
         Body: { email, password, returnSecureToken: true }
      2. Parse response → ambil localId (uid)
      3. Buat AdminUser: role=ADMIN_PIKET, createdAt=now, createdBy=current user id
      4. adminRepo.create(adminUser) dengan doc ID = uid
         → Gunakan db.collection("admins").document(uid).set(map) bukan add()
      5. Return adminUser
  - deleteAdmin(String uid): void
      → adminRepo.delete(uid)

Catatan: createAdmin pakai set() bukan add() karena doc ID harus = uid
```

#### 21. `ReportService`
```
Package: com.smartschool.permit.service
Fields:
  - private PermitRepository permitRepo

Methods:
  - getDashboardStats(String schoolId): StatisticsData
      1. permits = permitRepo.getBySchool(schoolId)
      2. StatisticsData stats = new StatisticsData()
      3. stats.calculate(permits)
      4. return stats
  - getStudentSummary(String schoolId): List<PermitSummary>
      1. permits = permitRepo.getBySchool(schoolId)
      2. Group by (studentName + className) → Map<String, List<StudentPermit>>
      3. Per group: count LATE_ENTRY → lateCount, count EXIT_PERMIT → exitCount
      4. Return List<PermitSummary> sorted by totalCount desc
  - getMonthlyRecap(String schoolId, int year, int month): Map<String, int[]>
      1. Filter permits by tahun & bulan
      2. Group by className
      3. Per kelas: [lateCount, exitCount]
      4. Return map
```

---

### G. Utility (2 class)

#### 22. `SchoolUtils`
```
Package: com.smartschool.permit.util
Static Methods:
  - getTahunAjaran(long timestamp): String
      → Date d = new Date(timestamp)
      → if month >= 6 (Juli+): return "year/year+1"
      → else: return "year-1/year"
      → Contoh: Feb 2026 → "2025/2026", Sep 2026 → "2026/2027"
  - getAvailableTahunAjaran(List<Long> timestamps): List<String>
      → Kumpulkan semua tahun ajaran unik + tahun ajaran sekarang
      → Sort descending
  - getGrades(): String[] → {"X", "XI", "XII"}
  - getGradeLetters(String grade): String[]
      → X: A-J, XI: A-K, XII: A-K
  - getAllClasses(): List<String>
      → X-A, X-B, ..., XII-K
  - parseClass(String cls): String[] → {"X", "A"} dari "X-A"
```

#### 23. `DateUtils`
```
Package: com.smartschool.permit.util
Static Methods:
  - formatDate(long timestamp): String
      → "Senin, 10 Juni 2026"
  - formatTime(long timestamp): String
      → "14:30"
  - formatDateTime(long timestamp): String
      → "10 Jun 2026 14:30"
  - isToday(long timestamp): boolean
  - getTimeAgo(long timestamp): String
      → "5 menit lalu", "2 jam lalu", "kemarin"

Catatan: Gunakan java.time.* (LocalDate, LocalTime, DateTimeFormatter)
         Locale Indonesia: Locale("id", "ID")
```

---

## BAGIAN 4: KONSEP OOP YANG HARUS TERLIHAT

| Konsep | Implementasi |
|--------|-------------|
| **Encapsulation** | Semua field `private`, akses via getter/setter. `StudentPermit.approve()` mengontrol perubahan state |
| **Inheritance** | `StudentPermit extends BaseModel`, `AdminUser extends BaseModel`, `PermitRepository extends BaseRepository`, `AdminRepository extends BaseRepository` |
| **Polymorphism** | `toMap()` di-override oleh `StudentPermit` & `AdminUser`. `toEntity()` di-override oleh `PermitRepository` & `AdminRepository`. `List<BaseModel>` bisa berisi kedua tipe |
| **Abstraction** | `BaseModel` abstract class, `BaseRepository<T>` abstract generic class |
| **Interface** | `CrudRepository<T>`, `Exportable`, `Filterable` — implemented oleh class yang sesuai |

---

## BAGIAN 5: FIREBASE CONFIG

```
API Key: AIzaSyB9L6LOrxcnDZov4xEH522MZEqOtmTXfmg
Project ID: smartschool-34158
Auth Domain: smartschool-34158.firebaseapp.com

Firebase Auth REST API (untuk login):
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=API_KEY
Body: {"email":"...","password":"...","returnSecureToken":true}
Response: {"localId":"uid","idToken":"...","email":"..."}

Firebase Auth REST API (untuk create user):
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=API_KEY
Body: {"email":"...","password":"...","returnSecureToken":true}
Response: {"localId":"uid","idToken":"...","email":"..."}
```

Maven dependency untuk Firestore:
```xml
<dependency>
  <groupId>com.google.firebase</groupId>
  <artifactId>firebase-admin</artifactId>
  <version>9.2.0</version>
</dependency>
```

Service account JSON diperlukan — taruh di `src/main/resources/serviceAccountKey.json`

---

## BAGIAN 6: ATURAN PENTING

1. **JANGAN buat class UI** — UI dikerjakan tim lain pakai Swing
2. Semua class service harus punya **constructor yang menerima repository** (dependency injection manual)
3. Semua interaksi Firestore **synchronous** (blocking) — pakai `.get()` dari ApiFuture
4. Semua method service harus **siap dipanggil dari UI** tanpa perlu tahu detail Firestore
5. Handle exception dengan **try-catch**, throw custom message yang user-friendly
6. Gunakan **Locale Indonesia** untuk format tanggal: `new Locale("id", "ID")`
7. SchoolProfile di-**hardcode** sebagai default: SMAN 1 Rejotangan, schoolId = "sch_001"
8. Field enum di Firestore disimpan sebagai **String** (e.g., `"LATE_ENTRY"`, `"PENDING"`)

---

## TOTAL: 23 CLASS

| # | Class | Package | Tipe |
|---|-------|---------|------|
| 1 | `PermitType` | model.enums | Enum |
| 2 | `PermitStatus` | model.enums | Enum |
| 3 | `UserRole` | model.enums | Enum |
| 4 | `BaseModel` | model | Abstract Class |
| 5 | `StudentPermit` | model | Class |
| 6 | `AdminUser` | model | Class |
| 7 | `SchoolProfile` | model | Class |
| 8 | `StatisticsData` | model | Class (DTO) |
| 9 | `PermitSummary` | model | Class (DTO) |
| 10 | `Exportable` | model | Interface |
| 11 | `Filterable` | model | Interface |
| 12 | `CrudRepository` | repository | Interface |
| 13 | `FirestoreConnection` | app | Singleton |
| 14 | `UserSession` | app | Singleton |
| 15 | `BaseRepository` | repository | Abstract Generic |
| 16 | `PermitRepository` | repository | Class |
| 17 | `AdminRepository` | repository | Class |
| 18 | `AuthService` | service | Class |
| 19 | `PermitService` | service | Class |
| 20 | `AdminService` | service | Class |
| 21 | `ReportService` | service | Class |
| 22 | `SchoolUtils` | util | Utility |
| 23 | `DateUtils` | util | Utility |
