import * as core from '@actions/core'

import {GetLabelsParams, matchLabelConditions} from '../../src/github/labels'

describe('matchLabelConditions', () => {
  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  beforeEach(() => {
    mockGetInput({
      labeled: '',
      'label-operator': '',
    })
  })

  test('validate label defaults to true', async () => {
    const issue: GetLabelsParams = {
      number: 1,
      labels: [],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })

  test('does not add un-matching issues with a label filter without label-operator', async () => {
    mockGetInput({
      labeled: 'bug',
    })
    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'not-bug',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(false)
  })

  test('adds matching issues with a label filter without label-operator', async () => {
    mockGetInput({
      labeled: 'bug, new',
    })

    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'bug',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })

  test('adds matching issues with labels filter with AND label-operator', async () => {
    mockGetInput({
      labeled: 'bug, new',
      'label-operator': 'AND',
    })

    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'bug',
        },
        {
          name: 'new',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })

  test('does not add un-matching issues with labels filter with AND label-operator', async () => {
    mockGetInput({
      labeled: 'bug, new',
      'label-operator': 'AND',
    })

    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'bug',
        },
        {
          name: 'other',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(false)
  })

  test('does not add matching issues with labels filter with NOT label-operator', async () => {
    mockGetInput({
      labeled: 'bug, new',
      'label-operator': 'NOT',
    })

    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'bug',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(false)
  })

  test('adds issues that do not have labels present in the label list with NOT label-operator', async () => {
    mockGetInput({
      labeled: 'bug, new',
      'label-operator': 'NOT',
    })
    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'other',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })

  test('adds matching issues with multiple label filters', async () => {
    mockGetInput({
      labeled: 'accessibility,backend,bug',
    })
    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'accessibility',
        },
        {
          name: 'backend',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })

  test('does not add un-matching issues with multiple label filters', async () => {
    mockGetInput({
      labeled: 'accessibility, backend, bug',
    })

    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'data',
        },
        {
          name: 'frontend',
        },
        {
          name: 'improvement',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(false)
  })

  test('handles spaces and extra commas gracefully in label filter input', async () => {
    mockGetInput({
      labeled: 'accessibility  ,   backend    ,,   ,     bug',
      'label-operator': 'AND',
    })

    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'accessibility',
        },
        {
          name: 'backend',
        },
        {
          name: 'bug',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })

  test('compares labels case-insensitively', async () => {
    mockGetInput({
      labeled: 'FOO, Bar, baz',
      'label-operator': 'AND',
    })
    const issue: GetLabelsParams = {
      number: 1,
      labels: [
        {
          name: 'foo',
        },
        {
          name: 'BAR',
        },
        {
          name: 'baZ',
        },
      ],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })
})

function mockGetInput(mocks: Record<string, string>): jest.SpyInstance {
  const mock = (key: string) => mocks[key] ?? ''
  return jest.spyOn(core, 'getInput').mockImplementation(mock)
}
