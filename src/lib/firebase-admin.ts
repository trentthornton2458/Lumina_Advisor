import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json'; // Adjust path if this file is not in src/lib/

if (!getApps().length) {
  // Read the projectId directly from the firebase-applet-config.json
  // which is automatically generated in the workspace root by the set_up_oauth tool.
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();
