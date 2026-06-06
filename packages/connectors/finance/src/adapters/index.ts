// Barrel export for the read-only adapter infrastructure.

export { BrokerError, DataError, num } from './errors';
export { SerialQueue } from './queue';
export type { SerialQueueOptions } from './queue';
export { RecordingAdapter, fixtureKey } from './recording-adapter';
export type { FixtureMap, RecordingAdapterOptions } from './recording-adapter';
