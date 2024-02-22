export interface ParseProjectName {
  baseBranch: string
  prefixRemove?: string
  sufixRemove?: string
  replaceWithSpaces?: string
}

export interface ParsedProjectUrl {
  ownerType: 'organization' | 'user'
  ownerName: string
  projectNumber: number
}

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

export interface ProjectAddItemResponse {
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

export interface ProjectCopyTemplateResponse {
  copyProjectV2: {
    projectV2: {
      id: string
    }
  }
}
