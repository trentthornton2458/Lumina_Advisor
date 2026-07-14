import { db } from './firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Contact, MeetingNote, TaskReminder, MyselfProfile, Company, SOPDocument, SavedAdvisorReport, BehavioralProfile } from '../types';

export interface UserSettings {
  darkMode: boolean;
  activeTab: string;
  tabOrder: string[] | null;
  setupCompleted: boolean;
}

export interface UserDataResult {
  contacts: Contact[] | null;
  notes: MeetingNote[] | null;
  tasks: TaskReminder[] | null;
  profile: MyselfProfile | null;
  companies: Company[] | null;
  sops: SOPDocument[] | null;
  advisorReports: SavedAdvisorReport[] | null;
  behavioralProfiles: BehavioralProfile[] | null;
  settings: UserSettings | null;
}

/**
 * Loads all user data from Firestore.
 * If no cloud data exists yet, it attempts a one-time migration from localStorage.
 */
export async function loadUserData(uid: string): Promise<UserDataResult> {
  const docRefs = {
    contacts: doc(db, 'users', uid, 'data', 'contacts'),
    notes: doc(db, 'users', uid, 'data', 'notes'),
    tasks: doc(db, 'users', uid, 'data', 'tasks'),
    profile: doc(db, 'users', uid, 'data', 'profile'),
    companies: doc(db, 'users', uid, 'data', 'companies'),
    sops: doc(db, 'users', uid, 'data', 'sops'),
    advisorReports: doc(db, 'users', uid, 'data', 'advisorReports'),
    behavioralProfiles: doc(db, 'users', uid, 'data', 'behavioralProfiles'),
    settings: doc(db, 'users', uid, 'data', 'settings'),
  };

  try {
    const snapshots = await Promise.all([
      getDoc(docRefs.contacts),
      getDoc(docRefs.notes),
      getDoc(docRefs.tasks),
      getDoc(docRefs.profile),
      getDoc(docRefs.companies),
      getDoc(docRefs.sops),
      getDoc(docRefs.advisorReports),
      getDoc(docRefs.behavioralProfiles),
      getDoc(docRefs.settings),
    ]);

    const [
      contactsSnap,
      notesSnap,
      tasksSnap,
      profileSnap,
      companiesSnap,
      sopsSnap,
      advisorReportsSnap,
      behavioralProfilesSnap,
      settingsSnap,
    ] = snapshots;

    const hasAnyCloudData = snapshots.some(snap => snap.exists());

    if (!hasAnyCloudData) {
      console.log('No cloud data found for user. Checking localStorage for migration...');
      
      // Perform one-time migration from localStorage if it exists
      const localContacts = localStorage.getItem('c_notes_contacts');
      const localNotes = localStorage.getItem('c_notes_notes');
      const localTasks = localStorage.getItem('c_notes_tasks');
      const localProfile = localStorage.getItem('c_notes_profile');
      const localCompanies = localStorage.getItem('c_notes_companies');
      const localSops = localStorage.getItem('c_notes_sops');
      const localAdvisorReports = localStorage.getItem('c_notes_advisor_reports');
      const localBehavioralProfiles = localStorage.getItem('c_notes_behavioral_profiles');

      const localDarkMode = localStorage.getItem('lumina_dark_mode');
      const localActiveTab = localStorage.getItem('c_notes_active_tab');
      const localTabOrder = localStorage.getItem('c_notes_tab_order');
      const localSetupCompleted = localStorage.getItem('lumina_setup_completed');

      const data: UserDataResult = {
        contacts: localContacts ? JSON.parse(localContacts) : null,
        notes: localNotes ? JSON.parse(localNotes) : null,
        tasks: localTasks ? JSON.parse(localTasks) : null,
        profile: localProfile ? JSON.parse(localProfile) : null,
        companies: localCompanies ? JSON.parse(localCompanies) : null,
        sops: localSops ? JSON.parse(localSops) : null,
        advisorReports: localAdvisorReports ? JSON.parse(localAdvisorReports) : null,
        behavioralProfiles: localBehavioralProfiles ? JSON.parse(localBehavioralProfiles) : null,
        settings: {
          darkMode: localDarkMode === 'true',
          activeTab: localActiveTab || 'overview',
          tabOrder: localTabOrder ? JSON.parse(localTabOrder) : null,
          setupCompleted: localSetupCompleted === 'true',
        }
      };

      // If we have some local data, write it to Firestore immediately
      if (
        data.contacts ||
        data.notes ||
        data.tasks ||
        data.profile ||
        data.companies ||
        data.sops ||
        data.advisorReports ||
        data.behavioralProfiles ||
        localSetupCompleted === 'true'
      ) {
        console.log('Migrating localStorage data to Firestore for user:', uid);
        await Promise.all([
          data.contacts && setDoc(docRefs.contacts, { items: data.contacts }),
          data.notes && setDoc(docRefs.notes, { items: data.notes }),
          data.tasks && setDoc(docRefs.tasks, { items: data.tasks }),
          data.profile && setDoc(docRefs.profile, data.profile),
          data.companies && setDoc(docRefs.companies, { items: data.companies }),
          data.sops && setDoc(docRefs.sops, { items: data.sops }),
          data.advisorReports && setDoc(docRefs.advisorReports, { items: data.advisorReports }),
          data.behavioralProfiles && setDoc(docRefs.behavioralProfiles, { items: data.behavioralProfiles }),
          setDoc(docRefs.settings, data.settings),
        ].filter(Boolean) as Promise<any>[]);
      }

      return data;
    }

    return {
      contacts: contactsSnap.exists() ? (contactsSnap.data()?.items || []) as Contact[] : [],
      notes: notesSnap.exists() ? (notesSnap.data()?.items || []) as MeetingNote[] : [],
      tasks: tasksSnap.exists() ? (tasksSnap.data()?.items || []) as TaskReminder[] : [],
      profile: profileSnap.exists() ? profileSnap.data() as MyselfProfile : null,
      companies: companiesSnap.exists() ? (companiesSnap.data()?.items || []) as Company[] : [],
      sops: sopsSnap.exists() ? (sopsSnap.data()?.items || []) as SOPDocument[] : [],
      advisorReports: advisorReportsSnap.exists() ? (advisorReportsSnap.data()?.items || []) as SavedAdvisorReport[] : [],
      behavioralProfiles: behavioralProfilesSnap.exists() ? (behavioralProfilesSnap.data()?.items || []) as BehavioralProfile[] : [],
      settings: settingsSnap.exists() ? settingsSnap.data() as UserSettings : null,
    };
  } catch (error) {
    console.error('Error loading data from Firestore, falling back to localStorage:', error);
    // Silent failover to localStorage
    const localContacts = localStorage.getItem('c_notes_contacts');
    const localNotes = localStorage.getItem('c_notes_notes');
    const localTasks = localStorage.getItem('c_notes_tasks');
    const localProfile = localStorage.getItem('c_notes_profile');
    const localCompanies = localStorage.getItem('c_notes_companies');
    const localSops = localStorage.getItem('c_notes_sops');
    const localAdvisorReports = localStorage.getItem('c_notes_advisor_reports');
    const localBehavioralProfiles = localStorage.getItem('c_notes_behavioral_profiles');

    const localDarkMode = localStorage.getItem('lumina_dark_mode');
    const localActiveTab = localStorage.getItem('c_notes_active_tab');
    const localTabOrder = localStorage.getItem('c_notes_tab_order');
    const localSetupCompleted = localStorage.getItem('lumina_setup_completed');

    return {
      contacts: localContacts ? JSON.parse(localContacts) : [],
      notes: localNotes ? JSON.parse(localNotes) : [],
      tasks: localTasks ? JSON.parse(localTasks) : [],
      profile: localProfile ? JSON.parse(localProfile) : null,
      companies: localCompanies ? JSON.parse(localCompanies) : [],
      sops: localSops ? JSON.parse(localSops) : [],
      advisorReports: localAdvisorReports ? JSON.parse(localAdvisorReports) : [],
      behavioralProfiles: localBehavioralProfiles ? JSON.parse(localBehavioralProfiles) : [],
      settings: {
        darkMode: localDarkMode === 'true',
        activeTab: localActiveTab || 'overview',
        tabOrder: localTabOrder ? JSON.parse(localTabOrder) : null,
        setupCompleted: localSetupCompleted === 'true',
      }
    };
  }
}

