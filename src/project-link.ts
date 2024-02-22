import * as core from '@actions/core'
import * as github from '@actions/github'
import {minimatch} from 'minimatch'

// Local imports.
import {
  ProjectNodeIDResponse,
  ProjectsEdgesNodesResponse,
  ProjectAddItemResponse,
  ProjectCopyTemplateResponse,
  ParsedProjectUrl,
} from './interfaces'
import {mustGetOwnerTypeQuery, parseProjectName, parseProjectUrl} from './utils'

export async function getProjectId(params: ParsedProjectUrl): Promise<string | void> {
  const {ownerName, projectNumber, ownerType} = params
  const octokit = getOctokit()

  // First, use the GraphQL API to request the template project's node ID.
  const idResp = await octokit.graphql<ProjectNodeIDResponse>(
    `query getProject($ownerName: String!, $projectNumber: Int!) {
          ${ownerType}(login: $ownerNamee) {
            projectV2(number: $projectNumber) {
              id
            }
          }
        }`,
    {
      ownerName,
      projectNumber,
    },
  )

  const projectId = idResp[ownerType]?.projectV2.id

  core.debug(`Project node ID: ${projectId}`)
  return projectId
}

const getOctokit = (token?: string) => github.getOctokit(token ?? core.getInput('github-token', {required: true}))

export async function projectLink(): Promise<void> {
  const ghToken = core.getInput('github-token', {required: true})

  const ownerType = mustGetOwnerTypeQuery(github.context.payload.repository?.owner.type)
  const ownerName = github.context.payload.repository?.owner.name ?? ''
  const ownerId = github.context.payload.repository?.owner.id ?? ''

  if (!ownerName || !ownerId) {
    throw new Error('Could not determine repository owner')
  }

  const baseBranchPattern = core.getInput('base-branch-pattern') ?? '*'

  const octokit = github.getOctokit(ghToken)
  const issue = github.context.payload.issue ?? github.context.payload.pull_request
  const baseBranch = issue?.base?.ref ?? 'main'

  if (!baseBranch) {
    throw new Error('This action can only be run on pull_request events')
  }

  if (baseBranchPattern) {
    if (!minimatch(baseBranch, baseBranchPattern)) {
      core.info(`Skipping issue because base branch ${baseBranch} does not match pattern ${baseBranchPattern}`)
      return
    }
  }

  const projectName = parseProjectName({
    baseBranch,
    prefixRemove: core.getInput('prefix-remove'),
    sufixRemove: core.getInput('sufix-remove'),
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

  let projectNumber = parseInt(core.getInput('template-project-number') ?? 0, 10)

  if (!projectNumber) {
    const templateProjectUrl = core.getInput('template-project-url')
    const parsedProject = parseProjectUrl(templateProjectUrl)
    projectNumber = parsedProject?.projectNumber

    core.debug(`Template Project URL: ${templateProjectUrl}`)
  }
  core.debug(`Project owner: ${ownerName}`)
  core.debug(`Project number: ${projectNumber}`)
  core.debug(`Project owner type: ${ownerType}`)

  const templateProjectId = await getProjectId({ownerType, ownerName, projectNumber}).catch(err => {
    core.debug(`Error: ${err.message}`)
    return null
  })

  if (!templateProjectId) {
    core.info(`No template project URL provided or invalid. Will create a project without a template.`)
  }

  const contentId = issue?.node_id
  core.debug(`Content ID: ${contentId}`)

  const queryString = projectName
  const getProjectsQuery = `query {
    ${ownerType}(login:"${ownerName}") {
      projectsV2(first:100 query:"${queryString}") {
        totalCount
        edges {
          node {
            id
            title
            number
          }
        }
      }
    }
  }`
  core.debug(`Projects Query: \n ${getProjectsQuery}`)

  // First, use the GraphQL API to request the template project's node ID.
  const searchResp = await octokit.graphql<ProjectsEdgesNodesResponse>(getProjectsQuery)

  core.debug(`Search Response: \n ${JSON.stringify(searchResp, null, 2)}`)

  const foundNodes = searchResp[ownerType]?.projectsV2
  let projectId

  if (foundNodes?.totalCount !== 0) {
    const project = foundNodes?.edges[0]?.node

    if (!project) {
      core.info(`No projects found for ${ownerName} with query ${queryString}`)
      return
    }

    projectId = project.id

    core.info(`Found project: ${project.title} (Number: ${project.number})(ID: ${project.id})`)
  } else {
    const copyProjectTemplateResp = await octokit.graphql<ProjectCopyTemplateResponse>(
      `mutation createProjectFromTemplate($input: CopyProjectV2Input!) {
        copyProjectV2(input: $input) {
          projectV2 {
            id
          }
        }
      }`,
      {
        input: {
          includeDraftIssues: false,
          projectId: templateProjectId,
          title: projectName,
          ownerId,
        },
      },
    )

    core.debug(`Copy Project Template Response: \n ${JSON.stringify(copyProjectTemplateResp, null, 2)}`)

    projectId = copyProjectTemplateResp.copyProjectV2.projectV2.id
  }

  core.info(`Adding PR ${issue?.number} to project ${projectId}`)

  const addResp = await octokit.graphql<ProjectAddItemResponse>(
    `mutation addIssueToProject($input: AddProjectV2ItemByIdInput!) {
      addProjectV2ItemById(input: $input) {
        item {
          id
          project {
            url
            title
          }
        }
      }
    }`,
    {
      input: {
        projectId,
        contentId,
      },
    },
  )

  core.debug(`Add to Project Response: \n ${JSON.stringify(addResp, null, 2)}`)

  core.info(`Pull Request: ${issue?.html_url}`)
  core.info(`Project: ${addResp.addProjectV2ItemById.item.project.url}`)
  core.setOutput('itemId', addResp.addProjectV2ItemById.item.id)
}
