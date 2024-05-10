import * as core from '@actions/core'
import * as github from '@actions/github'
import {minimatch} from 'minimatch'

import {getProjectId, addIssueToProject, copyProjectTemplate, getFirstProjectFromSearch} from './queries'
import {matchLabelConditions} from './github/labels'

import {mustGetOwnerTypeQuery, parseProjectName, parseProjectUrl} from './utils'

export async function projectLink(): Promise<void> {
  const ownerType = mustGetOwnerTypeQuery(github.context.payload.repository?.owner.type)
  const ownerName = github.context.payload.repository?.owner.login ?? ''
  const ownerId = github.context.payload.repository?.owner.node_id ?? ''

  if (!ownerName || !ownerId) {
    throw new Error('Could not determine repository owner')
  }

  const baseBranchPattern = core.getInput('base-branch-pattern') ?? '*'

  const issue = github.context.payload.issue ?? github.context.payload.pull_request
  const baseBranch = issue?.base?.ref ?? 'main'

  if (!issue) {
    throw new Error('No issue or pull request found in payload')
  }

  if (!baseBranch) {
    throw new Error('This action can only be run on pull_request events')
  }

  if (baseBranchPattern && !minimatch(baseBranch, baseBranchPattern)) {
    core.info(`Skipping issue because base branch ${baseBranch} does not match pattern ${baseBranchPattern}`)
    return
  }

  const contentId = issue?.node_id
  if (!contentId) {
    throw new Error('Could not determine issue or pull request ID')
  }

  core.debug(`Pull Request ID: ${contentId}`)
  core.debug(`Project owner: ${ownerName}`)
  core.debug(`Project owner type: ${ownerType}`)

  const projectName = parseProjectName({
    baseBranch,
    prefixRemove: core.getInput('name-prefix-remove'),
    suffixRemove: core.getInput('name-suffix-remove'),
    replaceWithSpaces: core.getInput('replace-with-spaces'),
  })

  if (!matchLabelConditions({labels: issue?.labels, number: issue?.number})) {
    throw new Error('Issue does not match label conditions')
  }

  let projectId = await getFirstProjectFromSearch({search: projectName, ownerType, ownerName})

  core.debug(`Project ID: ${projectId}`)

  if (!projectId) {
    let projectNumber = parseInt(core.getInput('template-project-number') ?? 0, 10)

    if (!projectNumber) {
      const templateProjectUrl = core.getInput('template-project-url')
      const parsedProject = parseProjectUrl(templateProjectUrl)
      projectNumber = parsedProject?.projectNumber

      core.debug(`Template Project URL: ${templateProjectUrl}`)
    }
    core.debug(`Template Project number: ${projectNumber}`)

    const templateProjectId = await getProjectId({ownerType, ownerName, projectNumber}).catch(err => {
      core.debug(`Error: ${err.message}`)
      return undefined
    })

    if (!templateProjectId) {
      core.info(`No template project URL provided or invalid. Will create a project without a template.`)
    }
    core.debug(`Template Project ID: ${templateProjectId}`)

    projectId = await copyProjectTemplate({projectId: templateProjectId, title: projectName, ownerId})
  }

  const addResp = await addIssueToProject({projectId, contentId, issueNumber: issue?.number})

  core.info(`Pull Request: ${issue?.html_url}`)
  core.info(`Project: ${addResp.url}`)

  core.setOutput('itemId', addResp.id)
}
