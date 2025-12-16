# Variables

Variables store and retrieve data during flow execution. They enable dynamic messages and complex logic.

## Variable Syntax

Use double curly braces to reference variables:

```
Hello {{customer_name}}!
Your phone number is {{customer_phone}}.
You selected: {{last_reply}}
```

## System Variables

These variables are automatically available:

| Variable | Description | Example |
|----------|-------------|---------|
| `customer_name` | WhatsApp profile name | "John Doe" |
| `customer_phone` | Phone number (E.164) | "+1234567890" |
| `customer_country` | Country code from phone | "US" |
| `message_timestamp` | When message was received | "2024-01-15T10:30:00Z" |
| `last_reply` | User's most recent message | "Hello" |

## Setting Variables

### Using Set Variable Node

1. Add a **Set Variable** node
2. Enter variable name: `my_variable`
3. Enter value: `some value` or `{{other_variable}}`

### From Wait for Reply

The **Wait for Reply** node automatically stores the user's response:

- Default: Stores in `last_reply`
- Custom: Set "Store in Variable" to a custom name

### From API Call

The **API Call** node can store response data:

- Full response: Set "Store Response In" variable name
- Use JSONPath: Extract specific fields

## Using Variables in Conditions

Variables are used in condition expressions:

```
{{last_reply}} == "YES"
{{order_total}} > 100
{{customer_country}} == "US"
```

### Comparison Operators

| Operator | Meaning |
|----------|---------|
| `==` | Equal to |
| `!=` | Not equal to |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `contains` | String contains |
| `startsWith` | String starts with |
| `endsWith` | String ends with |

### Examples

```
// Check exact match
{{last_reply}} == "MENU"

// Check if contains text
{{last_reply}} contains "help"

// Numeric comparison
{{item_count}} > 0

// Case-insensitive (lowercase both sides)
{{last_reply_lower}} == "yes"
```

## Variable Scope

Variables exist for the duration of a conversation:

```
Flow Start → Set var → Use var → Use var → Flow End
     │           │          │         │          │
   (empty)    (set)      (use)     (use)     (cleared)
```

### Persistence

- Variables persist across wait states
- Variables are cleared when flow ends
- New flow execution starts fresh

## Text Operations

Use **Text Operation** node to manipulate text:

| Operation | Input | Output |
|-----------|-------|--------|
| `uppercase` | "hello" | "HELLO" |
| `lowercase` | "HELLO" | "hello" |
| `trim` | "  hi  " | "hi" |
| `length` | "hello" | "5" |
| `substring` | "hello", 0, 2 | "he" |

## Math Operations

Use **Math Operation** node for calculations:

| Operation | Expression | Result |
|-----------|------------|--------|
| Add | `{{a}} + {{b}}` | Sum |
| Subtract | `{{a}} - {{b}}` | Difference |
| Multiply | `{{a}} * {{b}}` | Product |
| Divide | `{{a}} / {{b}}` | Quotient |

## Best Practices

### Use Descriptive Names

```
Good: {{customer_order_total}}
Bad:  {{x}}
```

### Initialize Before Use

Always set a variable before referencing it:

```
❌ Send Text: "Total: {{total}}"  // total not set yet!

✅ Set Variable: total = 0
   Send Text: "Total: {{total}}"
```

### Handle Missing Data

Use conditions to check if variables have values:

```
Condition: {{customer_name}} != ""
├── Yes → "Hello {{customer_name}}!"
└── No  → "Hello there!"
```

### Avoid Reserved Names

Don't use system variable names for custom variables:
- `customer_name`
- `customer_phone`
- `last_reply`
- `message_timestamp`

## Debugging Variables

### Check Variable Values

Add a Send Text node to debug:

```
DEBUG:
- name: {{customer_name}}
- phone: {{customer_phone}}
- reply: {{last_reply}}
```

### Use Step IDs

Reference node outputs by step ID in complex flows:

```
{{send_buttons_1.selected}}
{{api_call_2.response.data}}
```

## Variable Reference in Nodes

### Message Nodes

All message nodes support variable substitution:

```json
{
  "text": "Hello {{customer_name}}, you selected {{last_reply}}."
}
```

### Condition Node

Variables in condition expressions:

```
{{last_reply}} == "YES"
```

### API Call Node

Variables in URL, headers, and body:

```
URL: https://api.example.com/users/{{customer_phone}}
Body: {"name": "{{customer_name}}"}
```

### Loop Node

Loop counter available as variable:

```
Iteration {{loop_counter}} of {{loop_total}}
```
