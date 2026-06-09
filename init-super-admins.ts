import { db, doc, setDoc } from './firebase';
import { UserRole } from './types';

/**
 * Script to initialize Super Admin accounts in Firestore admins collection.
 * Run this to ensure the Super Admins can log in and have appropriate permissions.
 */
export const initializeSuperAdmins = async () => {
  const superAdmins = [
    {
      uid: 'F9ZZHGBjfJVtUVYzDfEG1NqnWI83',
      email: 'doni.smpn1@gmail.com',
      name: 'Super Admin Doni',
      role: 'SUPER_ADMIN' as UserRole,
      schoolId: 'sch_001',
      createdAt: Date.now(),
    },
    {
      uid: '9ydwyZwVSsdT95OMuREm6wjsE202',
      email: 'smareta@gmail.com',
      name: 'Super Admin Smareta',
      role: 'SUPER_ADMIN' as UserRole,
      schoolId: 'sch_001',
      createdAt: Date.now(),
    }
  ];

  console.log('Initializing Super Admins...');
  
  for (const admin of superAdmins) {
    try {
      const { uid, ...data } = admin;
      await setDoc(doc(db, 'admins', uid), data);
      console.log(`Successfully initialized Super Admin: ${admin.email}`);
    } catch (error) {
      console.error(`Failed to initialize Super Admin: ${admin.email}`, error);
    }
  }
  
  console.log('Initialization complete.');
};
