import { describe, expect, test } from 'bun:test'
import {
  normalizeCommitMessage,
  parseCommitMessage,
  type CommitMessageValidationErrorCode,
} from '../commitMessage'

function expectInvalid(
  message: string,
  code: CommitMessageValidationErrorCode
) {
  const result = normalizeCommitMessage(message)
  expect(result.ok).toBe(false)
  if (result.ok) {
    throw new Error('Expected commit message to be invalid')
  }
  expect(result.error.code).toBe(code)
}

describe('commitMessage', () => {
  test('keeps an already valid commit message unchanged', () => {
    const message = 'fix(server): preserve websocket state\n\nBody stays the same.\n'
    const result = normalizeCommitMessage(message)

    expect(result).toMatchObject({
      ok: true,
      changed: false,
      normalizedMessage: message,
    })
  })

  test('normalizes type, scope, whitespace, and colon spacing', () => {
    const result = normalizeCommitMessage(
      '  FIX ( Server/Core ) :   tighten reconnect handling  '
    )

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      normalizedMessage: 'fix(server/core): tighten reconnect handling',
    })
  })

  test('supports no-scope and breaking-change headers', () => {
    const result = normalizeCommitMessage(
      '  FEAT ! : remove legacy websocket fallback '
    )

    expect(result).toMatchObject({
      ok: true,
      normalizedMessage: 'feat!: remove legacy websocket fallback',
    })
  })

  test('preserves body and trailers verbatim while normalizing only the header', () => {
    const message = [
      ' Docs ( README ) :  clarify install steps ',
      '',
      'Keep this body line exactly as written.  ',
      '',
      'Nightshift-Task: commit-normalize',
      'Nightshift-Ref: https://github.com/marcus/nightshift',
      '',
    ].join('\n')

    const result = normalizeCommitMessage(message)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected commit message normalization to succeed')
    }

    expect(result.normalizedMessage).toBe(
      [
        'docs(readme): clarify install steps',
        '',
        'Keep this body line exactly as written.  ',
        '',
        'Nightshift-Task: commit-normalize',
        'Nightshift-Ref: https://github.com/marcus/nightshift',
        '',
      ].join('\n')
    )
  })

  test('parses valid commit headers for downstream consumers', () => {
    const result = parseCommitMessage('fix(ci)!: harden release permissions')

    expect(result).toMatchObject({
      ok: true,
      parsed: {
        type: 'fix',
        scope: 'ci',
        isBreakingChange: true,
        subject: 'harden release permissions',
      },
    })
  })

  test('rejects freeform subjects instead of guessing intent', () => {
    expectInvalid('Update release workflow', 'invalid_header')
  })

  test('rejects unsupported types', () => {
    expectInvalid('feature: add commit normalizer', 'unsupported_type')
  })

  test('rejects scopes that are not safely normalizable', () => {
    expectInvalid('fix(UI shell): tighten layout', 'invalid_scope')
  })

  test('rejects headers without subject text', () => {
    expectInvalid('fix(scope):   ', 'missing_subject')
  })

  test('rejects empty commit subjects', () => {
    expectInvalid('   \n\nBody', 'empty_message')
  })
})
