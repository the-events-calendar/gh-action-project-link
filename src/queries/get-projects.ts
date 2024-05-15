import * as core from '@actions/core'
import {getOctokit} from '../utils'

export interface ProjectListParams {
  search: string
  ownerType: 'organization' | 'user'
  ownerName: string
}

export interface OwnerResponse {
  user?: {
    id: string
  }
  organization?: {
    id: string
  }
}

export interface ProjectNode {
  node: {
    id: string
    title: string
    number: number
  }
}

export interface ProjectsEdgesNodesResponse {
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

export const getFirstProjectFromSearch = async (params: ProjectListParams): Promise<string | undefined> => {
  const octokit = getOctokit()
  const {search, ownerType, ownerName} = params

  const getProjectsQuery = `query getProjectsQuery {
    ${ownerType}(login:"${ownerName}") {
      projectsV2(first:100 query:"${search}") {
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

  if (!foundNodes || foundNodes.totalCount === 0 || !foundNodes.edges.length) {
    core.info(`No projects found for ${ownerName} with query ${search}`)
    return
  }

  const project = foundNodes.edges[0]?.node

  if (!project) {
    core.info(`No projects found for ${ownerName} with query ${search}`)
    return
  }

  core.info(`Found project: ${project.title} (Number: ${project.number})(ID: ${project.id})`)

  return project.id
}
