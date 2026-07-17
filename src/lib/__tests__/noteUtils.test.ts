import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateFallbackNoteInsights,
  noteInvolvesContact,
  getNoteAttendeeIds
} from '../noteUtils.js';
import { MeetingNote } from '../../types.js';

describe('noteUtils', () => {
  describe('noteInvolvesContact', () => {
    const mockNote: MeetingNote = {
      id: 'note-1',
      date: '2026-07-17',
      title: 'Meeting with Alice',
      contactId: 'contact-alice',
      attendeeIds: ['contact-bob', 'contact-charlie'],
      content: 'Discussion about future roadmap.',
      category: 'Discovery',
      sentimentScore: 7,
      engagementLevel: 8,
      keyPoints: []
    };

    it('should return true if contactId matches direct contactId', () => {
      assert.strictEqual(noteInvolvesContact(mockNote, 'contact-alice'), true);
    });

    it('should return true if contactId is in attendeeIds list', () => {
      assert.strictEqual(noteInvolvesContact(mockNote, 'contact-bob'), true);
      assert.strictEqual(noteInvolvesContact(mockNote, 'contact-charlie'), true);
    });

    it('should return false if contactId is not linked to note or attendeeIds', () => {
      assert.strictEqual(noteInvolvesContact(mockNote, 'contact-david'), false);
    });

    it('should handle missing attendeeIds gracefully', () => {
      const slimNote = { ...mockNote, attendeeIds: undefined };
      assert.strictEqual(noteInvolvesContact(slimNote, 'contact-alice'), true);
      assert.strictEqual(noteInvolvesContact(slimNote, 'contact-bob'), false);
    });
  });

  describe('getNoteAttendeeIds', () => {
    it('should combine contactId and attendeeIds', () => {
      const note: MeetingNote = {
        id: '1',
        date: '2026-07-17',
        title: 'Roadmap Align',
        contactId: 'alice',
        attendeeIds: ['bob', 'charlie'],
        content: 'Brief discussion',
        category: 'Discovery',
        sentimentScore: 5,
        engagementLevel: 5,
        keyPoints: []
      };
      assert.deepStrictEqual(getNoteAttendeeIds(note), ['alice', 'bob', 'charlie']);
    });

    it('should return empty array if contactId is missing and attendeeIds is empty/missing', () => {
      const note: MeetingNote = {
        id: '2',
        date: '2026-07-17',
        title: 'Empty Note',
        content: '',
        category: 'Discovery',
        sentimentScore: 5,
        engagementLevel: 5,
        keyPoints: []
      };
      assert.deepStrictEqual(getNoteAttendeeIds(note), []);
    });

    it('should handle missing attendeeIds', () => {
      const note: MeetingNote = {
        id: '3',
        date: '2026-07-17',
        title: 'Solo Note',
        contactId: 'alice',
        content: 'Solo sync',
        category: 'Catch-up',
        sentimentScore: 5,
        engagementLevel: 5,
        keyPoints: []
      };
      assert.deepStrictEqual(getNoteAttendeeIds(note), ['alice']);
    });
  });

  describe('generateFallbackNoteInsights', () => {
    it('should extract sentences longer than 12 characters as key points, up to a limit of 4', () => {
      const content = `
        Short.
        This is a long sentence that has more than twelve characters.
        Another very long sentence to extract.
        And another sentence that is clearly long enough.
        Fourth sentence that fits the criteria.
        Fifth sentence that also fits the criteria but shouldn't be extracted because of the limit of four.
      `;
      const result = generateFallbackNoteInsights(content, 6, 7);

      assert.strictEqual(result.keyPoints.length, 4);
      assert.deepStrictEqual(result.keyPoints, [
        'This is a long sentence that has more than twelve characters.',
        'Another very long sentence to extract.',
        'And another sentence that is clearly long enough.',
        'Fourth sentence that fits the criteria.'
      ]);
    });

    it('should filter out sentences of 12 characters or less', () => {
      const content = 'Too short. Yes, it is. Extremely long sentence that is over twelve characters.';
      const result = generateFallbackNoteInsights(content, 4, 4);

      assert.strictEqual(result.keyPoints.length, 1);
      assert.strictEqual(result.keyPoints[0], 'Extremely long sentence that is over twelve characters.');
    });

    it('should return fallback text if no valid sentences are found', () => {
      const content = 'Short. No. Uh oh.';
      const result = generateFallbackNoteInsights(content, 5, 5);

      assert.deepStrictEqual(result.keyPoints, [
        'No distinct key points could be extracted from the note content.'
      ]);
    });

    it('should retain current sentiment and engagement levels', () => {
      const content = 'This is a long sentence that will be parsed and extracted successfully.';
      const result = generateFallbackNoteInsights(content, 3, 9);

      assert.strictEqual(result.sentimentScore, 3);
      assert.strictEqual(result.engagementLevel, 9);
    });

    it('should return simulated flag and fallback description', () => {
      const content = 'This is a long sentence that will be parsed and extracted successfully.';
      const result = generateFallbackNoteInsights(content, 5, 5);

      assert.strictEqual(result.isSimulated, true);
      assert.strictEqual(typeof result.insights, 'string');
      assert.match(result.insights, /Simulation mode/i);
      assert.deepStrictEqual(result.coachingOpportunities, []);
    });

    it('should properly handle multiple consecutive whitespaces and trailing spaces', () => {
      const content = 'This   is   a   very   long   sentence   with   spaces.      Another   one   here   too.';
      const result = generateFallbackNoteInsights(content, 5, 5);

      assert.deepStrictEqual(result.keyPoints, [
        'This is a very long sentence with spaces.',
        'Another one here too.'
      ]);
    });
  });
});
