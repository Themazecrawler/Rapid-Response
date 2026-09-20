import { EventEmitter } from 'events';
import { registerProcessHandlers } from '../lifecycle';

describe('process lifecycle handlers', () => {
  const setup = () => {
    const target = new EventEmitter();
    const shutdown = jest.fn();
    registerProcessHandlers(shutdown, target);
    return { target, shutdown };
  };

  it('shuts down with a failure code on an unhandled rejection', () => {
    const { target, shutdown } = setup();
    target.emit('unhandledRejection', new Error('boom'));
    expect(shutdown).toHaveBeenCalledWith('unhandledRejection', 1);
  });

  it('shuts down with a failure code on an uncaught exception', () => {
    const { target, shutdown } = setup();
    target.emit('uncaughtException', new Error('boom'));
    expect(shutdown).toHaveBeenCalledWith('uncaughtException', 1);
  });

  it('handles non-Error rejection reasons', () => {
    const { target, shutdown } = setup();
    target.emit('unhandledRejection', 'plain string');
    expect(shutdown).toHaveBeenCalledWith('unhandledRejection', 1);
  });

  it('shuts down cleanly on termination signals', () => {
    const { target, shutdown } = setup();
    target.emit('SIGTERM');
    target.emit('SIGINT');
    expect(shutdown).toHaveBeenNthCalledWith(1, 'SIGTERM', 0);
    expect(shutdown).toHaveBeenNthCalledWith(2, 'SIGINT', 0);
  });
});
