import { MeetingNote } from '../types';

export function noteInvolvesContact(note: MeetingNote, contactId: string): boolean {
  return note.contactId === contactId || !!note.attendeeIds?.includes(contactId);
}

export function getNoteAttendeeIds(note: MeetingNote): string[] {
  const ids = note.contactId ? [note.contactId] : [];
  return [...ids, ...(note.attendeeIds || [])];
}
