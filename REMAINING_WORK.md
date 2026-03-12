# TypeScript 6.0 Upgrade - Remaining Work

**Status**: 95% Complete
**Branch**: `upgrade/typescript-6.0`
**Commit**: 833ae66c89
**Date**: March 11, 2026

---

## Overview

The TypeScript 6.0.1-rc upgrade is 95% complete with 148 files successfully updated.
The remaining work is focused on the `@jupyterlab/services` package which has
complex generic variance issues requiring deeper type system investigation.

---

## Remaining Issues (by Priority)

### 1. Error Type Guards (High Priority - ~10 errors)

**Issue**: Catch block variables are `unknown` type in TS 6.0

**Files**:
- `packages/services/src/kernel/default.ts` (lines 1493, 1494, 1780)
- `packages/services/src/kernel/manager.ts` (lines 279, 280, 282)
- `packages/services/src/session/manager.ts` (lines 259, 260, 262)
- `packages/services/src/terminal/manager.ts` (lines 227, 228, 230)
- `packages/settingregistry/src/settingregistry.ts` (lines 189, 190, 611)

**Fix Pattern**:
```typescript
// Before
} catch (err) {
  console.error(err.message);
  throw err;
}

// After
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);
  }
  throw err;
}
```

**Estimate**: 1-2 hours

---

### 2. Generic Type Variance (Medium Priority - ~6 errors)

**Issue**: Complex generic constraints with message handler types

**Files**:
- `packages/services/src/kernel/default.ts` (lines 362, 393, 448, 449)

**Problem**:
```typescript
// Type incompatibility between:
KernelFutureHandler<REQUEST, REPLY>
  vs
KernelFutureHandler<IShellControlMessage, IShellControlMessage>
```

**Root Cause**: TypeScript 6.0 has stricter generic variance checking.
The issue is that `IShellControlMessage` is a union type
(`IShellMessage | IControlMessage`), and the generic handlers are too specific.

**Possible Solutions**:
1. Use type assertions (`as any`) as temporary workaround
2. Refactor generic constraints to be more flexible
3. Create wrapper functions with correct type signatures

**Estimate**: 2-4 hours

---

### 3. WebSocket Event Type (Low Priority - 1 error)

**Issue**: CloseEvent vs Event type mismatch

**File**: `packages/services/src/terminal/default.ts` (line 285)

**Problem**:
```typescript
// Current
ws.onclose = (event: CloseEvent) => void

// Expected by WebSocket
ws.onclose = (this: WebSocket, ev: Event) => any
```

**Fix**:
```typescript
ws.onclose = (event: Event) => {
  const closeEvent = event as CloseEvent;
  // use closeEvent.code, closeEvent.reason, etc.
};
```

**Estimate**: 15 minutes

---

### 4. Missing Module (Low Priority - 1 error)

**Issue**: Cannot find module '@jupyterlab/settingregistry'

**File**: `packages/services/src/setting/index.ts` (line 6)

**Problem**: Build order or dependency issue

**Fix**: Ensure settingregistry package builds before services, or
check if this is a circular dependency issue.

**Estimate**: 30 minutes

---

### 5. Comm Message Type (Low Priority - 1 error)

**Issue**: ICommCloseMsg channel type constraint

**File**: `packages/services/src/kernel/comm.ts` (line 117)

**Problem**:
```typescript
Type '(msg: ICommCloseMsg<"iopub">) => void'
  is not assignable to
Type '(msg: ICommCloseMsg<"shell" | "iopub">) => void'
```

**Fix**: Widen the parameter type to accept both channels:
```typescript
// Change
onClose?: (msg: ICommCloseMsg<'iopub'>) => void;

// To
onClose?: (msg: ICommCloseMsg<'shell' | 'iopub'>) => void;
```

**Estimate**: 15 minutes

---

## Implementation Plan

### Phase 1: Quick Fixes (2-3 hours)
1. Fix all error type guard issues (automated with script)
2. Fix WebSocket event type
3. Fix Comm message type
4. Fix missing module dependency

### Phase 2: Generic Type Issues (2-4 hours)
1. Analyze generic variance problems in detail
2. Decide on approach (refactor vs type assertions)
3. Implement and test solution

### Phase 3: Testing & Validation (1-2 hours)
1. Run full build: `jlpm build:all`
2. Run test suite: `jlpm test`
3. Run lint checks: `jlpm lint:check`
4. Test examples: `jlpm build:examples`

**Total Estimate**: 5-9 hours

---

## Helper Scripts

### Fix Error Type Guards
```bash
cd ~/jupyterlab/packages/services

# Create fix script
cat > /tmp/fix-error-guards.py << 'EOF'
import re
import sys

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Pattern: catch (err) { ... err.property ...
pattern = r'(\n\s*)\} catch \((err|error)\) \{([^\}]*?)\2\.(message|code|stack|name)'

def replace_fn(match):
    indent = match.group(1)
    var = match.group(2)
    body = match.group(3)
    prop = match.group(4)

    return (
        f"{indent}}} catch ({var}) {{\n"
        f"{indent}  if ({var} instanceof Error) {{\n"
        f"{indent}  {body}{var}.{prop}"
    )

content = re.sub(pattern, replace_fn, content, flags=re.DOTALL)

with open(sys.argv[1], 'w') as f:
    f.write(content)
EOF

# Run on all files with errors
python3 /tmp/fix-error-guards.py src/kernel/default.ts
python3 /tmp/fix-error-guards.py src/kernel/manager.ts
python3 /tmp/fix-error-guards.py src/session/manager.ts
python3 /tmp/fix-error-guards.py src/terminal/manager.ts

# Test build
jlpm build
```

### Check Progress
```bash
cd ~/jupyterlab/packages/services
jlpm build 2>&1 | grep "Found [0-9]* error"
```

---

## Notes

- All package.json updates are complete and correct
- Configuration changes (moduleResolution) are correct
- 95% of codebase compiles successfully
- Issues are isolated to one package (@jupyterlab/services)
- No logic changes required, only type annotations

---

## When Complete

1. Remove this file: `rm REMAINING_WORK.md`
2. Update commit message: `git commit --amend`
3. Push to fork: `git push -u origin upgrade/typescript-6.0`
4. Create PR with `gh pr create`

---

## Resources

- [TypeScript 6.0 RC Announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/)
- [TypeScript 6.0 Breaking Changes](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes)
- [Issue #18609](https://github.com/jupyterlab/jupyterlab/issues/18609)
