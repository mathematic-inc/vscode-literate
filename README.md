# Literate

> Generate intelligent, context-aware documentation for your code

[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)

Literate is a VS Code extension that automatically generates comprehensive documentation for your code. It adapts to your skill level and provides explanations that range from beginner-friendly to advanced architectural insights.

## Inspiration

This extension is inspired by [Donald Knuth's Literate Programming](https://www-cs-faculty.stanford.edu/~knuth/lp.html), a programming methodology that treats programs as literature meant to be read by humans. Knuth's vision was that code should be written for human understanding first, with the computer as a secondary audience.

Because most traditional programming has forgone literacy for the sake of productivity, this extension brings that philosophy to existing codebases by automatically generating the "literate" documentation that explains not just *what* the code does, but *why* it was written that way.

## Features

- **🎯 Adaptive Documentation**: Choose from beginner, intermediate, or advanced explanations
- **📖 Interactive Panel**: Click documentation to highlight code, select code to highlight documentation
- **🔐 Secure**: API keys stored securely in VS Code's secret storage
- **Multi-language**: Supports 50+ programming languages

![Literate Demo](public/demo.gif)

## Use Cases

### 🎓 Learning & Education
- **New to Programming**: Get beginner-friendly explanations of complex code
- **Learning New Languages**: Understand unfamiliar syntax and patterns
- **Code Reviews**: Learn from others' code with detailed explanations
- **Tutorial Creation**: Generate educational content from existing codebases

### 👥 Team Collaboration
- **Onboarding**: Help new team members understand legacy code
- **Knowledge Transfer**: Document complex algorithms and business logic
- **Code Reviews**: Provide context for why code was written a certain way
- **Documentation**: Automatically generate comprehensive code documentation

### 🔧 Development Workflow
- **Legacy Code**: Understand old codebases without original authors
- **Debugging**: Get insights into code behavior and potential issues
- **Refactoring**: Understand code before making changes
- **API Integration**: Learn how to use complex libraries and frameworks

### 📚 Documentation & Maintenance
- **Technical Writing**: Generate documentation for technical blogs or wikis
- **Code Audits**: Create comprehensive reports for code quality assessments
- **Compliance**: Generate documentation for regulatory requirements
- **Architecture Documentation**: Understand system design and patterns

### 🌟 Advanced Use Cases
- **Algorithm Analysis**: Deep dive into complex algorithms and data structures
- **Performance Optimization**: Understand performance implications of code choices
- **Security Audits**: Identify potential security issues through code analysis
- **Best Practices**: Learn industry standards and coding conventions

## Before You Start

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. The extension will prompt you to enter it on first use
3. Keys are stored securely in VS Code's secret storage
   
## Quick Start

1. **Install** from the VS Code Marketplace
2. **Open** any code file
3. **Click** "📖 Generate Literate Documentation" at the top of your file
4. **Choose** your skill level (beginner/intermediate/advanced)
5. **Explore** the documentation in the side panel

## Commands

- `Generate Literate Documentation` - Analyze current file and generate documentation
- `Change Documentation Detail Level` - Switch between skill levels
- `Reset OpenAI API Key` - Manage your API key

## Requirements

- VS Code 1.103.0 or higher
- OpenAI API key
- Internet connection

## Development

```bash
# Install dependencies
make install

# Build the extension
make build

# Launch development environment
code .
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/mathematic-inc/vscode-literate/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/mathematic-inc/vscode-literate/discussions)


## 💝 Dedication

This extension was inspired by my wife's journey into programming. Watching her learn to code reminded me of the importance of making complex concepts accessible and understandable.

---

<div align="center">

**Made with ❤️ by the [Mathematic](https://mathematic.ai) team**

</div>
