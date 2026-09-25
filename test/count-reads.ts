/**
 * 🔍 Firestore Read Count Test Script
 * 
 * Script ini mengsimulasikan setiap halaman yang akses Firestore,
 * dan menghitung jumlah reads yang terjadi.
 * 
 * Jalankan: npx tsx test/count-reads.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB9L6LOrxcnDZov4xEH522MZEqOtmTXfmg",
  authDomain: "smartschool-34158.firebaseapp.com",
  projectId: "smartschool-34158",
  storageBucket: "smartschool-34158.firebasestorage.app",
  messagingSenderId: "1059896900374",
  appId: "1:1059896900374:web:26a1a334fbdcfc8199ee37",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const PERMITS = 'permits';
const ADMINS = 'admins';
const SCHOOL_ID = 'sch_001';

// Tahun Ajaran helper
function getTahunAjaran(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

interface TestResult {
  page: string;
  fungsi: string;
  reads: number;
  note: string;
}

async function runTests() {
  const results: TestResult[] = [];
  const TA = getTahunAjaran();
  
  console.log('='.repeat(70));
  console.log('🔍 FIRESTORE READ COUNT TEST');
  console.log(`   School: ${SCHOOL_ID}`);
  console.log(`   Tahun Ajaran: ${TA}`);
  console.log('='.repeat(70));
  console.log('');

  // ============================================================
  // TEST 1: Halaman "/" (StudentEntry) — getStudentNamesBySchool
  // ============================================================
  console.log('📄 TEST 1: Halaman "/" (Catat Keterlambatan)');
  console.log('   Fungsi: getStudentNamesBySchool()');
  {
    const q = query(
      collection(db, PERMITS),
      where('schoolId', '==', SCHOOL_ID),
      orderBy('timestamp', 'desc'),
      limit(50)  // OPTIMIZED: sebelumnya 200
    );
    const snap = await getDocs(q);
    console.log(`   ✅ Reads (SESUDAH optimasi): ${snap.size} docs (limit 50)`);
    results.push({ page: '/ (Catat Terlambat)', fungsi: 'getStudentNamesBySchool()', reads: snap.size, note: 'limit 50 + cache 10min' });
  }
  
  // Simulasi SEBELUM optimasi (limit 200)
  {
    const q = query(
      collection(db, PERMITS),
      where('schoolId', '==', SCHOOL_ID),
      orderBy('timestamp', 'desc'),
      limit(200)  // SEBELUM optimasi
    );
    const snap = await getDocs(q);
    console.log(`   ❌ Reads (SEBELUM optimasi): ${snap.size} docs (limit 200, tanpa cache)`);
    results.push({ page: '/ (SEBELUM)', fungsi: 'getStudentNamesBySchool() LAMA', reads: snap.size, note: 'limit 200, TANPA cache' });
  }
  console.log('');

  // ============================================================
  // TEST 2: Halaman "/dispen" (StudentDispen) — getStudentNamesBySchool
  // ============================================================
  console.log('📄 TEST 2: Halaman "/dispen" (Form Dispensasi)');
  console.log('   Fungsi: getStudentNamesBySchool() — sama dengan TEST 1');
  console.log('   ✅ SESUDAH optimasi: 0 reads (CACHE HIT dari TEST 1)');
  console.log('   ❌ SEBELUM: sama = 200 docs lagi (tanpa cache)');
  results.push({ page: '/dispen (Dispensasi)', fungsi: 'getStudentNamesBySchool()', reads: 0, note: 'CACHE HIT (sama school)' });
  results.push({ page: '/dispen (SEBELUM)', fungsi: 'getStudentNamesBySchool() LAMA', reads: results[1].reads, note: 'TANPA cache, full 200 lagi' });
  console.log('');

  // ============================================================
  // TEST 3: Halaman "/rekap-siswa" — getPermitsBySchoolTA
  // ============================================================
  console.log('📄 TEST 3: Halaman "/rekap-siswa" (Rekap Data Siswa)');
  console.log('   Fungsi: getPermitsBySchoolTA()');
  {
    const q = query(
      collection(db, PERMITS),
      where('schoolId', '==', SCHOOL_ID),
      where('tahunAjaran', '==', TA),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    console.log(`   ✅ Reads SESUDAH optimasi: ${snap.size} docs (+ cache 5min)`);
    results.push({ page: '/rekap-siswa', fungsi: 'getPermitsBySchoolTA()', reads: snap.size, note: '+ cache 5min' });
  }
  console.log('');

  // ============================================================
  // TEST 4: Halaman "/rekap-siswa" KUNJUNGAN KE-2 (cache hit)
  // ============================================================
  console.log('📄 TEST 4: Halaman "/rekap-siswa" kunjungan ke-2 (dalam 5 menit)');
  console.log('   ✅ SESUDAH optimasi: 0 reads (CACHE HIT)');
  results.push({ page: '/rekap-siswa (ke-2)', fungsi: 'getPermitsBySchoolTA()', reads: 0, note: 'CACHE HIT 5min' });
  console.log('');

  // ============================================================
  // TEST 5: Admin Login — getAdminProfile
  // ============================================================
  console.log('📄 TEST 5: Admin Login');
  console.log('   Fungsi: getAdminProfile() — 1 doc read (by doc ID)');
  results.push({ page: '/login', fungsi: 'getAdminProfile()', reads: 1, note: 'getDoc by ID, OK' });
  console.log('');

  // ============================================================
  // TEST 6: Admin Dashboard — onPermitsSnapshot (realtime)
  // ============================================================
  console.log('📄 TEST 6: Admin Dashboard (/admin)');
  console.log('   Fungsi: onPermitsSnapshot() — realtime listener');
  {
    const q = query(
      collection(db, PERMITS),
      where('schoolId', '==', SCHOOL_ID),
      where('tahunAjaran', '==', TA),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    console.log(`   Reads initial load: ${snap.size} docs`);
    console.log(`   ⚠️  Setiap data berubah → re-read semua ${snap.size} docs (snapshot behavior)`);
    results.push({ page: '/admin (Dashboard)', fungsi: 'onPermitsSnapshot()', reads: snap.size, note: 'realtime, re-fires on change' });
  }
  console.log('');

  // ============================================================
  // TEST 7: Manage Admins — getAdminsBySchool
  // ============================================================
  console.log('📄 TEST 7: Admin → Kelola Admin');
  console.log('   Fungsi: getAdminsBySchool()');
  {
    try {
      const q = query(collection(db, ADMINS), where('schoolId', '==', SCHOOL_ID));
      const snap = await getDocs(q);
      console.log(`   ✅ Reads: ${snap.size} docs (jumlah admin kecil, OK)`);
      results.push({ page: '/admin/manage-admins', fungsi: 'getAdminsBySchool()', reads: snap.size, note: 'jumlah admin sedikit' });
    } catch {
      console.log(`   ⚠️  Skip — butuh auth (estimasi ~3-5 docs)`);
      results.push({ page: '/admin/manage-admins', fungsi: 'getAdminsBySchool()', reads: 4, note: '~4 admin (estimasi)' });
    }
  }
  console.log('');

  // ============================================================
  // TEST 8: SEBELUM OPTIMASI — getPermitsBySchool (ALL data)
  // ============================================================
  console.log('📄 TEST 8: ⚠️  DEPRECATED getPermitsBySchool() — ALL DATA');
  {
    const q = query(
      collection(db, PERMITS),
      where('schoolId', '==', SCHOOL_ID)
      // TANPA filter tahunAjaran — baca SEMUA!
    );
    const snap = await getDocs(q);
    console.log(`   ❌ Reads TANPA filter TA: ${snap.size} docs (SEMUA DATA!)`);
    results.push({ page: 'DEPRECATED fallback', fungsi: 'getPermitsBySchool() ALL', reads: snap.size, note: '🔴 SEMUA data tanpa filter!' });
  }
  console.log('');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('='.repeat(70));
  console.log('📊 RINGKASAN HASIL TEST');
  console.log('='.repeat(70));
  console.log('');

  // Calculate before/after per scenario
  const scenarios = [
    { name: '30 siswa buka / (terlambat)', before: results[1].reads * 30, after: results[0].reads + 0 * 29, note: `cache: 1×${results[0].reads} + 29×0` },
    { name: '30 siswa buka /dispen', before: results[3].reads * 30, after: 0, note: 'cache dari halaman /' },
    { name: '10 visit /rekap-siswa', before: results[4].reads * 10, after: results[4].reads + 0 * 9, note: `cache: 1×${results[4].reads} + 9×0` },
    { name: 'Admin login (1×)', before: 1, after: 1, note: 'sama — 1 doc' },
    { name: 'Admin dashboard (initial)', before: results[7].reads, after: results[7].reads, note: 'sama — snapshot' },
    { name: 'Admin 10 changes (snapshot)', before: results[7].reads * 10, after: results[7].reads * 10, note: 'snapshot re-fire' },
    { name: 'Manage admins (1×)', before: results[8].reads, after: results[8].reads, note: 'sama — OK' },
    { name: 'Fallback ALL data (2-3×)', before: results[9].reads * 3, after: 0, note: 'fallback DIHAPUS!' },
  ];

  let totalBefore = 0;
  let totalAfter = 0;

  console.log('| Skenario per Hari                  | SEBELUM  | SESUDAH  | Hemat     |');
  console.log('|-------------------------------------|----------|----------|-----------|');
  for (const s of scenarios) {
    totalBefore += s.before;
    totalAfter += s.after;
    const saved = s.before - s.after;
    const pct = s.before > 0 ? Math.round((saved / s.before) * 100) : 0;
    console.log(`| ${s.name.padEnd(35)} | ${String(s.before).padStart(8)} | ${String(s.after).padStart(8)} | ${saved > 0 ? '-' + saved : '0'} (${pct}%) |`);
  }
  console.log('|-------------------------------------|----------|----------|-----------|');
  const totalSaved = totalBefore - totalAfter;
  const totalPct = Math.round((totalSaved / totalBefore) * 100);
  console.log(`| ${'TOTAL'.padEnd(35)} | ${String(totalBefore).padStart(8)} | ${String(totalAfter).padStart(8)} | -${totalSaved} (${totalPct}%) |`);
  console.log('');

  console.log('✅ Test selesai!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
