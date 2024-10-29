import * as core from '@actions/core'
import * as github from '@actions/github'
import * as _ from 'lodash'

/**
 * Given a GitHub token, return an Octokit instance.
 *
 * @since 1.0.0
 *
 * @param {string} token The GitHub token. (optional)
 */
export const getOctokit = (token?: string) => {
  return github.getOctokit(token ?? core.getInput('github-token', {required: true}))
}

export interface ParseProjectName {
  baseBranch: string
  prefixRemove?: string
  suffixRemove?: string
  replaceWithSpaces?: string
}

/**
 * Given a base branch value, do some string manipulation to get a project name.
 *
 * @since 1.0.0
 *
 * @param {ParseProjectName} params To handle the projectName manipulation. (required)
 *
 * @returns {string} The project name.
 */
export const parseProjectName = (params: ParseProjectName): string => {
  const {baseBranch, prefixRemove, suffixRemove, replaceWithSpaces} = params

  let projectName = baseBranch
  if (prefixRemove) {
    const safePrefixRemove = _.escapeRegExp(prefixRemove)
    projectName = projectName.replace(new RegExp(`^${safePrefixRemove}`, 'i'), '')
  }

  if (suffixRemove) {
    const safeSuffixRemove = _.escapeRegExp(suffixRemove)
    projectName = projectName.replace(new RegExp(`${safeSuffixRemove}$`, 'i'), '')
  }

  if (replaceWithSpaces) {
    for (const charToReplace of replaceWithSpaces.split('')) {
      const safeCharToReplace = _.escapeRegExp(charToReplace)
      projectName = projectName.replace(new RegExp(safeCharToReplace, 'g'), ' ')
    }
  }

  return projectName
}

export interface ParsedProjectUrl {
  ownerType: 'organization' | 'user'
  ownerName: string
  projectNumber: number
}

export const parseProjectUrl = (url: string): ParsedProjectUrl => {
  const projectUrlParse = /\/(?<ownerType>orgs|users)\/(?<ownerName>[^/]+)\/projects\/(?<projectNumber>\d+)/

  const urlMatch = url.match(projectUrlParse)

  if (!urlMatch) {
    throw new Error(
      `Invalid project URL: ${url}. Project URL should match the format <GitHub server domain name>/<orgs-or-users>/<ownerName>/projects/<projectNumber>`,
    )
  }

  const ownerName = urlMatch.groups?.ownerName ?? ''
  const projectNumber = parseInt(urlMatch.groups?.projectNumber ?? '', 10)
  const rawOwnerType = urlMatch.groups?.ownerType
  const ownerType = mustGetOwnerTypeQuery(rawOwnerType)

  if (!ownerName) {
    throw new Error(`Empty Owner Name`)
  }

  return {
    ownerName,
    ownerType,
    projectNumber,
  }
}

export function mustGetOwnerTypeQuery(ownerType?: string): 'organization' | 'user' {
  const defaultOwnerType = 'organization'
  const validOrganizationTypes = ['orgs', 'organization', 'org', 'organizations']
  const validUserTypes = ['users', 'user']
  if (!ownerType) {
    return defaultOwnerType
  }

  if (validOrganizationTypes.includes(ownerType.toLowerCase())) {
    return 'organization'
  } else if (validUserTypes.includes(ownerType.toLowerCase())) {
    return 'user'
  }

  throw new Error(
    `Unsupported ownerType: ${ownerType}. Must be one of 'orgs', 'organization', 'org', 'organizations' or 'users', 'user'`,
  )
}
