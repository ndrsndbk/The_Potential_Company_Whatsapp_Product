# Send Image Node

Sends an image message with optional caption.

## Overview

| Property | Value |
|----------|-------|
| Category | Messages |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Image URL

URL of the image to send:

```
https://example.com/images/product.jpg
```

Or with variables:

```
https://example.com/images/{{product_id}}.jpg
```

### Caption (Optional)

Text displayed below the image:

```
Check out our latest product!
```

## Supported Formats

| Format | Extension |
|--------|-----------|
| JPEG | .jpg, .jpeg |
| PNG | .png |
| WebP | .webp |

## Examples

### Static Image

```yaml
URL: https://mysite.com/logo.png
Caption: Welcome to our service!
```

### Dynamic Product Image

```yaml
URL: https://store.com/products/{{product_id}}/image.jpg
Caption: "{{product_name}} - ${{product_price}}"
```

### No Caption

```yaml
URL: https://example.com/image.png
Caption: (empty)
```

## Requirements

### Image URL

- Must be publicly accessible (no authentication)
- Must use HTTPS
- Should return correct Content-Type header
- Maximum file size: 5MB

### Caption

- Maximum length: 1024 characters
- Supports variable substitution
- Supports WhatsApp formatting (*bold*, _italic_)

## Best Practices

### Use Reliable Hosting

```yaml
# Good - CDN or reliable host
URL: https://cdn.example.com/image.jpg

# Risky - May be slow or unavailable
URL: https://free-host.com/random/image.jpg
```

### Optimize Images

- Compress images for faster loading
- Use appropriate dimensions (don't send 4K images)
- Recommended: 800-1200px width

### Descriptive Captions

```yaml
# Good - Adds context
Caption: "Product: {{name}}\nPrice: ${{price}}\nIn Stock: {{quantity}}"

# Less helpful
Caption: "Image"
```

### Handle Missing Images

Before sending:

```
Condition: {{product_image_url}} != ""
├── Yes → Send Image
└── No  → Send Text: "Image not available"
```

## Common Issues

### Image Not Displaying

**Causes:**
- URL not accessible
- Wrong file format
- File too large
- HTTPS certificate issue

**Debug:** Test URL directly in browser.

### Slow Loading

**Causes:**
- Large file size
- Slow hosting

**Fix:** Optimize and use CDN.

### Broken After Time

**Causes:**
- Temporary URL expired
- Host removed image

**Fix:** Use permanent, reliable URLs.

## WhatsApp Appearance

```
┌─────────────────────────┐
│                         │
│     [Image Content]     │
│                         │
├─────────────────────────┤
│ Caption text appears    │
│ here below the image    │
└─────────────────────────┘
```

## Related Nodes

- [Send Video](/nodes/send-video) - For video content
- [Send Document](/nodes/send-document) - For downloadable files
- [Send Sticker](/nodes/send-sticker) - For sticker images
