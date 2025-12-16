# Condition Node

Branches the flow based on evaluating an expression.

## Overview

| Property | Value |
|----------|-------|
| Category | Logic |
| Inputs | 1 |
| Outputs | 2 (Yes / No) |

## Configuration

### Condition Expression

The expression to evaluate:

```
{{last_reply}} == "YES"
```

## Expression Syntax

### Comparison Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equal to | <code v-pre>{{status}} == "active"</code> |
| `!=` | Not equal to | <code v-pre>{{status}} != "cancelled"</code> |
| `>` | Greater than | <code v-pre>{{count}} > 10</code> |
| `<` | Less than | <code v-pre>{{count}} < 5</code> |
| `>=` | Greater than or equal | <code v-pre>{{age}} >= 18</code> |
| `<=` | Less than or equal | <code v-pre>{{score}} <= 100</code> |

### String Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `contains` | String contains | <code v-pre>{{reply}} contains "help"</code> |
| `startsWith` | Starts with | <code v-pre>{{reply}} startsWith "order"</code> |
| `endsWith` | Ends with | <code v-pre>{{email}} endsWith "@gmail.com"</code> |

### Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `&&` | AND | <code v-pre>{{a}} > 0 && <span v-pre>{{b}}</span> > 0</code> |
| `\|\|` | OR | <code v-pre>{{status}} == "yes" \|\| <span v-pre>{{status}}</span> == "y"</code> |
| `!` | NOT | <code v-pre>!{{is_subscribed}}</code> |

## Examples

### Check Button Response

```
{{last_reply}} == "confirm"
```

Routes:
- **Yes**: User clicked "confirm" button
- **No**: User clicked different button or typed

### Check for Keyword

```
{{last_reply}} contains "help"
```

Routes:
- **Yes**: Message contains "help" anywhere
- **No**: Message doesn't contain "help"

### Numeric Comparison

```
{{item_count}} > 0
```

Routes:
- **Yes**: Cart has items
- **No**: Cart is empty

### Multiple Conditions

```
{{age}} >= 18 && {{country}} == "US"
```

Routes:
- **Yes**: Adult AND in US
- **No**: Under 18 OR not in US

### Case Insensitive Check

First use Text Operation to lowercase, then:

```
{{reply_lower}} == "yes"
```

## Flow Patterns

### Simple Branch

```
Condition: {{confirmed}} == "yes"
├── Yes → Process Order
└── No  → Cancel Flow
```

### Multiple Conditions (Chained)

```
Condition: {{choice}} == "A"
├── Yes → Handle A
└── No  → Condition: {{choice}} == "B"
            ├── Yes → Handle B
            └── No  → Condition: {{choice}} == "C"
                        ├── Yes → Handle C
                        └── No  → Handle Default
```

### Validation Loop

```
Ask Question
    ↓
Wait for Reply
    ↓
Condition: {{reply}} != ""
├── Yes → Continue
└── No  → Send "Please enter a value" → Loop to Ask
```

## Handling Outputs

### Yes Path

Connected to the "Yes" output handle. Executes when condition is true.

### No Path

Connected to the "No" output handle. Executes when condition is false.

### Both Paths Required

Always connect both outputs to ensure:
- Flow doesn't dead-end
- All cases are handled

## Best Practices

### Be Explicit

```yaml
# Good - Clear comparison
{{status}} == "active"

# Bad - Relies on truthy/falsy
{{status}}
```

### Handle Edge Cases

```yaml
# Check for empty before comparing
{{reply}} != "" && {{reply}} == "YES"
```

### Use Consistent Case

```yaml
# Convert to lowercase first
Text Operation: lowercase {{last_reply}} → reply_lower
Condition: {{reply_lower}} == "yes"
```

### Document Complex Conditions

Add a Send Text debug node to see what's being evaluated:

```
DEBUG: reply={{last_reply}}, checking if == "yes"
```

## Common Issues

### Condition Always False

**Problem:** Always takes "No" path

**Causes:**
- Variable not set
- Case mismatch ("YES" vs "yes")
- Whitespace in value
- Type mismatch (string vs number)

**Debug:** Add Send Text before condition to inspect values.

### Unexpected True

**Problem:** Condition matches when it shouldn't

**Causes:**
- Using `contains` when `==` needed
- Variable has unexpected value

### String vs Number

**Problem:** Numeric comparison fails

**Cause:** Variable stored as string "10" not number 10

**Fix:** Most comparisons work, but be aware of edge cases.

## Technical Details

Condition evaluation:

1. Variables are substituted in expression
2. Expression is parsed and evaluated
3. Result is boolean (true/false)
4. Flow continues on corresponding path

Example evaluation:

```
Expression: {{count}} > 5
Variables: { count: "10" }
Substituted: 10 > 5
Result: true
Path: Yes
```
