import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const STORAGE_KEY = 'lumina_google_cal_token';

export function setGoogleAccessToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getGoogleAccessToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export async function connectGoogleCalendar(): Promise<string | null> {
  const provider = new GoogleAuthProvider();
  // Request required scopes
  provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setGoogleAccessToken(credential.accessToken);
      return credential.accessToken;
    }
    return null;
  } catch (error) {
    console.error('Failed to run connectGoogleCalendar popup auth', error);
    throw error;
  }
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

export async function fetchCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 2); // Fetch events up to 2 months ago
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6); // Fetch events up to 6 months in advance

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&maxResults=150`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API list events returned status: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }
): Promise<CalendarEvent> {
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API create event returned status: ${response.status}`);
  }

  return response.json();
}
