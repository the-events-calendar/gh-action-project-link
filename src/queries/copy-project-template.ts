import * as core from '@actions/core'
import {getOctokit} from '../utils'

export interface ProjectCopyTemplateResponse {
  copyProjectV2: {
    projectV2: {
      id: string
    }
  }
}

interface ProjectCopyTemplateParams {
  projectId?: string
  title?: string
  ownerId?: string
}

export const copyProjectTemplate = async (params: ProjectCopyTemplateParams): Promise<string> => {
  const octokit = getOctokit()
  const {projectId, title, ownerId} = params

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
        projectId,
        title,
        ownerId,
      },
    },
  )

  core.debug(`Copy Project Template Response: \n ${JSON.stringify(copyProjectTemplateResp, null, 2)}`)

  return copyProjectTemplateResp.copyProjectV2.projectV2.id
}
