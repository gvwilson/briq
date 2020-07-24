'use strict'

const assert = require('assert')

const util = require('../libs/util')
const DataFrame = require('../libs/dataframe')
const Transform = require('../libs/transform')
const Env = require('../libs/env')
const Pipeline = require('../libs/pipeline')
const Program = require('../libs/program')

const fixture = require('./fixture')

const INTERFACE = new fixture.TestInterface()

describe('program utilities', () => {
  it('checks program equality', (done) => {
    const first = new Program(new Pipeline(new Transform.data('some')))
    const second = new Program(new Pipeline(new Transform.data('thing'),
                                            new Transform.drop(['red'])))
    assert(first.equal(first),
           `Program should equal itself`)
    assert(!first.equal(second),
           `Different programs should not be equal`)
    done()
  })
})

describe('data management', () => {
  it('saves and recovers datasets', (done) => {
    const env = new Env(INTERFACE.userData)
    env.setResult('testing', new DataFrame(fixture.COLORS))
    const restored = env.getData('testing')
    assert.deepEqual(new DataFrame(fixture.COLORS), restored,
                     `Expected to get same data back`)
    done()
  })

  it('only recovers datasets that exist', (done) => {
    const env = new Env(INTERFACE.userData)
    assert.throws(() => env.getData('nonexistent'),
                  Error,
                  `Expected error`)
    done()
  })
})

