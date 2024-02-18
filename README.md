# the-events-calendar/gh-action-project-link

Use this action to automatically add the current pull request to a [GitHub project](https://docs.github.com/en/issues/trying-out-the-new-projects-experience/about-projects).
Note that this action does not support [GitHub projects (classic)](https://docs.github.com/en/issues/organizing-your-work-with-project-boards).

Much of this code was adapted from [actions/add-to-project](https://github.com/actions/add-to-project).

## Current Status

[![build-test](https://github.com/the-events-calendar/gh-action-project-link/actions/workflows/test.yml/badge.svg)](https://github.com/the-events-calendar/gh-action-project-link/actions/workflows/test.yml)

## Usage

_See [action.yml](action.yml) for [metadata](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions) that defines the inputs, outputs, and runs configuration for this action._

_For more information about workflows, see [Using workflows](https://docs.github.com/en/actions/using-workflows)._

Create a workflow that runs when Issues or Pull Requests are opened or labeled in your repository; this workflow also supports adding Issues to your project which are transferred into your repository. Optionally configure any filters you may want to add, such as only adding issues with certain labels. You may match labels with an `AND` or an `OR` operator, or exclude labels with a `NOT` operator.

Once you've configured your workflow, save it as a `.yml` file in your target Repository's `.github/workflows` directory.

### Examples

`@TODO add examples`

## Inputs

- <a name="base-branch-pattern">`base-branch-pattern`</a> **(optional)** is a glob pattern to match the base branch name. If not provided, the action will match all base branches
  _eg: `release/*`_ will match `release/1.0`, `release/2.0`, etc.
- <a name="name-prefix-remove">`name-prefix-remove`</a> **(optional)** Its a string to remove from the beginning of the base branch before searching for a project. If not provided, the action will use the base branch as is
  _eg: `release/`_ will remove `release/` from `release/Z24.kamehameha`
- <a name="name-suffix-remove">`name-suffix-remove`</a> **(optional)** It is a string to remove from the end of the base branch before searching for a project. If not provided, the action will use the base branch as is
  _eg: `-hotfix`_ will remove `-hotfix` from `release/Z24.kamehameha-hotfix`
- <a name="name-replace-with-spaces">`name-replace-with-spaces`</a> **(optional)** Its a colection of chars to replace with spaces in the base branch before searching for a project. If not provided, the action will use the base branch as is.
- <a name="template-project-url">`template-project-url`</a> **(optional)** is the URL of the project to use as a template for the new project. If not provided, the action will create a new project
  \_eg: `https://github.com/orgs|users/<ownerName>/projects/<projectNumber>`
- <a name="github-token">`github-token`</a> **(required)** is a [personal access
  token](https://github.com/settings/tokens/new) with `repo` and `project` scopes.
  _See [Creating a PAT and adding it to your repository](#creating-a-pat-and-adding-it-to-your-repository) for more details_
- <a name="labeled">`labeled`</a> **(optional)** is a comma-separated list of labels used to filter applicable issues. When this key is provided, an issue must have _one_ of the labels in the list to be added to the project. Omitting this key means that any issue will be added.
- <a name="labeled">`label-operator`</a> **(optional)** is the behavior of the labels filter, either `AND`, `OR` or `NOT` that controls if the issue should be matched with `all` `labeled` input or any of them, default is `OR`.

## Supported Events

Currently this action supports the following [`pull_request` events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request):

- `opened`
- `reopened`
- `labeled`

Using these events ensure that a given pull request, in the workflow's repo, is added to the [specified project](#project-url). If [labeled input(s)](#labeled) are defined, then issues will only be added if they contain at least _one_ of the labels in the list.

## Creating a PAT and adding it to your repository

- create a new [personal access
  token](https://github.com/settings/tokens/new) with `project` scope. For private repos you will also need `repo` scope.
  _See [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) for more information_

  > **NOTE:** ℹ️ Use a classic token with full control of projects. Personal access tokens with fine grained access do not support the GraphQL API.

- add the newly created PAT as a repository secret, this secret will be referenced by the [github-token input](#github-token)
  _See [Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) for more information_

## Setting a specific status or column name to the project item

If you want to add an issue to a custom default column in a project (i.e. other than 'Todo'), you can do this directly via the project UI. You don't need to add anything else to your YAML workflow file to get this to work.

Use the [Project Link](https://github.com/marketplace/actions/add-to-github-projects) action to assign newly opened issues to the project. And then in the project UI simply [specify which column to use as the default](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/quickstart-for-projects#configure-built-in-automation)!

## Development

To get started contributing to this project, clone it and install dependencies.
Note that this action runs in Node.js 20.x, so we recommend using that version
of Node (see "engines" in this action's package.json for details).

```shell
> git clone https://github.com/the-events-calendar/gh-action-project-link
> cd gh-action-project-link
> npm install
```

Or, use [GitHub Codespaces](https://github.com/features/codespaces).

See the [toolkit
documentation](https://github.com/actions/toolkit/blob/master/README.md#packages)
for the various packages used in building this action.

## Publish to a distribution branch

Actions are run from GitHub repositories, so we check in the packaged action in
the "dist/" directory.

```shell
> npm run build
> git add lib dist
> git commit -a -m "Build and package"
> git push origin releases/v1
```

Now, a release can be created from the branch containing the built action.

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
