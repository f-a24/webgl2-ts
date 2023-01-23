// clockインスタンスを提供するためにrequestAnimationFrameを抽象化
import { EventEmitter } from './EventEmitter';

/**
 * アプリケーションのさまざまな部分を同期
 */
export class Clock extends EventEmitter {
  isRunning: boolean;

  constructor() {
    super();
    this.isRunning = true;

    this.tick = this.tick.bind(this);
    this.tick();

    window.onblur = () => {
      this.stop();
      console.info('Clock stopped');
    };

    window.onfocus = () => {
      this.start();
      console.info('Clock resumed');
    };
  }

  /**
   * すべてのrequestAnimationFrameサイクルで呼び出し
   */
  tick() {
    if (this.isRunning) this.emit('tick');
    requestAnimationFrame(this.tick);
  }

  /**
   * 時計を開始
   */
  start() {
    this.isRunning = true;
  }

  /**
   * 時計を停止
   */
  stop() {
    this.isRunning = false;
  }
}
