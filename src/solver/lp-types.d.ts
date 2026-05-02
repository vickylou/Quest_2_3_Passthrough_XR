declare module 'javascript-lp-solver' {
  export interface LPModel {
    optimize: string;
    opType: 'min' | 'max';
    constraints: Record<string, Record<string, number>>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, 1>;
  }
  export interface LPResult {
    feasible: boolean;
    result: number;
    bounded: boolean;
    [variable: string]: number | boolean;
  }
  const solver: {
    Solve: (model: LPModel) => LPResult;
  };
  export default solver;
}