export async function saveContacts(uid: string, contacts: Contact[]) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'contacts');
    // Contacts carry several optional fields that get set to `undefined` rather than omitted -
    // Firestore rejects `undefined` field values, so round-trip through JSON to strip them before writing.
    await setDoc(ref, { items: JSON.parse(JSON.stringify(contacts)) });
  } catch (error) {
    console.error('Error saving contacts to Firestore:', error);
  }
}

export async function saveNotes(uid: string, notes: MeetingNote[]) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'notes');
    // Notes carry several optional fields that get set to `undefined` rather than omitted -
    // Firestore rejects `undefined` field values, so round-trip through JSON to strip them before writing.
    await setDoc(ref, { items: JSON.parse(JSON.stringify(notes)) });
  } catch (error) {
    console.error('Error saving notes to Firestore:', error);
  }
}

export async function saveTasks(uid: string, tasks: TaskReminder[]) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'tasks');
    // Tasks carry several optional fields that get set to `undefined` rather than omitted -
    // Firestore rejects `undefined` field values, so round-trip through JSON to strip them before writing.
    await setDoc(ref, { items: JSON.parse(JSON.stringify(tasks)) });
  } catch (error) {
    console.error('Error saving tasks to Firestore:', error);
  }
}

export async function saveProfile(uid: string, profile: MyselfProfile) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'profile');
    // Profile carries several optional fields that get set to `undefined` rather than omitted -
    // Firestore rejects `undefined` field values, so round-trip through JSON to strip them before writing.
    await setDoc(ref, JSON.parse(JSON.stringify(profile)));
  } catch (error) {
    console.error('Error saving profile to Firestore:', error);
  }
}

