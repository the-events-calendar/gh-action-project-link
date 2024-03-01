import * as core from '@actions/core'

import {getOctokit} from '../utils'

interface ProjectAddItemParams {
  projectId?: string
  contentId: string
  issueNumber?: number
}

export interface GraphQLProjectAddItemResponse {
  addProjectV2ItemById: {
    item: {
      id: string
      project: {
        id: string
        url: string
      }
    }
  }
}

export interface ProjectAddItemResponse {
  url: string
  id: string
}

export const addIssueToProject = async (params: ProjectAddItemParams): Promise<ProjectAddItemResponse> => {
  const octokit = getOctokit()
  const {projectId, contentId, issueNumber} = params

  core.info(`Adding PR ${issueNumber} to project ${projectId}`)

  const addResp = await octokit.graphql<GraphQLProjectAddItemResponse>(
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

  return {
    url: addResp.addProjectV2ItemById.item.project.url,
    id: addResp.addProjectV2ItemById.item.id,
  }
}
