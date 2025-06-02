import { EventEmitter } from 'events';

declare global {
  namespace NodeJS {
    interface Process {
      customEventEmitter?: EventEmitter;
    }
  }
}

// This export statement is needed to make the file a module
// and allow global augmentations.
export {}; 