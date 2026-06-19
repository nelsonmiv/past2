export interface ExercisePractice {
  type: 'Simple Past' | 'Past Continuous';
  q: string;
  ans: string;
  options: string[];
  verbBase: string;
}

export interface ExerciseShadow {
  text: string;
  verbBase: string;
}

export interface ExerciseReverse {
  statement: string;
  targetQ: string;
  wh: string;
  verbBase: string;
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface AppState {
  score: number;
  practiceIdx: number;
  shadowIdx: number;
  reverseIdx: number;
  practiceOrder: number[];
  shadowOrder: number[];
  reverseOrder: number[];
  user: StudentUser | null;
}

export interface ConfigSettings {
  googleClientId: string;
  sheetsUrl: string;
  geminiApiKey: string;
}
