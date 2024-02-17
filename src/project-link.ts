import * as core from '@actions/core'
import * as github from '@actions/github'

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

interface ProjectNode {
  node: {
    id: string
    title: string
    number: number
  }
}

interface ProjectsEdgesNodesResponse {
  organization?: {
    projectV2: {
      totalCount: number
      edges: ProjectNode[]
    }
  }

  user?: {
    projectV2: {
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

interface ProjectV2AddDraftIssueResponse {
  addProjectV2DraftIssue: {
    projectItem: {
      id: string
    }
  }
}

export async function projectLink(): Promise<void> {
  const ghToken = core.getInput('github-token', {required: true})
  const ownerType = mustGetOwnerTypeQuery(core.getInput('owner-type', {required: true}))

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
      `query getProject($projectOwnerName: String!, $projectNumber: Int!) {
          ${templateProjectOwnerTypeQuery}(login: $projectOwnerName) {
            projectV2(number: $projectNumber) {
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

  const queryString = `G24.boxer` // @todo replace this with the actual query string

  // First, use the GraphQL API to request the template project's node ID.
  const searchResp = await octokit.graphql<ProjectsEdgesNodesResponse>(
    `query getProjects(queryString: String!, $issueOwnerName: String!) {
      ${ownerType}(login:$issueOwnerName) {
        projectsV2(first:100 query:$queryString) {
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
    }`,
    {
      issueOwnerName,
      queryString,
    },
  )

  const foundNodes = searchResp[ownerType]?.projectV2

  if (foundNodes?.totalCount === 0) {
    core.info(`No projects found for ${issueOwnerName} with query ${queryString}`)
    return
  }

  const [project] = foundNodes?.edges ?? []

  if (!project) {
    core.info(`No projects found for ${issueOwnerName} with query ${queryString}`)
    return
  }

  core.debug(`Found project: ${project.node.title} (Number: ${project.node.number})(ID: ${project.node.id})`)

  return
  // @todo implement the rest of the function

  // Next, use the GraphQL API to add the issue to the project.
  // If the issue has the same owner as the project, we can directly
  // add a project item. Otherwise, we add a draft issue.
  if (templateProjectOwnerName && templateProjectId && issueOwnerName === templateProjectOwnerName) {
    core.info('Creating project item')

    const addResp = await octokit.graphql<ProjectAddItemResponse>(
      `mutation addIssueToProject($input: AddProjectV2ItemByIdInput!) {
        addProjectV2ItemById(input: $input) {
          item {
            id
          }
        }
      }`,
      {
        input: {
          templateProjectId,
          contentId,
        },
      },
    )

    core.setOutput('itemId', addResp.addProjectV2ItemById.item.id)
  } else {
    core.info('Creating draft issue in project')

    const addResp = await octokit.graphql<ProjectV2AddDraftIssueResponse>(
      `mutation addDraftIssueToProject($projectId: ID!, $title: String!) {
        addProjectV2DraftIssue(input: {
          projectId: $projectId,
          title: $title
        }) {
          projectItem {
            id
          }
        }
      }`,
      {
        templateProjectId,
        title: issue?.html_url,
      },
    )

    core.setOutput('itemId', addResp.addProjectV2DraftIssue.projectItem.id)
  }
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
