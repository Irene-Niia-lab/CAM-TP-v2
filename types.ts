
export interface BasicInfo {
  level: string;
  unit: string;
  lessonNo: string;
  duration: string;
  className: string;
  studentCount: string;
  date: string;
}

export interface Objectives {
  vocab: {
    core: string;
    basic: string;
    satellite: string;
  };
  patterns: {
    core: string;
    basic: string;
    satellite: string;
  };
  expansion: {
    culture: string;
    daily: string;
    habits: string;
  };
}

export interface Materials {
  cards: string;
  realia: string;
  multimedia: string;
  rewards: string;
}

export interface Game {
  name: string;
  goal: string;
  prep: string;
  rules: string;
}

export interface ImplementationStep {
  step: string;
  duration: string;
  design: string;
  instructions: string;
  notes: string;
  blackboard: string;
}

export interface Connection {
  review: string;
  preview: string;
  homework: string;
  prep: string;
}

export interface Feedback {
  student: { content: string; time: string; plan: string };
  parent: { content: string; time: string; plan: string };
  partner: { content: string; time: string; plan: string };
}

export interface TeachingPlan {
  basic: BasicInfo;
  objectives: Objectives;
  materials: Materials;
  games: Game[];
  steps: ImplementationStep[];
  connection: Connection;
  feedback: Feedback;
}
