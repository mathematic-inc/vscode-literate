# Contributing to Literate

Thank you for your interest in contributing to Literate! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Documentation](#documentation)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## Getting Started

Before you begin, please ensure you have:

- Node.js (version 18 or higher)
- Rust (latest stable version)
- VS Code (version 1.103.0 or higher)
- Git

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/mathematic-inc/vscode-literate.git
   cd vscode-literate
   ```

2. **Install dependencies**
   ```bash
   make install
   ```

3. **Build the extension**
   ```bash
   make build
   ```

4. **Launch development environment**
   ```bash
   code .
   ```

## Project Structure

```
literate/
├── src/                    # Rust source code (WASM component)
├── src-public/            # TypeScript source code
│   ├── extension.ts       # Main extension entry point
│   └── generated/         # Generated TypeScript bindings
├── wit/                   # WebAssembly Interface Types
├── prompts/               # AI prompt templates
├── public/                # Static assets
├── out/                   # Build output
└── target/                # Rust build artifacts
```

## Making Changes

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- **TypeScript changes**: Edit files in `src-public/`
- **Rust changes**: Edit files in `src/`
- **WIT interface changes**: Edit `wit/literate.wit` and regenerate bindings
- **Prompts**: Edit files in `prompts/`

### 3. Test Your Changes

```bash
# Run the full test suite
make test

# Or run specific tests
npm run test
```

### 4. Format and Lint

```bash
# Format all code
make format

# Lint all code
make lint
```

## Submitting Changes

### Pull Request Process

1. **Ensure your branch is up to date**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Push your changes**
   ```bash
   git push origin your-branch
   ```

3. **Create a Pull Request**
   - Use a clear, descriptive title
   - Provide a detailed description of your changes
   - Link any related issues
   - Include screenshots for UI changes

### Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: add support for Python documentation generation
fix: resolve API key validation issue
docs: update README with new installation steps
refactor: improve error handling in WASM component
```

## Issue Guidelines

### Before Creating an Issue

1. Check if the issue already exists
2. Search through closed issues
3. Verify you're using the latest version

### Issue Types

- **Bug Report**: Something isn't working as expected
- **Feature Request**: Suggest a new feature or enhancement
- **Documentation**: Improvements to documentation
- **Question**: Ask a question about the project

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- VS Code Version: [e.g. 1.103.0]
- Extension Version: [e.g. 0.0.1]

**Additional context**
Add any other context about the problem here.
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] Self-review of your code
- [ ] Code is properly commented
- [ ] Tests pass locally
- [ ] Documentation is updated if needed
- [ ] No merge conflicts

### Review Process

1. **Automated Checks**: All PRs must pass CI checks
2. **Code Review**: At least one maintainer must approve
3. **Testing**: Changes must be tested thoroughly
4. **Documentation**: Updates must be clear and accurate

## Development Workflow

### Watch Mode

For active development, use watch mode:

```bash
make dev
```

This will:
- Watch TypeScript files and rebuild on changes
- Watch Rust files and rebuild WASM on changes
- Automatically regenerate bindings when WIT files change

### Building

```bash
# Full build
make build

# Individual components
make wasm          # Build WASM component
make typescript    # Build TypeScript
make bindings      # Generate TypeScript bindings
```

### Packaging

```bash
# Create VSIX package
make package
```

## Testing

### Running Tests

```bash
# Run all tests
make test

# Run specific test suites
npm run test -- --grep "specific test"
```

### Test Coverage

We aim for high test coverage. When adding new features:

1. Write unit tests for new functions
2. Add integration tests for new workflows
3. Test error conditions and edge cases

## Code Style

### TypeScript

- Use TypeScript strict mode
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Rust

- Follow Rust naming conventions
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Add documentation comments for public items

### General

- Keep functions small and focused
- Use descriptive commit messages
- Write self-documenting code
- Add comments for complex logic

## Documentation

### Code Documentation

- Add JSDoc comments for TypeScript functions
- Add Rust documentation comments for public items
- Update README.md for user-facing changes
- Update this CONTRIBUTING.md for process changes

### API Documentation

- Document all public APIs
- Include examples where helpful
- Keep documentation up to date with code changes

## Release Process

1. **Version Bump**: Update version in `package.json` and `Cargo.toml`
2. **Changelog**: Update CHANGELOG.md with new features/fixes
3. **Build**: Run `make build` to ensure everything compiles
4. **Test**: Run full test suite
5. **Package**: Create VSIX package with `make package`
6. **Publish**: Publish to VS Code Marketplace

## Getting Help

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Email**: Contact the maintainers directly for sensitive issues

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors list

Thank you for contributing to Literate! 🎉
