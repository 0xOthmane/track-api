import { EvaluationType } from '../generated/prisma/enums';

export type ImportGradesJobData = {
  courseId: string;
  csv: string;
  userId: string;
  correlationId?: string | null;
};

export type ImportGradesRowError = {
  rowNumber: number;
  message: string;
};

export type ImportGradesResult = {
  successCount: number;
  failureCount: number;
  errors: ImportGradesRowError[];
};

export type ParsedGradeRow = {
  courseId: string;
  studentIdentifier: string;
  studentIdentifierType: 'id' | 'email';
  evaluationType: EvaluationType;
  value: number;
};
