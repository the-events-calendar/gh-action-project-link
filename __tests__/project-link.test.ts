import * as core from '@actions/core'
import * as github from '@actions/github'

import {projectLink} from '../src/project-link'

interface ValidIssuePayload {
  base: {
    ref: string
  }
  node_id: string
  number: number
  labels: {
    name: string
  }[]
  html_url: string
}
const getValidIssuePayload = (extraPayload = {}): ValidIssuePayload => {
  const validIssuePayload = {
    base: {
      ref: 'main',
    },
    // eslint-disable-next-line camelcase
    node_id: 'mock_node_id',
    number: 1,
    labels: [],
    // eslint-disable-next-line camelcase
    html_url: 'https://github.com/stellarwp/gh-action-project-link/issues/74',
  }

  return {...validIssuePayload, ...extraPayload}
}

interface ValidRepositoryPayload {
  name: string
  owner: {
    login: string
    node_id: string
  }
}
const getValidRepositoryPayload = (extraPayload = {}): ValidRepositoryPayload => {
  const validRepositoryPayload = {
    name: 'gh-actions-project-link',
    owner: {
      login: 'stellarwp',
      // eslint-disable-next-line camelcase
      node_id: 'mock_node_id',
    },
  }

  return {...validRepositoryPayload, ...extraPayload}
}

describe('projectLink', () => {
  let outputs: Record<string, string>

  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  beforeEach(() => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
    })

    outputs = mockSetOutput()
  })

  afterEach(() => {
    github.context.payload = {}
    jest.restoreAllMocks()
  })

  test('adds an issue from the same organization to the project', async () => {
    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'bug'}]}),
      repository: getValidRepositoryPayload(),
    }

    mockGraphQL(
      {
        test: /projectsV2/,
        return: {
          organization: {
            projectsV2: {
              totalCount: 1,
              edges: [
                {
                  node: {
                    id: 'PVT_kwDOBHOeCc4Ac4dt',
                    title: 'Main',
                    number: 1,
                  },
                },
              ],
            },
          },
        },
      },
      {
        test: /getProject/,
        return: {
          organization: {
            projectV2: {
              id: 'project-id',
            },
          },
        },
      },
      {
        test: /addProjectV2ItemById/,
        return: {
          addProjectV2ItemById: {
            item: {
              id: 'project-item-id',
              project: {
                url: 'https://github.com/orgs/stellarwp/projects/1',
              },
            },
          },
        },
      },
    )

    await projectLink()

    expect(outputs.itemId).toEqual('project-item-id')
  })

  test(`works with URLs that are not under the github.com domain`, async () => {
    github.context.payload = {
      issue: getValidIssuePayload({
        // eslint-disable-next-line camelcase
        html_url: 'https://notgithub.com/stellarwp/gh-action-project-link/issues/74',
      }),
      repository: getValidRepositoryPayload(),
    }

    mockGraphQL(
      {
        test: /projectsV2/,
        return: {
          organization: {
            projectsV2: {
              totalCount: 1,
              edges: [
                {
                  node: {
                    id: 'PVT_kwDOBHOeCc4Ac4dt',
                    title: 'Main',
                    number: 1,
                  },
                },
              ],
            },
          },
        },
      },
      {
        test: /getProject/,
        return: {
          organization: {
            projectV2: {
              id: 'project-id',
            },
          },
        },
      },
      {
        test: /addProjectV2ItemById/,
        return: {
          addProjectV2ItemById: {
            item: {
              id: 'project-item-id',
              project: {
                url: 'https://github.com/orgs/stellarwp/projects/1',
              },
            },
          },
        },
      },
    )

    await projectLink()

    expect(outputs.itemId).toEqual('project-item-id')
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

function mockGraphQL(...mocks: {test: RegExp; return: unknown}[]): jest.Mock {
  const mock = jest.fn().mockImplementation((query: string) => {
    const match = mocks.find(m => m.test.test(query))

    if (match) {
      return match.return
    }

    throw new Error(`Unexpected GraphQL query: ${query}`)
  })

  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      graphql: mock,
    } as unknown as ReturnType<typeof github.getOctokit>
  })

  return mock
}
