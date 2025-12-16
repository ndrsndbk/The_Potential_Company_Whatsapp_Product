# Testing Flows

Testing ensures your flows work correctly before going live. This guide covers the built-in simulator and testing strategies.

## Flow Simulator

The simulator lets you test flows without sending real WhatsApp messages.

### Opening the Simulator

1. Open a flow in the editor
2. Click **Test** button in the toolbar
3. Simulator panel opens on the right

### Using the Simulator

```
┌─────────────────────────┐
│  WhatsApp Simulator     │
├─────────────────────────┤
│                         │
│  [Bot] Hi! Welcome      │
│                         │
│        [You] HELLO      │
│                         │
│  [Bot] How can I help?  │
│                         │
├─────────────────────────┤
│  Type message...  [Send]│
└─────────────────────────┘
```

1. Type a message to trigger the flow
2. Messages appear in chat format
3. Bot responses show immediately
4. Continue the conversation to test paths

### Simulator Features

- **Reset** - Clear conversation and restart
- **Variables** - View current variable values
- **Step Highlight** - See which node is executing
- **Speed Control** - Adjust execution speed

## Testing Strategies

### Happy Path Testing

Test the expected user journey:

1. Trigger the flow correctly
2. Provide valid inputs at each step
3. Complete to the end
4. Verify all messages appear correctly

### Edge Case Testing

Test unusual inputs:

| Test Case | Input | Expected |
|-----------|-------|----------|
| Empty input | "" | Handled gracefully |
| Very long text | 1000+ chars | No errors |
| Special characters | "Hello! @#$%" | Works correctly |
| Emojis | "👍🎉" | Displayed properly |
| Numbers as text | "123" | Parsed correctly |

### Branch Testing

For flows with conditions:

1. Test the "Yes" branch with matching input
2. Test the "No" branch with non-matching input
3. Test boundary conditions (exact matches)

### Loop Testing

For flows with loops:

1. Test completing loop normally
2. Test early exit conditions
3. Test maximum iterations

## Testing Checklist

### Before Publishing

- [ ] All paths tested
- [ ] Variables substitute correctly
- [ ] Media loads properly (images, videos)
- [ ] Buttons and lists work
- [ ] Error handling works
- [ ] Timeouts handled
- [ ] Flow ends cleanly

### Message Content

- [ ] No typos
- [ ] Variables not showing as `{{variable}}`
- [ ] Tone is appropriate
- [ ] Links work (if any)
- [ ] Phone numbers formatted correctly

### Logic

- [ ] Conditions evaluate correctly
- [ ] Loops terminate properly
- [ ] API calls succeed
- [ ] Fallback paths work

## Real Device Testing

After simulator testing, test on real WhatsApp:

### Test Phone Setup

1. Use a different phone than your business number
2. Add your test number to the WhatsApp sandbox (if using test mode)
3. Save the business number as a contact

### Testing Steps

1. Publish the flow
2. Send trigger message from test phone
3. Walk through entire flow
4. Check message formatting on mobile
5. Test buttons and interactive elements

### What to Check

- Message timing and delays
- Media loading on mobile
- Button tap responses
- List scrolling
- Read receipts (if using Mark as Read)

## Debugging

### Flow Not Triggering

1. Verify trigger type matches your input
2. Check if another flow matches first
3. Ensure flow is published AND active
4. Check WhatsApp webhook is receiving messages

### Variables Not Working

1. Check variable name spelling
2. Ensure variable is set before use
3. Check for typos in `{{brackets}}`
4. Use debug Send Text to inspect values

### API Calls Failing

1. Check URL is correct
2. Verify authentication headers
3. Test API independently (Postman/curl)
4. Check response handling

### Messages Not Sending

1. Verify WhatsApp config is correct
2. Check token hasn't expired
3. Look at flow execution logs
4. Verify phone number format

## Test Data Management

### Resetting Test State

To start fresh:

1. Clear conversation_state in database
2. Reset any customer records
3. Clear processed_events for your number

### Test vs Production

Keep test and production separate:

- Use different WhatsApp numbers
- Use different flows for testing
- Tag test flows clearly: "[TEST] Flow Name"
- Delete test data before going live

## Performance Testing

### Load Considerations

- Each webhook call is independent
- Multiple users can use flows simultaneously
- Database queries are the main bottleneck

### Monitoring

Check these metrics:
- Webhook response time
- Database query duration
- WhatsApp API latency
- Error rates in logs
