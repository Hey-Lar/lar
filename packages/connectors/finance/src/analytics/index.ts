export {
  projectDeterministic,
  projectMonteCarlo,
  project,
  makeSeededRand,
  type ProjectionInputs,
  type DeterministicResult,
  type MonteCarloResult,
  type ProjectionResult,
} from './retirement';

export {
  computeDrift,
  renderDriftMarkdown,
  type HoldingForDrift,
  type DriftBreach,
  type DriftReport,
} from './drift';

export {
  recommendNextContribution,
  type HoldingForRebalance,
  type NextContributionInput,
  type BuyRecommendation,
  type NextContributionResult,
} from './contribution';

export {
  classifyDrift,
  classifySuccessBand,
  modifiedDietzReturn,
  annualiseReturn,
  realReturn,
  hasUsableYtdAnchor,
  type DriftState,
  type SuccessBand,
} from './dashboard';
