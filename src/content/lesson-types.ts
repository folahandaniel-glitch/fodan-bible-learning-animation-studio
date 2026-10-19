export type QuizSeed = [question: string, options: string[], correctIndex: number, explanation: string];
export interface LessonSeed {
  cls: string; topic: string; summary: string; objectives: string[]; background: string; explanation: string;
  keyWords?: [word: string, meaning: string][]; application: string; discussion: string[]; activity: string; homework: string;
  memory: string; teacher: { preparation: string; notes: string; advanced?: string }; parent: string; quiz: QuizSeed[]; free?: boolean; sources?: string[];
}
