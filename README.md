# TextArtTools MCP Server

**✅ Live and Ready to Use**: `https://mcp.textarttools.com`

A production-ready Model Context Protocol (MCP) server providing Unicode text styling capabilities. Transform text using 23 different Unicode styles including bold, italic, cursive, fraktur, zalgo, and many more. Currently deployed on Cloudflare Workers and ready for immediate integration with AI agents.

## 🚀 Quick Start - Use the Live Server

**No setup required!** The server is live and operational:

### Integrate with Claude Desktop

1. **Install mcp-remote proxy**:
   ```bash
   npm install -g @anthropic/mcp-remote
   ```

2. **Add to Claude Desktop config** (`claude_desktop_config.json`):
   ```json
   {
     "mcp": {
       "servers": {
         "textarttools": {
           "command": "mcp-remote",
           "args": ["sse", "https://mcp.textarttools.com/sse"]
         }
       }
     }
   }
   ```

3. **Start using it immediately**:
   - All 23 Unicode styles available
   - 100 requests per minute
   - No authentication required

## Features

- **✅ 23 Unicode Text Styles**: Bold, italic, cursive, fraktur, zalgo, circled, squared, and more
- **✅ Full MCP Protocol**: JSON-RPC 2.0 with Server-Sent Events, Resources API, Prompts API
- **✅ Live Deployment**: Production server at `mcp.textarttools.com`
- **✅ Security Headers**: CSP, HSTS, X-Frame-Options, and security controls
- **✅ Rate Limiting**: 100 requests/minute with KV-based tracking
- **✅ Analytics Ready**: Cloudflare Analytics Engine integration
- **✅ Global Performance**: Cloudflare Workers edge deployment
- **✅ AI-Friendly**: API documentation endpoint for auto-discovery

## API Usage Examples

### Direct API Calls

Test the live server directly:

```bash
# Transform text to bold style
curl -X POST https://mcp.textarttools.com/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "unicode_style_text",
      "arguments": {
        "text": "Hello World",
        "style": "bold"
      }
    }
  }'

# List all available styles
curl -X POST https://mcp.textarttools.com/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_available_styles",
      "arguments": {}
    }
  }'
```

### API Discovery

Visit `https://mcp.textarttools.com/` for comprehensive API documentation designed for AI agents.

## MCP Tools Available

The server provides 4 MCP tools for text styling:

### 1. `unicode_style_text`
Transform text using any of the 23 Unicode styles.

**Parameters:**
- `text` (string): The text to transform (max 10,000 characters)
- `style` (string): One of 23 supported styles
- `preserve_spacing` (boolean, optional): Preserve original spacing (default: true)

**Returns:**
- `styled_text` (string): The transformed text
- `style_applied` (string): The style that was applied
- `character_count` (number): Number of characters processed

### 2. `list_available_styles`
Get all available text styles with examples and metadata.

**Parameters:** None
**Returns:** Array of style definitions with examples

### 3. `preview_styles`
Preview text in multiple styles for comparison.

**Parameters:**
- `text` (string): Text to preview (max 50 characters)
- `styles` (array, optional): Specific styles to include

### 4. `get_style_info`
Get detailed information about a specific style.

**Parameters:**
- `style` (string): The style to get information about

**Returns:** Detailed style metadata including Unicode ranges and platform compatibility

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

## Local Development (Optional)

If you want to run your own instance or contribute to development:

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/textarttools-mcp-server.git
   cd textarttools-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Test locally**:
   ```bash
   curl -X POST http://localhost:8788/sse \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

### Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run deploy     # Deploy to Cloudflare Workers
npm run lint       # Code linting
npm run typecheck  # TypeScript validation
```

### Docker Development (Alternative)

```bash
# Run development environment
docker-compose up dev

# Run tests
docker-compose up test

# Run build
docker-compose up build
```

## Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API documentation for AI discovery |
| `/sse` | POST | MCP JSON-RPC 2.0 endpoint |
| `/health` | GET | Server health check |
| `/auth/*` | Various | OAuth authentication (optional) |

## Architecture

### MVP Implementation
- **Simple & Reliable**: Focused on core functionality
- **Cloudflare Security**: Built-in DDoS protection and global performance
- **Basic Rate Limiting**: KV-based request limiting
- **No Authentication Required**: Public access for AI agents

### Enterprise Features Available
Advanced security and monitoring features are implemented but currently unused:
- Content Security Policy (CSP) enforcement
- Audit logging with tamper protection
- Request signing and validation
- Advanced authentication and authorization
- Comprehensive monitoring and alerting

See `SECURITY.md` for enterprise security documentation.

## Links & Resources

- **Live Server**: `https://mcp.textarttools.com`
- **API Documentation**: `https://mcp.textarttools.com/` (AI-friendly)
- **Health Check**: `https://mcp.textarttools.com/health`
- **Development Plan**: [plan.md](plan.md) - Implementation status and roadmap
- **Security Guide**: [SECURITY.md](SECURITY.md) - Enterprise security documentation
- **Model Context Protocol**: [MCP Specification](https://modelcontextprotocol.io/)

## Status

**✅ MVP Complete & Deployed**
- Production-ready MCP server
- 23 Unicode text transformation styles
- Full MCP protocol compliance
- Global Cloudflare Workers deployment
- Ready for AI agent integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the development server
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.