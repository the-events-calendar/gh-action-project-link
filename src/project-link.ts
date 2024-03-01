import * as core from '@actions/core'
import * as github from '@actions/github'
import {minimatch} from 'minimatch'

import {getProjectId, addIssueToProject, copyProjectTemplate, getFirstProjectFromSearch} from './queries'

import {mustGetOwnerTypeQuery, parseProjectName, parseProjectUrl} from './utils'

export async function projectLink(): Promise<void> {
  const ownerType = mustGetOwnerTypeQuery(github.context.payload.repository?.owner.type)
  const ownerName = github.context.payload.repository?.owner.login ?? ''
  const ownerId = github.context.payload.repository?.owner.id ?? ''

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

  const labeled =
    core
      .getInput('labeled')
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0) ?? []
  const labelOperator = core.getInput('label-operator').trim().toLocaleLowerCase()
  const issueLabels: string[] = (issue?.labels ?? []).map((l: {name: string}) => l.name.toLowerCase())

  core.debug(`Issue/PR owner: ${ownerName}`)
  core.debug(`Issue/PR labels: ${issueLabels.join(', ')}`)

  // Ensure the issue matches our `labeled` filter based on the label-operator.
  if (labelOperator === 'and') {
    if (!labeled.every(l => issueLabels.includes(l))) {
      core.info(`Skipping issue ${issue?.number} because it doesn't match all the labels: ${labeled.join(', ')}`)
      return
    }
  } else if (labelOperator === 'not') {
    if (labeled.length > 0 && issueLabels.some(l => labeled.includes(l))) {
      core.info(`Skipping issue ${issue?.number} because it contains one of the labels: ${labeled.join(', ')}`)
      return
    }
  } else {
    if (labeled.length > 0 && !issueLabels.some(l => labeled.includes(l))) {
      core.info(`Skipping issue ${issue?.number} because it does not have one of the labels: ${labeled.join(', ')}`)
      return
    }
  }

  let projectId = await getFirstProjectFromSearch({search: projectName, ownerType, ownerName})

  if (!projectId) {
    let projectNumber = parseInt(core.getInput('template-project-number') ?? 0, 10)

    if (!projectNumber) {
      const templateProjectUrl = core.getInput('template-project-url')
      const parsedProject = parseProjectUrl(templateProjectUrl)
      projectNumber = parsedProject?.projectNumber

      core.debug(`Template Project URL: ${templateProjectUrl}`)
    }
    core.debug(`Project number: ${projectNumber}`)

    const templateProjectId = await getProjectId({ownerType, ownerName, projectNumber}).catch(err => {
      core.debug(`Error: ${err.message}`)
      return undefined
    })

    if (!templateProjectId) {
      core.info(`No template project URL provided or invalid. Will create a project without a template.`)
    }

    projectId = await copyProjectTemplate({projectId: templateProjectId, title: projectName, ownerId})
  }

  const addResp = await addIssueToProject({projectId, contentId, issueNumber: issue?.number})

  core.info(`Pull Request: ${issue?.html_url}`)
  core.info(`Project: ${addResp.url}`)

  core.setOutput('pullRequestUrl', issue?.html_url)
  core.setOutput('project', addResp.url)
  core.setOutput('itemId', addResp.id)
}
