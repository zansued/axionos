/**
 * Mission Subject Mapper — Sprint 109
 * Maps operational and strategic subjects into mission evaluation candidates.
 */

export interface MissionSubject {
  id: string;
  subject_code: string;
  subject_type: string;
  subject_ref: string;
  domain: string;
  title: string;
  summary: string;
  active: boolean;
}

export function filterActiveSubjects(subjects: MissionSubject[]): MissionSubject[] {
  return subjects.filter(s => s.active);
}

export function groupSubjectsByDomain(subjects: MissionSubject[]): Record<string, MissionSubject[]> {
  const groups: Record<string, MissionSubject[]> = {};
  for (const s of subjects) {
    if (!groups[s.domain]) groups[s.domain] = [];
    groups[s.domain].push(s);
  }
  return groups;
}

export function groupSubjectsByType(subjects: MissionSubject[]): Record<string, MissionSubject[]> {
  const groups: Record<string, MissionSubject[]> = {};
  for (const s of subjects) {
    if (!groups[s.subject_type]) groups[s.subject_type] = [];
    groups[s.subject_type].push(s);
  }
  return groups;
}
