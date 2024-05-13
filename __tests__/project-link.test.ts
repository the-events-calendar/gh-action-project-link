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

  test('adds matching issues with a label filter without label-operator', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'bug, new',
    })

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

  test('adds matching pull-requests with a label filter without label-operator', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'bug, new',
    })

    github.context.payload = {
      // eslint-disable-next-line camelcase
      pull_request: getValidIssuePayload({labels: [{name: 'bug'}]}),
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

  test('adds matching issues with labels filter with AND label-operator', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'bug, new',
      'label-operator': 'AND',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'bug'}, {name: 'new'}]}),
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

  test('does not add un-matching issues with labels filter with AND label-operator', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'bug, new',
      'label-operator': 'AND',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'bug'}, {name: 'other'}]}),
      repository: getValidRepositoryPayload(),
    }

    const infoSpy = jest.spyOn(core, 'info')
    const gqlMock = mockGraphQL()
    await projectLink()
    expect(infoSpy).toHaveBeenCalledWith(`Skipping issue 1 because it doesn't match all the labels: bug, new`)
    expect(gqlMock).not.toHaveBeenCalled()
  })

  test('does not add matching issues with labels filter with NOT label-operator', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'bug, new',
      'label-operator': 'NOT',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'bug'}]}),
      repository: getValidRepositoryPayload(),
    }

    const infoSpy = jest.spyOn(core, 'info')
    const gqlMock = mockGraphQL()
    await projectLink()
    expect(infoSpy).toHaveBeenCalledWith(`Skipping issue 1 because it contains one of the labels: bug, new`)
    expect(gqlMock).not.toHaveBeenCalled()
  })

  test('adds issues that do not have labels present in the label list with NOT label-operator', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'bug, new',
      'label-operator': 'NOT',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'Other'}]}),
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
              id: 'project-next-id',
            },
          },
        },
      },
      {
        test: /addProjectV2ItemById/,
        return: {
          addProjectV2ItemById: {
            item: {
              id: 'project-next-item-id',
              project: {
                url: 'https://github.com/orgs/stellarwp/projects/1',
              },
            },
          },
        },
      },
    )

    await projectLink()

    expect(outputs.itemId).toEqual('project-next-item-id')
  })

  test('adds matching issues with multiple label filters', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'accessibility,backend,bug',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'accessibility'}, {name: 'backend'}]}),
      repository: getValidRepositoryPayload(),
    }

    const gqlMock = mockGraphQL(
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

    const infoSpy = jest.spyOn(core, 'info')

    await projectLink()

    expect(gqlMock).toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledWith('Creating project item')
    // We shouldn't have any logs relating to the issue being skipped
    expect(infoSpy.mock.calls.length).toEqual(1)
    expect(outputs.itemId).toEqual('project-item-id')
  })

  test('does not add un-matching issues with multiple label filters', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'accessibility, backend, bug',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'data'}, {name: 'frontend'}, {name: 'improvement'}]}),
      repository: getValidRepositoryPayload(),
    }

    const infoSpy = jest.spyOn(core, 'info')
    const gqlMock = mockGraphQL()
    await projectLink()
    expect(infoSpy).toHaveBeenCalledWith(
      `Skipping issue 1 because it does not have one of the labels: accessibility, backend, bug`,
    )
    expect(gqlMock).not.toHaveBeenCalled()
  })

  test('handles spaces and extra commas gracefully in label filter input', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'accessibility  ,   backend    ,,  . ,     bug',
    })

    github.context.payload = {
      issue: getValidIssuePayload({
        labels: [{name: 'accessibility'}, {name: 'backend'}, {name: 'bug'}],
        'label-operator': 'AND',
      }),
      repository: getValidRepositoryPayload(),
    }

    const gqlMock = mockGraphQL(
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

    const infoSpy = jest.spyOn(core, 'info')

    await projectLink()

    expect(gqlMock).toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledWith('Creating project item')
    // We shouldn't have any logs relating to the issue being skipped
    expect(infoSpy.mock.calls.length).toEqual(1)
    expect(outputs.itemId).toEqual('project-item-id')
  })

  test(`throws an error when url isn't a valid project url`, async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/github/repositories',
      'github-token': 'gh_token',
    })

    github.context.payload = {
      issue: getValidIssuePayload(),
      repository: getValidRepositoryPayload(),
    }

    const infoSpy = jest.spyOn(core, 'info')
    const gqlMock = mockGraphQL()
    await expect(projectLink()).rejects.toThrow(
      'Invalid project URL: https://github.com/orgs/github/repositories. Project URL should match the format <GitHub server domain name>/<orgs-or-users>/<ownerName>/projects/<projectNumber>',
    )
    expect(infoSpy).not.toHaveBeenCalled()
    expect(gqlMock).not.toHaveBeenCalled()
  })

  test(`works with URLs that are not under the github.com domain`, async () => {
    github.context.payload = {
      issue: {
        number: 1,
        labels: [{name: 'bug'}],
        // eslint-disable-next-line camelcase
        html_url: 'https://notgithub.com/stellarwp/gh-action-project-link/issues/74',
      },
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

  test('constructs the correct graphQL query given an organization owner', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'project-owner': 'stellarwp',
      'github-token': 'gh_token',
      labeled: 'bug, new',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'bug'}]}),
      repository: getValidRepositoryPayload(),
    }

    const gqlMock = mockGraphQL(
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

    expect(gqlMock).toHaveBeenNthCalledWith(1, expect.stringContaining('organization(login: $projectOwnerName)'), {
      projectOwnerName: 'stellarwp',
      projectNumber: 1,
    })
  })

  test('constructs the correct graphQL query given a user owner', async () => {
    mockGetInput({
      'project-url': 'https://github.com/users/monalisa/projects/1',
      'github-token': 'gh_token',
      labeled: 'bug, new',
    })

    github.context.payload = {
      issue: getValidIssuePayload({
        labels: [{name: 'bug'}],
        // eslint-disable-next-line camelcase
        html_url: 'https://github.com/monalisa/gh-action-project-link/issues/74',
      }),
      repository: getValidRepositoryPayload({
        login: 'monalisa',
        // eslint-disable-next-line camelcase
        node_id: 'valid_node_id',
      }),
    }

    const gqlMock = mockGraphQL(
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

    expect(gqlMock).toHaveBeenNthCalledWith(1, expect.stringContaining('user(login: $projectOwnerName)'), {
      projectOwnerName: 'monalisa',
      projectNumber: 1,
    })
  })

  test('compares labels case-insensitively', async () => {
    mockGetInput({
      'project-url': 'https://github.com/orgs/stellarwp/projects/1',
      'github-token': 'gh_token',
      labeled: 'FOO, Bar, baz',
      'label-operator': 'AND',
    })

    github.context.payload = {
      issue: getValidIssuePayload({labels: [{name: 'foo'}, {name: 'BAR'}, {name: 'baz'}]}),
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
              id: 'project-next-id',
            },
          },
        },
      },
      {
        test: /addProjectV2ItemById/,
        return: {
          addProjectV2ItemById: {
            item: {
              id: 'project-next-item-id',
              project: {
                url: 'https://github.com/orgs/stellarwp/projects/1',
              },
            },
          },
        },
      },
    )

    await projectLink()

    expect(outputs.itemId).toEqual('project-next-item-id')
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
