import * as core from '@actions/core'
import * as github from '@actions/github'

import {GetLabelsParams, matchLabelConditions} from '../../src/github/labels'

describe('matchLabelConditions', () => {
  let outputs: Record<string, string>

  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  beforeEach(() => {
    mockGetInput({
      labeled: '',
      'label-operator': '',
    })

    outputs = mockSetOutput()
  })

  test('validate label defaults to true', async () => {
    const issue: GetLabelsParams = {
      number: 1,
      labels: [],
    }
    const matchedLabelConditions = await matchLabelConditions(issue)

    expect(matchedLabelConditions).toEqual(true)
  })
})

function mockGetInput(mocks: Record<string, string>): jest.SpyInstance {
  const mock = (key: string) => mocks[key] ?? ''
  return jest.spyOn(core, 'getInput').mockImplementation(mock)
}

function mockSetOutput(): Record<string, string> {
  const output: Record<string, string> = {}
  jest.spyOn(core, 'setOutput').mockImplementation((key, value) => (output[key] = value))
  return output
}