describe('executes program', () => {
  it('requires a name and some data when notifying', (done) => {
    const program = new Program()
    assert.throws(() => program.notify('name', new DataFrame([])),
                  Error,
                  `Should require environment when doing notification`)
    program.env = new Env(INTERFACE.userData)
    assert.throws(() => program.notify('', new DataFrame([])),
                  Error,
                  `Should require notification name`)
    assert.throws(() => program.notify('name', new Date()),
                  Error,
                  `Should require dataframe`)
    done()
  })

  it('can notify when nothing is waiting', (done) => {
    const program = new Program()
    const df = new DataFrame([])
    const env = new Env(INTERFACE.userData)
    program.env = env
    program.notify('name', df)
    assert(df.equal(env.getData('name')),
           `Should be able to get data after notifying`)
    done()
  })

  it('requires valid pipelines when registering', (done) => {
    const pipeline = new Pipeline()
    const program = new Program()
    assert.throws(() => program.register(null),
                  Error,
                  `Expected error for null pipeline`)
    assert.throws(() => program.register(new Date()),
                  Error,
                  `Expected error for non-pipeline`)
    done()
  })

  it('registers a pipeline that depends on nothing', (done) => {
    const program = new Program()
    const pipeline = new Pipeline(fixture.MIDDLE)

    program.register(pipeline)
    assert.equal(program.queue.length, 1,
                 `Expected one item in queue`)
    assert(program.queue[0].equal(pipeline),
           `Expected pipeline in queue`)
    assert.equal(program.waiting.size, 0,
                 `Expected nothing to be waiting`)
    done()
  })

  it('registers a pipeline with dependencies', (done) => {
    const program = new Program()
    const requires = ['first', 'second']
    const transform = new fixture.MockTransform('transform', fixture.pass, requires, null, true, true)
    const pipeline = new Pipeline(transform)

    program.register(pipeline)
    assert.equal(program.queue.length, 0,
                 `Expected nothing in run queue`)
    assert.equal(program.waiting.size, 1,
                 `Expected one item in waiting set`)
    assert.deepEqual(program.waiting.get(pipeline), new Set(requires),
                     `Wrong values in waiting set`)
    done()
  })

  it('makes something runnable when its single dependency resolves', (done) => {
    const program = new Program()
    const transform = new fixture.MockTransform('transform', fixture.pass, ['first'], null, true, true)
    const second = new Pipeline(transform)
    const df = new DataFrame([])

    program.register(second)
    assert.equal(program.queue.length, 0,
                 `Should have nothing in run queue`)
    assert.equal(program.waiting.size, 1,
                 `Should have one non-runnable pipeline`)

    program.env = new Env(INTERFACE.userData)
    program.notify('first', df)
    assert.equal(program.waiting.size, 0,
                 `Waiting set should be empty`)
    assert.equal(program.queue.length, 1,
                 `Should have one pipeline in queue`)
    assert(program.queue[0].equal(second),
           `Expected pipeline not in queue`)
    done()
  })

  it('makes something runnable when its last dependency resolves', (done) => {
    const program = new Program()
    program.env = new Env(INTERFACE.userData)
    const requires = ['first', 'second', 'third']
    const last = new fixture.MockTransform('last', fixture.pass, requires, null, true, true)
    const lastPipe = new Pipeline(last)
    const df = new DataFrame([])

    program.register(lastPipe)
    assert.equal(program.waiting.size, 1,
                 `Should have one non-runnable pipeline`)

    for (const name of ['third', 'second']) {
      program.notify(name, df)
      assert(program.waiting.size > 0,
             `Pipeline should still be waiting`)
      assert.equal(program.queue.length, 0,
                   `Nothing should be runnable`)
    }

    program.notify('first', df)
    assert.equal(program.waiting.size, 0,
                 `Nothing should be waiting`)
    assert.equal(program.queue.length, 1,
                 `Should have something waiting in queue`)
    assert(program.queue[0].equal(lastPipe),
           `Should have pipeline in run queue`)
    done()
  })

  it('only makes some things runnable', (done) => {
    const program = new Program()
    program.env = new Env(INTERFACE.userData)
    const leftTransform = new fixture.MockTransform('left', fixture.pass, ['something'], null, true, true)
    const leftPipe = new Pipeline(leftTransform)
    const df = new DataFrame([])
    const rightTransform = new fixture.MockTransform('right', fixture.pass, ['else'], null, true, true)
    const rightPipe = new Pipeline(rightTransform)

    program.register(leftPipe)
    program.register(rightPipe)
    assert.equal(program.waiting.size, 2,
                 `Should have two non-runnable pipelines`)

    program.notify('else', df)
    assert.equal(program.waiting.size, 1,
                 `Should still have one waiting pipeline`)
    assert.equal(program.queue.length, 1,
                 `Should have one runnable pipeline`)
    assert(program.queue[0].equal(rightPipe),
           `Wrong pipeline is runnable`)
    done()
  })

  it('catches errors in pipelines', (done) => {
    const program = new Program()
    const transform = new fixture.MockTransform('transform',
                                (runner, df) => util.fail('error message'),
                                [], null, false, true)
    const failure = new Pipeline(transform)
    program.register(failure)

    const env = new Env(INTERFACE.userData)
    program.run(env)
    assert.equal(env.log.length, 2,
                 `No saved messages`)
    assert(env.log[0][0] === 'log',
           `First message should be log message`)
    assert(env.log[1][0] === 'error',
           `Second message should be log message`)
    assert(env.log[1][1].startsWith('error message'),
           `Error message incorrectly formatted`)
    done()
  })

  it('runs a single pipeline with no dependencies that does not notify', (done) => {
    const program = new Program()
    const pipeline = new Pipeline(fixture.HEAD, fixture.TAIL)
    program.register(pipeline)

    const env = new Env(INTERFACE.userData)
    program.run(env)
    assert.equal(env.results.size, 0,
                 `Nothing should be registered`)
    done()
  })

  it('runs a single pipeline with no dependencies that notifies', (done) => {
    const program = new Program()
    const pipeline = new Pipeline(fixture.HEAD, fixture.TAIL_NOTIFY)
    program.register(pipeline)

    const env = new Env(INTERFACE.userData)
    program.run(env)
    assert(env.getData('keyword').equal(fixture.TABLE),
           `Missing or incorrect table`)
    done()
  })

  it('runs two independent pipelines in some order', (done) => {
    const program = new Program()
    const tailLocal = new fixture.MockTransform('tailLocal', fixture.pass, [], 'local', true, false)
    const pipeLocal = new Pipeline(fixture.HEAD, tailLocal)
    program.register(pipeLocal)
    const pipeNotify = new Pipeline(fixture.HEAD, fixture.TAIL_NOTIFY)
    program.register(pipeNotify)

    const env = new Env(INTERFACE.userData)
    program.run(env)
    assert(env.getData('keyword').equal(fixture.TABLE),
           `Missing or incorrect table`)
    assert(env.getData('local').equal(fixture.TABLE),
           `Missing or incorrect table`)
    done()
  })

  it('runs pipelines that depend on each other', (done) => {
    const program = new Program()
    const headRequire = new fixture.MockTransform('headRequire',
                                      (runner, df) => fixture.TABLE,
                                      ['keyword'], null, false, true)
    const tailLocal = new fixture.MockTransform('tailLocal', fixture.pass,
                                    [], 'local', true, false)
    const pipeNotify = new Pipeline(fixture.HEAD, fixture.TAIL_NOTIFY)
    const pipeRequireLocal = new Pipeline(headRequire, tailLocal)
    program.register(pipeNotify)
    program.register(pipeRequireLocal)

    const env = new Env(INTERFACE.userData)
    program.run(env)
    assert(env.getData('keyword').equal(fixture.TABLE),
           `Missing or incorrect table`)
    assert(env.getData('local').equal(fixture.TABLE),
           `Missing or incorrect table`)
    done()
  })

  it('handles a join correctly', (done) => {
    const program = new Program()
    const tailAlpha = new fixture.MockTransform('tailAlpha', fixture.pass, [], 'alpha', true, false)
    const tailBeta = new fixture.MockTransform('tailBeta', fixture.pass, [], 'beta', true, false)
    const join = new Transform.join('alpha', 'left', 'beta', 'left')

    program.register(new Pipeline(fixture.HEAD, tailAlpha))
    program.register(new Pipeline(fixture.HEAD, tailBeta))
    program.register(new Pipeline(join, fixture.TAIL_NOTIFY))

    const env = new Env(INTERFACE.userData)
    program.run(env)
    assert.equal(env.log.length, 6,
                 `Should have run 6 stages`)

    const data = [{alpha_right: 10, beta_right: 10 },
                  {alpha_right: 20, beta_right: 20 }]
    data[0][DataFrame.JOINCOL] = 1
    data[1][DataFrame.JOINCOL] = 2
    const expected = new DataFrame(data)
    assert(env.getData('keyword').equal(expected),
           `Missing or incorrect result from join`)

    done()
  })
})
