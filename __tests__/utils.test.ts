import {mustGetOwnerTypeQuery, parseProjectName} from '../src/utils'

describe('mustGetOwnerTypeQuery', () => {
  test('returns organization for orgs ownerType', async () => {
    const ownerTypeQuery = mustGetOwnerTypeQuery('orgs')

    expect(ownerTypeQuery).toEqual('organization')
  })

  test('returns organization for empty ownerType', async () => {
    const ownerTypeQuery = mustGetOwnerTypeQuery()

    expect(ownerTypeQuery).toEqual('organization')
  })

  test('returns organization for org ownerType', async () => {
    const ownerTypeQuery = mustGetOwnerTypeQuery('org')

    expect(ownerTypeQuery).toEqual('organization')
  })

  test('returns organization for organizations ownerType', async () => {
    const ownerTypeQuery = mustGetOwnerTypeQuery('organizations')

    expect(ownerTypeQuery).toEqual('organization')
  })

  test('returns organization for wrong case in param', async () => {
    const ownerTypeQuery = mustGetOwnerTypeQuery('Organizations')

    expect(ownerTypeQuery).toEqual('organization')
  })

  test('returns user for users ownerType', async () => {
    const ownerTypeQuery = mustGetOwnerTypeQuery('users')

    expect(ownerTypeQuery).toEqual('user')
  })

  test('returns user for wrong case in param', async () => {
    const ownerTypeQuery = mustGetOwnerTypeQuery('uSeRs')

    expect(ownerTypeQuery).toEqual('user')
  })

  test('throws an error when an unsupported ownerType is set', async () => {
    expect(() => {
      mustGetOwnerTypeQuery('unknown')
    }).toThrow(
      `Unsupported ownerType: unknown. Must be one of 'orgs', 'organization', 'org', 'organizations' or 'users', 'user'`,
    )
  })
})

describe('parseProjectName', () => {
  test('returns the given branch without changes when no param', async () => {
    const baseBranch = 'main'
    const projectName = parseProjectName({baseBranch})

    expect(projectName).toEqual('main')
  })

  test('returns the given branch without the prefix when a prefixRemove is passed', async () => {
    const baseBranch = 'feature/work'
    const prefixRemove = 'feature/'
    const projectName = parseProjectName({baseBranch, prefixRemove})

    expect(projectName).toEqual('work')
  })

  test('returns the given branch without the suffix when a suffixRemove is passed', async () => {
    const baseBranch = 'feature/work'
    const sufixRemove = '/work'
    const projectName = parseProjectName({baseBranch, sufixRemove})

    expect(projectName).toEqual('feature')
  })

  test('returns the given branch with the a set of chars replaced by spaces', async () => {
    const baseBranch = 'feature-work-branch_issue'
    const replaceWithSpaces = '-_'
    const projectName = parseProjectName({baseBranch, replaceWithSpaces})

    expect(projectName).toEqual('feature work branch issue')
  })
})
