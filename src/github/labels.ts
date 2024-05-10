import * as core from '@actions/core'

export interface GetLabelsParams {
  number: number
  labels: [
    {
      name: string
    },
  ]
}

export const matchLabelConditions = async (issue: GetLabelsParams | undefined): Promise<boolean> => {
  const labeled =
    core
      .getInput('labeled')
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0) ?? []

  const labelOperator = core.getInput('label-operator').trim().toLocaleLowerCase()
  const issueLabels: string[] = (issue?.labels ?? []).map((l: {name: string}) => l.name.toLowerCase())

  core.debug(`Existing labels: ${issueLabels.join(', ')}`)
  core.debug(`Label Conditions: ${labeled.join(', ')}`)
  core.debug(`Label Operator: ${labelOperator}`)

  // Ensure the issue matches our `labeled` filter based on the label-operator.
  if (labelOperator === 'and') {
    if (!labeled.every(l => issueLabels.includes(l))) {
      core.info(`Skipping issue ${issue?.number} because it doesn't match all the labels: ${labeled.join(', ')}`)
      return false
    }
  } else if (labelOperator === 'not') {
    if (labeled.length > 0 && issueLabels.some(l => labeled.includes(l))) {
      core.info(`Skipping issue ${issue?.number} because it contains one of the labels: ${labeled.join(', ')}`)
      return false
    }
  } else {
    if (labeled.length > 0 && !issueLabels.some(l => labeled.includes(l))) {
      core.info(`Skipping issue ${issue?.number} because it does not have one of the labels: ${labeled.join(', ')}`)
      return false
    }
  }

  return true
}
