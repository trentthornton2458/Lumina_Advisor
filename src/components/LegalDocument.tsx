import React from 'react';

const EFFECTIVE_DATE = 'July 14, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h4>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function TermsOfServiceBody() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-400">Effective {EFFECTIVE_DATE}</p>

      <Section title="1. What Lumina Is">
        <p>
          Lumina is a note-taking and relationship-management tool that uses AI (including Google's Gemini
          models) to summarize meetings, surface communication-style observations about your business
          contacts, and suggest tasks and talking points. Lumina is a personal productivity aid for the
          individual using it — it is not a workplace surveillance system, a clinical assessment tool, or a
          certified HR product.
        </p>
      </Section>

      <Section title="2. Not an Employment Decision Tool">
        <p>
          Lumina's behavioral and communication-style insights are generated from your own notes and logged
          interactions using pattern-matching, not a verified psychological assessment.{' '}
          <strong className="text-slate-800">
            You may not use Lumina, in whole or in part, as the sole or primary basis for a hiring, firing,
            promotion, discipline, compensation, or performance-review decision
          </strong>{' '}
          about any person, whether an employee, contractor, or job candidate. Any such decision must rest on
          independent human judgment and your organization's normal HR process. Lumina's outputs are advisory
          only and are provided "as is," with no guarantee of accuracy.
        </p>
      </Section>

      <Section title="3. Recording & Transcription Consent">
        <p>
          If you use Lumina's meeting transcription feature, <strong className="text-slate-800">you</strong> —
          not Lumina — are responsible for obtaining any consent required by law before recording or
          transcribing a conversation with another person, including two-party/all-party consent requirements
          in your jurisdiction. You agree to indemnify and hold Lumina harmless from claims arising from your
          failure to obtain required consent.
        </p>
      </Section>

      <Section title="4. Your Account">
        <p>
          You must provide accurate information and are responsible for activity on your account. You may
          export or permanently delete your account and all associated data at any time from
          Myself → Data &amp; Backups.
        </p>
      </Section>

      <Section title="5. Acceptable Use">
        <p>
          Don't use Lumina to profile individuals based on protected characteristics, to harass or
          discriminate against anyone, or to violate any law or another person's privacy rights.
        </p>
      </Section>

      <Section title="6. Disclaimers & Limitation of Liability">
        <p>
          Lumina is provided without warranties of any kind. AI-generated content may be inaccurate or
          incomplete. To the maximum extent permitted by law, Lumina and its operators are not liable for
          decisions made in reliance on the app's output.
        </p>
      </Section>

      <Section title="7. Changes">
        <p>
          We may update these Terms as the product evolves. Continued use after an update constitutes
          acceptance of the revised Terms.
        </p>
      </Section>

      <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">
        This is a working draft intended to be reviewed by qualified legal counsel before relying on it as a
        binding agreement.
      </p>
    </div>
  );
}

function PrivacyPolicyBody() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-400">Effective {EFFECTIVE_DATE}</p>

      <Section title="1. What We Store">
        <p>
          Your contacts, meeting notes, tasks, company records, SOP documents, advisor reports, and
          behavioral profiles are stored in Firestore under a document tree scoped to your account
          (<code className="text-[11px] bg-slate-100 rounded px-1 py-0.5">users/&#123;your-account-id&#125;/data/*</code>).
          Other users cannot read or write your data.
        </p>
      </Section>

      <Section title="2. How AI Processing Works">
        <p>
          When you request AI-generated advice, a behavioral read, or a transcription summary, the relevant
          notes/contact data are sent to Google's Gemini API to generate a response. We do not sell your
          data.
        </p>
      </Section>

      <Section title="3. Protected Characteristics">
        <p>
          Lumina's AI prompts explicitly instruct the model not to infer or reference protected
          characteristics (race, religion, disability, gender identity, sexual orientation, age, national
          origin, pregnancy, or similar) when generating behavioral or communication-style insights.
        </p>
      </Section>

      <Section title="4. Data Retention & Deletion">
        <p>
          Your data persists until you delete it. You can export a full backup at any time from
          Myself → Data &amp; Backups. You can also permanently delete your account and all associated
          Firestore data from the same screen — this action is irreversible and removes your contacts,
          notes, tasks, companies, SOPs, advisor reports, and behavioral profiles.
        </p>
      </Section>

      <Section title="5. Meeting Transcription">
        <p>
          The meeting transcriber captures audio from your own device's microphone and sends the resulting
          transcript text to the AI for analysis. It does not compute or store voiceprints or other
          biometric identifiers. You are responsible for notifying and obtaining consent from other people on
          a call before recording them — see the Terms of Service.
        </p>
      </Section>

      <Section title="6. Your Rights">
        <p>
          Depending on your location, you may have rights to access, correct, export, or delete your
          personal data, and to know how it's processed. The export and delete controls in
          Myself → Data &amp; Backups are built to satisfy these requests directly within the product.
        </p>
      </Section>

      <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">
        This is a working draft intended to be reviewed by qualified legal counsel before publishing as a
        binding privacy policy.
      </p>
    </div>
  );
}

export function LegalDocument({ doc }: { doc: 'terms' | 'privacy' }) {
  return doc === 'terms' ? <TermsOfServiceBody /> : <PrivacyPolicyBody />;
}
