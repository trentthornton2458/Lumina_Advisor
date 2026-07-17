import { authedFetch } from './apiClient';
import { User } from 'firebase/auth';

export interface EnrichmentData {
  lastChecked: string;
  titleChanges?: string;
  news?: string[];
}

export async function enrichContact(
  user: User | null,
  name: string,
  company?: string,
  linkedin?: string
): Promise<EnrichmentData | null> {
  try {
    const response = await authedFetch('/api/enrich-contact', user, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, company, linkedin }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch enrichment data');
    }

    const result = await response.json();
    if (result.status === 'success' && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.error('Error enriching contact data:', error);
    return null;
  }
}
