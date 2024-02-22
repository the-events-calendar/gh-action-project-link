
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

interface OwnerResponse {
  user?: {
    id: string
  }
  organization?: {
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
      project: {
        id: string
        url: string
      }
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
