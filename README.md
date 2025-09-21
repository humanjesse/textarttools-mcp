# TextArtTools MCP Server

A Model Context Protocol (MCP) server that provides Unicode text styling capabilities, deployed on Cloudflare Workers. This server enables AI agents to transform text using 23 different Unicode styles including bold, italic, cursive, fraktur, zalgo, and many more.

## Features

- **23 Unicode Text Styles**: Bold, italic, cursive, fraktur, zalgo, circled, squared, and more
- **MCP Protocol Compliance**: Full JSON-RPC 2.0 implementation with Server-Sent Events
- **OAuth Authentication**: Secure GitHub OAuth integration
- **Rate Limiting**: Configurable rate limiting per user/IP
- **Analytics**: Built-in usage tracking with Cloudflare Analytics
- **Serverless**: Deployed on Cloudflare Workers for global performance
- **Pay-per-use**: Optimized for Cloudflare's pay-per-use pricing model

## Quick Start

### 1. Deploy to Cloudflare Workers

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/textarttools-mcp-server)

### 2. Configure GitHub OAuth

1. Create a GitHub OAuth App:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Click "New OAuth App"
   - Set Authorization callback URL to: `https://your-worker.your-subdomain.workers.dev/auth/callback`

2. Set environment variables:
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put JWT_SECRET
   ```

### 3. Integrate with Claude Desktop

1. Install mcp-remote proxy:
   ```bash
   npm install -g @anthropic/mcp-remote
   ```

2. Add to your Claude Desktop config (`claude_desktop_config.json`):
   ```json
   {
     "mcp": {
       "servers": {
         "textarttools": {
           "command": "mcp-remote",
           "args": ["sse", "https://your-worker.your-subdomain.workers.dev/sse"]
         }
       }
     }
   }
   ```

3. Authenticate:
   - Visit `https://your-worker.your-subdomain.workers.dev/auth/authorize`
   - Complete GitHub OAuth flow
   - Use the provided session token

## API Reference

### Tools

#### `unicode_style_text`
Transform text using a specified Unicode style.

**Parameters:**
- `text` (string): The text to transform
- `style` (string): One of 23 supported styles
- `preserve_spacing` (boolean, optional): Preserve original spacing

**Example:**
```json
{
  "text": "Hello World",
  "style": "bold"
}
```

**Result:**
```json
{
  "styled_text": "𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱",
  "style_applied": "bold",
  "character_count": 11,
  "processing_time_ms": 2
}
```

#### `list_available_styles`
Get all available text styles with examples and metadata.

**Parameters:** None

#### `preview_styles`
Preview text in multiple styles for comparison.

**Parameters:**
- `text` (string): Text to preview (max 50 characters)
- `styles` (array, optional): Specific styles to include

#### `get_style_info`
Get detailed information about a specific style.

**Parameters:**
- `style` (string): The style to get information about

### Supported Styles

1. **normal** - Plain text
2. **bold** - 𝗕𝗼𝗹𝗱
3. **italic** - 𝘐𝘵𝘢𝘭𝘪𝘤
4. **boldItalic** - 𝙗𝙤𝙡𝙙 𝙞𝙩𝙖𝙡𝙞𝙘
5. **underline** - U̲n̲d̲e̲r̲l̲i̲n̲e̲
6. **strikethrough** - S̶t̶r̶i̶k̶e̶
7. **subscript** - ₛᵤᵦₛᶜᵣᵢₚₜ
8. **superscript** - ˢᵘᵖᵉʳˢᶜʳⁱᵖᵗ
9. **circled** - Ⓒⓘⓡⓒⓛⓔⓓ
10. **fraktur** - 𝔉𝔯𝔞𝔨𝔱𝔲𝔯
11. **doubleStruck** - 𝔻𝕠𝕦𝕓𝕝𝔢
12. **monospace** - 𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎
13. **cursive** - 𝒞𝓊𝓇𝓈𝒾𝓋𝑒
14. **squared** - 🆂🆀🆄🅰🆁🅴
15. **flipped** - pǝddᴉlℲ
16. **zalgo** - Z̸a̴l̵g̶o̸
17. **blue** - 🇧🇱🇺🇪
18. **parenthesized** - ⒫⒜⒭⒠⒩
19. **negativeCircled** - 🅝🅔🅖
20. **boldSerif** - 𝐁𝐨𝐥𝐝 𝐒𝐞𝐫𝐢𝐟
21. **italicSerif** - 𝐼𝑡𝑎𝑙𝑖𝑐 𝑆𝑒𝑟𝑖𝑓
22. **boldItalicSerif** - 𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄 𝑺𝒆𝒓𝒊𝒇
23. **boldFraktur** - 𝕭𝖔𝖑𝖉 𝕱𝖗𝖆𝖐

## Development

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/textarttools-mcp-server.git
   cd textarttools-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your values
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Test locally:
   ```bash
   curl -X POST http://localhost:8788/sse \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Deploy to specific environment
wrangler deploy --env production
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Required |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Required |
| `JWT_SECRET` | Secret for JWT token signing | Required |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `RATE_LIMIT_PER_MINUTE` | Rate limit per minute | `100` |
| `MAX_TEXT_LENGTH` | Maximum text length | `10000` |

### Cloudflare Bindings

- **KV Namespace**: `MCP_SESSIONS` - For session storage
- **Analytics Engine**: `MCP_ANALYTICS` - For usage tracking

## Security

- OAuth 2.0 authentication via GitHub
- Rate limiting per user/IP
- Input validation and sanitization
- CORS protection
- Session management with expiration
- Secure secret storage with Wrangler

## Monitoring

The server includes built-in analytics and health checks:

- **Health Check**: `GET /health`
- **Analytics**: Automatic usage tracking via Cloudflare Analytics Engine
- **Logs**: Structured logging for debugging and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: See [plan.md](plan.md) for detailed implementation guide
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join the community discussions

## Related Projects

- [TextArtTools](https://github.com/your-username/textarttools-fullstack) - Full-stack text art application
- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP specification
- [Claude Desktop](https://claude.ai/desktop) - AI assistant with MCP support