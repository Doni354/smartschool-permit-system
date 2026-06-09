export enum PermitType {
  LATE_ENTRY = "LATE_ENTRY",
  EXIT_PERMIT = "EXIT_PERMIT",
}

export enum PermitStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
}

export type UserRole = "SUPER_ADMIN" | "ADMIN_PIKET";

export interface SchoolProfile {
  id: string;
  name: string;
  address: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  headmasterName?: string;
  studentAffairsName?: string;
}

export interface StudentPermit {
  id: string;
  type: PermitType;
  studentName: string;
  className: string;
  reason: string;
  timestamp: number;
  schoolId: string;
  tahunAjaran?: string;
  
  // Approval workflow
  status?: PermitStatus;
  approvedBy?: string;
  approvedById?: string;
  approvedAt?: number;
  isSuperAdminApproved?: boolean;

  // Specific to Late Entry
  arrivalTimestamp?: number;

  // Specific to Exit Permit
  exitTimestamp?: number;
  returnTimestamp?: number;
}

/** Helper: resolve permit status for legacy compatibility */
export function resolvePermitStatus(permit: StudentPermit): PermitStatus {
  if (!permit.status) return PermitStatus.APPROVED; 
  return permit.status;
}

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string;
  createdAt?: number;
  createdBy?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
