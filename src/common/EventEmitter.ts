/**
 * コンポーネントを分離するためのpub/subパターンのシンプルな実装
 */
export class EventEmitter {
  events: {
    [key: string]: Array<() => void>;
  };

  constructor() {
    this.events = {};
  }
  on(event: string, callback: () => void) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }
  remove(event: string, listener: () => void) {
    if (this.events[event]) {
      const index = this.events[event].indexOf(listener);
      if (~index) this.events[event].splice(index, 1);
    }
  }
  emit(event: string) {
    const events = this.events[event];
    if (events) events.forEach(event => event());
  }
}
