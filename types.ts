export enum PermitType {
  LATE_ENTRY = "LATE_ENTRY",
  EXIT_PERMIT = "EXIT_PERMIT",
}

export interface SchoolProfile {
  id: string;
  name: string;
  address: string;
  logoUrl?: string; // Placeholder for logo
  phone?: string;
  email?: string;
  headmasterName?: string; // Kepala Sekolah (optional)
  studentAffairsName?: string; // Waka Kesiswaan
}

export interface StudentPermit {
  id: string;
  type: PermitType;
  studentName: string;
  className: string;
  reason: string;
  timestamp: number; // Created At
  schoolId: string;
  tahunAjaran?: string; // e.g. "2025/2026" — derived from timestamp if not set

  // Specific to Late Entry
  arrivalTimestamp?: number;

  // Specific to Exit Permit
  exitTimestamp?: number; // Planned exit
  returnTimestamp?: number; // Planned return (optional)
  approvedBy?: string; // Teacher name
}


export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER";
  schoolId: string;
}

// Mock Data for Multi-School Demo
export const DEMO_SCHOOLS: SchoolProfile[] = [
  {
    id: "sch_001",
    name: "SMAN 1 Rejotangan",
    address: "Jl. Raya Buntaran - Rejotangan",
    phone: "0355 395611",
    email: "smanrejotangan@yahoo.co.id",
    studentAffairsName: "Drs. Wawan Santosa",
  },
];
