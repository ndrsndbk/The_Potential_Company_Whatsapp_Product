# Wait for Reply Node

Pauses flow execution until the user sends a message.

## Overview

| Property | Value |
|----------|-------|
| Category | Logic |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Store in Variable

The variable name to store the user's reply (default: `last_reply`):

```
Variable: user_answer
```

### Timeout (Optional)

Maximum seconds to wait before timing out:

```
Timeout: 300  (5 minutes)
```

## How It Works

1. Flow execution pauses at this node
2. State is saved to database
3. When user sends a message:
   - Message is stored in specified variable
   - Flow execution resumes
4. If timeout occurs:
   - Flow can branch to timeout path (if configured)

## Examples

### Basic Reply Capture

```
Send Text: "What is your name?"
    ↓
Wait for Reply (store in: customer_name)
    ↓
Send Text: "Nice to meet you, {{customer_name}}!"
```

### With Validation

```
Send Text: "Enter your email:"
    ↓
Wait for Reply (store in: email_input)
    ↓
Condition: {{email_input}} contains "@"
    ├── Yes → Continue
    └── No  → Send Text: "Invalid email" → Loop back
```

### Multiple Questions

```
Send Text: "Question 1: What's your name?"
    ↓
Wait for Reply (store in: name)
    ↓
Send Text: "Question 2: What's your phone?"
    ↓
Wait for Reply (store in: phone)
    ↓
Send Text: "Thanks {{name}}! We'll call {{phone}}"
```

## Capturing Different Reply Types

### Text Replies

User types a message → stored as string

```
User sends: "Hello there"
{{last_reply}} = "Hello there"
```

### Button Clicks

User clicks interactive button → button ID stored

```
User clicks button with ID "opt_1"
{{last_reply}} = "opt_1"
```

### List Selections

User selects list item → item ID stored

```
User selects item with ID "product_a"
{{last_reply}} = "product_a"
```

### Media Messages

User sends image/video/audio → media type noted

```
User sends an image
{{last_reply}} = "[image]"
{{last_reply_media_url}} = "https://..."
```

## Flow Pattern: Question Loop

Collect multiple pieces of information:

```
┌─→ Ask Question
│       ↓
│   Wait for Reply
│       ↓
│   Validate
│       ↓
│   Valid? ──No──┐
│       │        │
│      Yes       │
│       ↓        │
│   Next Question│
│       │        │
└───────┴────────┘
```

## Flow Pattern: Menu Selection

```
Send Buttons: "Choose option"
      ↓
Wait for Reply
      ↓
Condition: {{last_reply}} == "opt_1"
├── Yes → Handle Option 1
└── No  → Condition: {{last_reply}} == "opt_2"
            ├── Yes → Handle Option 2
            └── No  → Handle Option 3
```

## State Persistence

When waiting for reply:

1. Current node ID saved to `conversation_state`
2. All variables saved to database
3. Flow ID and context preserved

When user replies:

1. Webhook receives message
2. State loaded from database
3. Reply stored in variable
4. Execution continues from this node

## Best Practices

### Use Descriptive Variable Names

```yaml
# Good
store_in: customer_email

# Bad
store_in: x
```

### Validate Input

Always validate user input after Wait for Reply:

```
Wait for Reply → Condition (validate) → Continue or Ask Again
```

### Handle Unexpected Input

Users might send anything. Plan for:
- Empty messages
- Media instead of text
- Button clicks when expecting text
- Text when expecting button click

### Set Reasonable Timeouts

```yaml
# Quick response expected
timeout: 60  (1 minute)

# User might need to find information
timeout: 300  (5 minutes)

# Long form (filling out details)
timeout: 900  (15 minutes)
```

## Common Issues

### Reply Not Captured

**Problem:** Variable stays empty

**Causes:**
- Variable name mismatch
- Flow ended before Wait node
- Wrong flow triggered instead

### Flow Doesn't Continue

**Problem:** User replied but flow stopped

**Causes:**
- Different flow matched the reply
- State was cleared
- Timeout occurred

### Multiple Replies

**Problem:** User sends multiple messages

**Solution:** Each message triggers a new check. Only the first reply continues the paused flow. Subsequent messages may trigger new flows.

## Technical Details

Database state while waiting:

```json
{
  "phone_number": "+1234567890",
  "flow_id": "uuid",
  "current_node_id": "wait_1",
  "variables": {
    "customer_name": "John",
    "step": 2
  }
}
```