export async function saveCompanies(uid: string, companies: Company[]) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'companies');
    // Companies carry several optional fields (e.g. website: value.trim() || undefined) that get
    // set to `undefined` rather than omitted - Firestore rejects `undefined` field values, so
    // round-trip through JSON to strip them before writing.
    await setDoc(ref, { items: JSON.parse(JSON.stringify(companies)) });
  } catch (error) {
    console.error('Error saving companies to Firestore:', error);
  }
}

export async function saveSops(uid: string, sops: SOPDocument[]) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'sops');
    // SOPs carry several optional fields that get set to `undefined` rather than omitted -
    // Firestore rejects `undefined` field values, so round-trip through JSON to strip them before writing.
    await setDoc(ref, { items: JSON.parse(JSON.stringify(sops)) });
  } catch (error) {
    console.error('Error saving sops to Firestore:', error);
  }
}

export async function saveAdvisorReports(uid: string, reports: SavedAdvisorReport[]) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'advisorReports');
    // Reports carry several optional fields (contactId, companyId, userPrompt, ...) that get
    // set to `undefined` rather than omitted - Firestore rejects `undefined` field values, so
    // round-trip through JSON to strip them before writing.
    await setDoc(ref, { items: JSON.parse(JSON.stringify(reports)) });
  } catch (error) {
    console.error('Error saving advisor reports to Firestore:', error);
  }
}

export async function saveBehavioralProfiles(uid: string, profiles: BehavioralProfile[]) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'behavioralProfiles');
    await setDoc(ref, { items: JSON.parse(JSON.stringify(profiles)) });
  } catch (error) {
    console.error('Error saving behavioral profiles to Firestore:', error);
  }
}

export async function saveSettings(uid: string, settings: UserSettings) {
  try {
    const ref = doc(db, 'users', uid, 'data', 'settings');
    // Settings may carry optional fields set to `undefined` rather than omitted -
    // Firestore rejects `undefined` field values, so round-trip through JSON to strip them before writing.
    await setDoc(ref, JSON.parse(JSON.stringify(settings)));
  } catch (error) {
    console.error('Error saving settings to Firestore:', error);
  }
}
