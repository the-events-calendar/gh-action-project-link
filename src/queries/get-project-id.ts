import * as core from '@actions/core'

import {getOctokit, ParsedProjectUrl} from '../utils'

export interface ProjectNodeIDResponse {
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

export async function getProjectId(params: ParsedProjectUrl): Promise<string> {
  const {ownerName, projectNumber, ownerType} = params
  const octokit = getOctokit()

  // First, use the GraphQL API to request the template project's node ID.
  const idResp = await octokit.graphql<ProjectNodeIDResponse>(
    `query getProject($ownerName: String!, $projectNumber: Int!) {
          ${ownerType}(login: $ownerName) {
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

  if (!projectId) {
    throw new Error(`Project not found for ${ownerName}/${projectNumber}`)
  }

  return projectId
}
