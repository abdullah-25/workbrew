---
paths:
  - "**/*.test.ts"
  - "**/test_*.py"
---

# Testing Rules

- Use descriptive test names: "should [expected] when [condition]"
- Mock external dependencies, not internal modules
- Clean up side effects in afterEach