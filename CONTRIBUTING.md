# Contributing to brazier-js

 Thank you for considering contributing to brazier! It's people
 like you that make it a great tool.

## General Guideline

### Reporting Issues

If you have found what you think is a bug, please [start a bug report discussion](https://github.com/brazier-tech/brazier-js/discussions/new?category=bug-reports).

For any usage questions, [ask a question in a discussion](https://github.com/brazier-tech/brazier-js/discussions/new?category=q-a).

### Suggesting new features

If you are here to suggest a new feature, first [suggest it in a discussion](https://github.com/brazier-tech/brazier-js/discussions/new?category=ideas). Please avoid submitting a duplicate request by checking if someone has already suggested a similar feature. From there, we will discuss the feature's use cases and then decide how it could be implemented.

### Committing

We apply the [conventional commit spec](https://www.conventionalcommits.org/en/v1.0.0/) across all our repositories. In brief, each commit must use one of the following types:

- **feat**: add a new feature
- **fix**: fix a bug
- **refactor**: change the code without fixing a bug or adding a feature
- **chore**: change the build process, configuration, dependencies, CI/CD pipelines, or supporting tools
- **docs**: make a documentation-only change
- **test**: add missing tests or correct existing tests

If you are unfamiliar with the usage of conventional commits, the short version is to simply specify the type as a first word, and follow it with a colon and a space, then start your message with a lowercase letter, like this:

```txt
feat: add support for 'foo'
```

You can also specify the scope of the commit in the parentheses after a type:

```txt
fix(tls): prevent use-after-free during async session teardown
```

## Development

If you would like to contribute by completing an open issue or developing a new feature, you can use this suggested workflow:

1. Fork this repository and create a new branch based off the `main` branch.
2. Run `pnpm install` to install dependencies.
3. Create failing tests for your fix or new feature in the [`tests`](https://github.com/brazier-tech/brazier-js/tree/main/tests) folder in the file for the corresponding package.
4. Implement your changes.
5. Run the tests by running `pnpm run test` and ensure they pass.
6. You can use `pnpm link` to establish a symbolic link to the relevant package and test it locally on your own project. You will need to have built the package using `pnpm run build` within the relevant folder before doing so.
7. Git stage your changes and commit (review the commit guidelines).
8. Start or continue the relevant discussion, share your fork branch, and wait for maintainer guidance. We don't accept direct PRs, but a maintainer may open a PR from your fork branch for review.

Please document each function and class you write with [JSDoc](https://jsdoc.app/)-style comments like this:

```ts
/**
 * Calculates mean average from an array of given numeric values.
 * @param values any array of numeric values (`number[] || Array<number>`)
 * @returns a single numeric value corresponding to the mean average of the given array.
 */
export const meanAvg = (values: number[]) => {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
```

## Pull requests

Please do not open pull requests yourself. Use [discussions](https://github.com/brazier-tech/brazier-js/discussions) to report bugs, ask questions or suggest features. If you have implemented a change, share a branch from your fork. A maintainer may then open a pull request from that branch.

If a maintainer opens a pull request from your fork branch, please try to keep it focused in scope and avoid including unrelated commits. Pull requests will not be opened from fork branches lacking scope or including many unrelated commits.

We will review the pull request and may suggest changes or request improvements. When we open the pull request, please make sure to check ✅ ["Allow edits from maintainers"](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) on your pull request.


Thank you for contributing to brazier!
