import { EventEmitter } from 'events';

declare global {
  namespace NodeJS {
    interface Process {
      customEventEmitter?: EventEmitter;
    }
  }
} 