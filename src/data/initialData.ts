import { Contact, MeetingNote, TaskReminder, MyselfProfile, Company } from '../types';

export const INITIAL_CONTACTS: Contact[] = [];
export const INITIAL_NOTES: MeetingNote[] = [];
export const INITIAL_TASKS: TaskReminder[] = [];
export const INITIAL_COMPANIES: Company[] = [];

export const DEFAULT_PROFILE: MyselfProfile = {
  name: '',
  position: '',
  company: '',
  personality: '',
  coreStrengths: '',
  communicationStyle: '',
  careerGoals: '',
  extraDetails: ''
};
