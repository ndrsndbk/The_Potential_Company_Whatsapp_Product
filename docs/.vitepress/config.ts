import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'WhatsApp Flow Builder',
  description: 'Documentation for the WhatsApp Flow Builder - Create automated conversation flows for WhatsApp Business',
  base: '/docs/',
  ignoreDeadLinks: true,

  markdown: {
    config: (md) => {
      // Escape {{ in markdown to prevent Vue interpolation
      const defaultRender = md.renderer.rules.text || ((tokens, idx) => tokens[idx].content)
      md.renderer.rules.text = (tokens, idx, options, env, self) => {
        const content = tokens[idx].content
        // Replace {{ with escaped version
        tokens[idx].content = content.replace(/\{\{/g, '<span v-pre>{{</span>').replace(/\}\}/g, '<span v-pre>}}</span>')
        return defaultRender(tokens, idx, options, env, self)
      }
    }
  },

  head: [
    ['link', { rel: 'icon', href: '/docs/logo.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap', rel: 'stylesheet' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Nodes', link: '/nodes/overview' },
      { text: 'API', link: '/api/overview' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Flow Builder?', link: '/guide/what-is-flow-builder' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Architecture', link: '/guide/architecture' },
          ]
        },
        {
          text: 'Flow Editor',
          items: [
            { text: 'Creating Flows', link: '/guide/creating-flows' },
            { text: 'Working with Nodes', link: '/guide/working-with-nodes' },
            { text: 'Variables', link: '/guide/variables' },
            { text: 'Testing Flows', link: '/guide/testing-flows' },
          ]
        },
        {
          text: 'Setup',
          items: [
            { text: 'WhatsApp Business Setup', link: '/guide/whatsapp-setup' },
            { text: 'Environment Variables', link: '/guide/environment-variables' },
            { text: 'Deployment', link: '/guide/deployment' },
          ]
        },
        {
          text: 'Multi-Tenant',
          items: [
            { text: 'Organizations', link: '/guide/organizations' },
            { text: 'Users & Roles', link: '/guide/users-and-roles' },
          ]
        },
      ],
      '/nodes/': [
        {
          text: 'Node Reference',
          items: [
            { text: 'Overview', link: '/nodes/overview' },
          ]
        },
        {
          text: 'Triggers',
          items: [
            { text: 'Trigger', link: '/nodes/trigger' },
          ]
        },
        {
          text: 'Messages',
          items: [
            { text: 'Send Text', link: '/nodes/send-text' },
            { text: 'Send Image', link: '/nodes/send-image' },
            { text: 'Send Video', link: '/nodes/send-video' },
            { text: 'Send Audio', link: '/nodes/send-audio' },
            { text: 'Send Document', link: '/nodes/send-document' },
            { text: 'Send Buttons', link: '/nodes/send-buttons' },
            { text: 'Send List', link: '/nodes/send-list' },
            { text: 'Send Location', link: '/nodes/send-location' },
            { text: 'Send Contact', link: '/nodes/send-contact' },
            { text: 'Send Sticker', link: '/nodes/send-sticker' },
            { text: 'Send Stamp Card', link: '/nodes/send-stamp-card' },
          ]
        },
        {
          text: 'User Data',
          items: [
            { text: 'Get Customer Name', link: '/nodes/get-customer-name' },
            { text: 'Get Customer Phone', link: '/nodes/get-customer-phone' },
            { text: 'Get Customer Country', link: '/nodes/get-customer-country' },
            { text: 'Get Message Timestamp', link: '/nodes/get-message-timestamp' },
          ]
        },
        {
          text: 'Logic',
          items: [
            { text: 'Wait for Reply', link: '/nodes/wait-for-reply' },
            { text: 'Condition', link: '/nodes/condition' },
            { text: 'Set Variable', link: '/nodes/set-variable' },
            { text: 'Loop', link: '/nodes/loop' },
            { text: 'Random Choice', link: '/nodes/random-choice' },
          ]
        },
        {
          text: 'Utilities',
          items: [
            { text: 'Format Phone Number', link: '/nodes/format-phone-number' },
            { text: 'Date/Time', link: '/nodes/date-time' },
            { text: 'Math Operation', link: '/nodes/math-operation' },
            { text: 'Text Operation', link: '/nodes/text-operation' },
            { text: 'Mark as Read', link: '/nodes/mark-as-read' },
          ]
        },
        {
          text: 'Actions',
          items: [
            { text: 'API Call', link: '/nodes/api-call' },
            { text: 'Delay', link: '/nodes/delay' },
            { text: 'End', link: '/nodes/end' },
          ]
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Flows', link: '/api/flows' },
            { text: 'WhatsApp Configs', link: '/api/whatsapp-configs' },
            { text: 'Webhooks', link: '/api/webhooks' },
            { text: 'Admin APIs', link: '/api/admin' },
          ]
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/TheCircleGuy/The_Potential_Company_Whatsapp_Product' }
    ],

    footer: {
      message: 'Built with VitePress',
      copyright: 'Copyright © 2024 Potential Company'
    },

    search: {
      provider: 'local'
    }
  }
})
