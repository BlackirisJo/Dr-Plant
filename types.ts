
export interface Treatment {
  type: 'Chemical' | 'Biological';
  description: string;
  suggestedProducts?: string[];
}

export interface AnalysisResultData {
  id: string;
  imageUrl: string;
  timestamp: string;
  disease: string;
  description: string;
  treatments: Treatment[];
  severityLevel: number;
  severityDescription: string;
  language: string;
}