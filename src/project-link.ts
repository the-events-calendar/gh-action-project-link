import * as core from '@actions/core'
import * as github from '@actions/github'
import {minimatch} from 'minimatch'

const projectUrlParse = /\/(?<ownerType>orgs|users)\/(?<ownerName>[^/]+)\/projects\/(?<projectNumber>\d+)/

interface ProjectNodeIDResponse {
  organization?: {
    projectV2: {
      id: string
    }
  }

  user?: {
    projectV2: {
      id: string
    }
  }
}

interface UserResponse {
  user?: {
    id: string
  }
}

interface ProjectNode {
  node: {
    id: string
    title: string
    number: number
  }
}

interface ProjectsEdgesNodesResponse {
  organization?: {
    projectsV2: {
      totalCount: number
      edges: ProjectNode[]
    }
  }

  user?: {
    projectsV2: {
      totalCount: number
      edges: ProjectNode[]
    }
  }
}

interface ProjectAddItemResponse {
  addProjectV2ItemById: {
    item: {
      id: string
    }
  }
}

interface ProjectCopyTemplateResponse {
  copyProjectV2: {
    projectV2: {
      id: string
    }
  }
}

export async function projectLink(): Promise<void> {
  const ghToken = core.getInput('github-token', {required: true})
  const projectOwner = core.getInput('project-owner', {required: true})
  const ownerType = mustGetOwnerTypeQuery(core.getInput('owner-type', {required: true}))

  const baseBranchPattern = core.getInput('base-branch-pattern')
  const baseBranch = github.context.payload.pull_request?.base.ref

  if (baseBranchPattern) {
    if (!minimatch(baseBranch, baseBranchPattern)) {
      core.info(`Skipping issue because base branch ${baseBranch} does not match pattern ${baseBranchPattern}`)
      return
    }
  }

  let projectName = baseBranch
  const prefixRemove = core.getInput('name-prefix-remove')
  const sufixRemove = core.getInput('name-sufix-remove')
  const replaceWithSpaces = core.getInput('name-replace-with-spaces')

  if (prefixRemove) {
    projectName = projectName.replace(new RegExp(`^${prefixRemove}`, 'i'), '')
  }

  if (sufixRemove) {
    projectName = projectName.replace(new RegExp(`${sufixRemove}$`, 'i'), '')
  }

  if (replaceWithSpaces) {
    for (const charToReplace of replaceWithSpaces.split('')) {
      projectName = projectName.replace(new RegExp(charToReplace, 'g'), ' ')
    }
  }

  const labeled =
    core
      .getInput('labeled')
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0) ?? []
  const labelOperator = core.getInput('label-operator').trim().toLocaleLowerCase()

  const octokit = github.getOctokit(ghToken)

  const issue = github.context.payload.issue ?? github.context.payload.pull_request
  const issueLabels: string[] = (issue?.labels ?? []).map((l: {name: string}) => l.name.toLowerCase())
  const issueOwnerName = github.context.payload.repository?.owner.login

  core.debug(`Issue/PR owner: ${issueOwnerName}`)
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

  const projectTemplateUrl = core.getInput('template-project-url')
  let templateProjectOwnerName
  let templateProjectId
  if (projectTemplateUrl) {
    core.debug(`Project URL: ${projectTemplateUrl}`)

    const urlMatch = projectTemplateUrl.match(projectUrlParse)

    if (!urlMatch) {
      throw new Error(
        `Invalid project URL: ${projectTemplateUrl}. Project URL should match the format <GitHub server domain name>/<orgs-or-users>/<ownerName>/projects/<projectNumber>`,
      )
    }

    templateProjectOwnerName = urlMatch.groups?.ownerName
    const templateProjectNumber = parseInt(urlMatch.groups?.projectNumber ?? '', 10)
    const templateProjectOwnerType = urlMatch.groups?.ownerType
    const templateProjectOwnerTypeQuery = mustGetOwnerTypeQuery(templateProjectOwnerType)

    core.debug(`Project Template owner: ${templateProjectOwnerName}`)
    core.debug(`Project Template number: ${templateProjectNumber}`)
    core.debug(`Project Template owner type: ${templateProjectOwnerType}`)

    // First, use the GraphQL API to request the template project's node ID.
    const idResp = await octokit.graphql<ProjectNodeIDResponse>(
      `query getProject($templateProjectOwnerName: String!, $templateProjectNumber: Int!) {
          ${templateProjectOwnerTypeQuery}(login: $templateProjectOwnerName) {
            projectV2(number: $templateProjectNumber) {
              id
            }
          }
        }`,
      {
        templateProjectOwnerName,
        templateProjectNumber,
      },
    )

    templateProjectId = idResp[templateProjectOwnerTypeQuery]?.projectV2.id

    core.debug(`Project node ID: ${templateProjectId}`)
  } else {
    core.info(`No template project URL provided. Will create a project without a template.`)
  }

  const contentId = issue?.node_id
  core.debug(`Content ID: ${contentId}`)

  const queryString = projectName // @todo replace this with the actual query string
  const getProjectsQuery = `query {
    ${ownerType}(login:"${issueOwnerName}") {
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
    core.info(`No projects found for ${issueOwnerName} with query ${queryString}`)
    const project = foundNodes?.edges[0]?.node

    if (!project) {
      core.info(`No projects found for ${issueOwnerName} with query ${queryString}`)
      return
    }

    projectId = project.id

    core.info(`Found project: ${project.title} (Number: ${project.number})(ID: ${project.id})`)
  } else {
    const getOwnerQuery = `query {
      user(login:"${projectOwner}") {
        id
      }
    }`
    core.debug(`Project Owner Query: \n ${getOwnerQuery}`)

    // First, use the GraphQL API to request the template project's node ID.
    const ownerResp = await octokit.graphql<UserResponse>(getOwnerQuery)

    core.debug(`Owner Response: \n ${JSON.stringify(ownerResp, null, 2)}`)

    if (!ownerResp?.user?.id) {
      throw new Error(`No owner found for ${projectOwner}`)
    }

    const projectOwnerID = ownerResp?.user?.id

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
          ownerId: projectOwnerID,
        },
      },
    )

    core.debug(`Copy Project Template Response: \n ${JSON.stringify(copyProjectTemplateResp, null, 2)}`)

    projectId = copyProjectTemplateResp.copyProjectV2.projectV2.id
  }

  core.info(`Adding issue ${issue?.number} to project ${projectId}`)

  const addResp = await octokit.graphql<ProjectAddItemResponse>(
    `mutation addIssueToProject($input: AddProjectV2ItemByIdInput!) {
      addProjectV2ItemById(input: $input) {
        item {
          id
          title
          url
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

  core.setOutput('itemId', addResp.addProjectV2ItemById.item.id)
}

export function mustGetOwnerTypeQuery(ownerType?: string): 'organization' | 'user' {
  const validOrganizationTypes = ['orgs', 'organization', 'org', 'organizations']
  const validUserTypes = ['users', 'user']
  if (!ownerType) {
    throw new Error(`Empty ownerType.`)
  }

  if (validOrganizationTypes.includes(ownerType)) {
    return 'organization'
  } else if (validUserTypes.includes(ownerType)) {
    return 'user'
  }

  throw new Error(
    `Unsupported ownerType: ${ownerType}. Must be one of 'orgs', 'organization', 'org', 'organizations' or 'users', 'user'`,
  )
}
