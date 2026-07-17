import { Contact, MyselfProfile } from '../types';

// Sentinel id for the synthetic "Me" node merged into a company's org chart.
// Never collides with real Contact ids since those are generated separately.
export const SELF_NODE_ID = '__self__';

// Builds the full set of nodes (real contacts + optional synthetic "Me" node)
// that a company's Smart Org Chart should render. Shared between SmartOrgChart.tsx
// (rendering) and AIAdvisor.tsx (AI prompt context) so the two never drift apart.
export function buildCompanyOrgChartContacts(
  contacts: Contact[],
  companyId: string,
  companyName: string,
  selfProfile: MyselfProfile,
  selfPlacement: { supervisorId?: string } | undefined
): Contact[] {
  const companyContacts = contacts.filter(
    c => c.companyId === companyId || c.company.toLowerCase() === companyName.toLowerCase()
  );

  if (!selfPlacement) return companyContacts;

  const selfNode: Contact = {
    id: SELF_NODE_ID,
    name: `${selfProfile.name || 'Me'} (You)`,
    position: selfProfile.position || '',
    company: companyName,
    companyId,
    email: '',
    relationStatus: 'Active',
    affiliation: 'Internal',
    tags: [],
    supervisorId: selfPlacement.supervisorId,
  };

  return [...companyContacts, selfNode];
}
