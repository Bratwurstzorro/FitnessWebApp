import test from 'node:test'
import assert from 'node:assert/strict'
import { createJwtRetryFetch } from './jwtRetry.js'

const project = 'https://test.supabase.co'
const endpoint = project + '/rest/v1/training_session_sets'
const rejected = () => Response.json({code: 'PGRST303', message: 'JWT issued at future'}, {status: 401})

test('temporary clock skew retries the same body, method and authorization then returns success', async () => {
  const calls = [], delays = []
  const fetcher = createJwtRetryFetch(project, async request => {
    calls.push({method: request.method, body: await request.text(), auth: request.headers.get('authorization')})
    return calls.length === 1 ? rejected() : Response.json([{id: 'saved'}])
  }, async delay => delays.push(delay))
  const result = await fetcher(endpoint, {method: 'POST', headers: {authorization: 'Bearer test-token'}, body: '{"reps":12}'})
  assert.deepEqual(await result.json(), [{id: 'saved'}])
  assert.deepEqual(delays, [1000])
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], calls[1])
})

test('persistent rejection stops after two retries and keeps its readable error', async () => {
  let calls = 0
  const delays = []
  const fetcher = createJwtRetryFetch(project, async () => {calls++; return rejected()}, async delay => delays.push(delay))
  const result = await fetcher(endpoint)
  assert.equal(calls, 3)
  assert.deepEqual(delays, [1000, 2000])
  assert.equal(result.status, 401)
  assert.equal((await result.json()).message, 'JWT issued at future')
})

test('successful requests, expired tokens, RLS errors and malformed errors are not retried', async () => {
  for (const response of [
    Response.json([]),
    Response.json({code: 'PGRST303', message: 'JWT expired'}, {status: 401}),
    Response.json({code: '42501', message: 'permission denied'}, {status: 403}),
    Response.json({code: 'OTHER', message: 'JWT issued at future'}, {status: 401}),
    new Response('unavailable', {status: 401}),
  ]) {
    let calls = 0
    const fetcher = createJwtRetryFetch(project, async () => {calls++; return response}, async () => assert.fail('unexpected delay'))
    assert.equal(await fetcher(endpoint), response)
    assert.equal(calls, 1)
  }
})

test('auth endpoints, other hosts and network failures never replay a request', async () => {
  for (const url of [project + '/auth/v1/token', 'https://other.supabase.co/rest/v1/test']) {
    let calls = 0
    const fetcher = createJwtRetryFetch(project, async () => {calls++; return rejected()}, async () => assert.fail())
    await fetcher(url)
    assert.equal(calls, 1)
  }
  let calls = 0
  const fetcher = createJwtRetryFetch(project, async () => {calls++; throw new TypeError('network failure')})
  await assert.rejects(fetcher(endpoint, {method: 'POST', body: '{}'}), /network failure/)
  assert.equal(calls, 1)
})

test('aborting during the delay prevents any subsequent request', async () => {
  const controller = new AbortController()
  let calls = 0
  const fetcher = createJwtRetryFetch(project, async () => {calls++; controller.abort(); return rejected()})
  await assert.rejects(fetcher(endpoint, {signal: controller.signal}), {name: 'AbortError'})
  assert.equal(calls, 1)
})
