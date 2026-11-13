import type { FileReport, IssuesReport, SubjectDataset, SubjectId } from '../types';

const datasetCache: Partial<Record<SubjectId, SubjectDataset>> = {};
let issuesCache: IssuesReport | null = null;
let fileReportCache: FileReport | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không tải được dữ liệu (${res.status}) từ ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function loadSubjectDataset(subject: SubjectId): Promise<SubjectDataset> {
  if (datasetCache[subject]) {
    return datasetCache[subject]!;
  }
  const data = await fetchJson<SubjectDataset>(`/data/${subject}.json`);
  datasetCache[subject] = data;
  return data;
}

export async function loadAllDatasets(): Promise<Record<SubjectId, SubjectDataset>> {
  const [dbs, se1] = await Promise.all([
    loadSubjectDataset('dbs'),
    loadSubjectDataset('se1'),
  ]);
  return { dbs, se1 };
}

export async function loadIssuesReport(): Promise<IssuesReport> {
  if (issuesCache) return issuesCache;
  issuesCache = await fetchJson<IssuesReport>('/data/issues.json');
  return issuesCache;
}

export async function loadFileReport(): Promise<FileReport> {
  if (fileReportCache) return fileReportCache;
  fileReportCache = await fetchJson<FileReport>('/data/file-report.json');
  return fileReportCache;
}
