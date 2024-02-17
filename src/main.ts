import * as core from '@actions/core'
import {projectLink} from './project-link'

projectLink()
  .catch(err => {
    core.setFailed(err.message)
    process.exit(1)
  })
  .then(() => {
    process.exit(0)
  })
