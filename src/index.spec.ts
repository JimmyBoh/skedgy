import { test } from 'ava';

import { Scheduler, Options } from './';

class Task {
  public name: string;
  public delay: number;
  
  constructor(name: string, delay?: number) {
    this.name = name;
    this.delay = typeof delay === 'number' ? delay : ((Math.floor(Math.random() * 3) + 1) * 500);
  }
}

class TestScheduler extends Scheduler<Task> {

  constructor(options: Options<Task> = {}) {
    super(options);

  }

  public push(item: Task): Promise<void> {
    return this.enqueue(item);
  }

  protected async poll(): Promise<void> {

  }

  protected async work(item: Task): Promise<void> {
    //console.log(`### Starting task ${item.name}...`);
    await delay(item.delay);
    //console.log(`### Finished task ${item.name}!`);
  }
}

test(`Skedgy requires options`, t => {
  const GenericSkedgy = Scheduler as any;
  t.throws(() => new GenericSkedgy());
});

test(`Skedgy#start begins both services`, t => {
  const skedgy = new TestScheduler();

  let pollerStartedCount = 0;
  let workerStartedCount = 0;

  skedgy['_poller'] = {
    start: () => pollerStartedCount++
  } as any;
  skedgy['_worker'] = {
    start: () => workerStartedCount++
  } as any;

  skedgy.start();

  t.is(pollerStartedCount, 1);
  t.is(workerStartedCount, 1);
});

test('Skedgy#stop ends both services', t => {
  const skedgy = new TestScheduler({});

  skedgy['isStarted'] = true;

  let pollerStoppedCount = 0;
  let workerStoppedCount = 0;

  skedgy['_poller'] = {
    stop: () => pollerStoppedCount++
  } as any;
  skedgy['_worker'] = {
    stop: () => workerStoppedCount++
  } as any;

  skedgy.stop();

  t.is(pollerStoppedCount, 1);
  t.is(workerStoppedCount, 1);
});

test.cb(`Skedgy#nextPoll returns milliseconds until next poll call`, t => {
  const pollDelay = 10000;
  const skedgy = new TestScheduler({
    pollMinDelay: pollDelay,
    pollMaxDelay: pollDelay
  });

  skedgy.start();

  setTimeout(() => {
    let err = Math.abs(skedgy.nextPoll - pollDelay) / pollDelay;
    t.true(err < 0.1);
    skedgy.stop();
    t.end();
  }, 0);
});

test.cb(`Skedgy#nextWork returns milliseconds until next work call`, t => {
  const workDelay = 10000;

  const skedgy = new TestScheduler({
    workMinDelay: workDelay,
    workMaxDelay: workDelay
  });

  t.is(skedgy.nextWork, null);
 
  skedgy.push(new Task('Step 1', 500));
  skedgy.push(new Task('Step 2'));

  skedgy.start();

  setTimeout(() => {
    let nextWork = skedgy.nextWork;
    t.not(nextWork, null);
    let err = Math.abs(nextWork - workDelay) / workDelay;
    t.true(err < 0.1);
    skedgy.stop();
    t.end();
  }, 1000);
});

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}