# MCP Registry Update Instructions

## Registry Entry - COMPLETED ✅
- **Namespace**: `com.textarttools/textarttools-mcp`
- **Server ID**: `341ff90c-b897-48d0-8b1c-4f00dd448806`
- **Current URL**: `https://mcp.textarttools.com/sse`
- **Status**: Live in MCP Registry
- **Authentication**: DNS verification with textarttools.com

## Registration Process - COMPLETED ✅

### 1. DNS Authentication Setup
- Generated Ed25519 keypair for domain verification
- Added TXT record to textarttools.com DNS: `v=MCPv1; k=ed25519; p=RPDxQxRj5mOTii/ky/ZAKgIKKQNTS1Qw/AYhS+gE3DE=`
- Authenticated with MCP registry using DNS verification

### 2. Server Registration
- Configured server.json with custom domain namespace
- Published to registry with DNS authentication
- Registry assigned Server ID: `341ff90c-b897-48d0-8b1c-4f00dd448806`

### 3. Final Configuration
- Namespace: `com.textarttools/textarttools-mcp`
- Endpoint: `https://mcp.textarttools.com/sse`
- Authentication method: DNS verification

## Benefits of Update

### ✅ Eliminates Issues
- **No more HTML redirects**: MCP clients get direct JSON-RPC responses
- **Faster response times**: Removes redirect latency
- **Better reliability**: Eliminates redirect failure points

### ✅ Follows Standards
- **IBM Pattern**: Matches how IBM Context Forge handles registry + external hosting
- **Registry Compliance**: Uses allowed external hosting for `io.github.*` namespace
- **Professional Architecture**: Clean separation of documentation and service

### ✅ Maintains Benefits
- **Private repository**: Code remains private with GitHub Pro
- **Public service**: MCP server accessible to all users
- **Registry listing**: Maintains official registry presence
- **Documentation**: GitHub Pages serves project information

## Testing Commands

After update, verify functionality:

```bash
# Test direct MCP connection
curl -X POST https://mcp.textarttools.com/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Test text styling
curl -X POST https://mcp.textarttools.com/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "unicode_style_text",
      "arguments": {
        "text": "Hello World",
        "style": "bold"
      }
    }
  }'
```

## Rollback Plan

If issues arise:
1. **Immediate**: Registry can be reverted to GitHub Pages URL
2. **Temporary**: GitHub Pages redirect still exists as fallback
3. **Support**: Production server remains unchanged during transition

## Registry Rules Reference

Per MCP Registry documentation:
- **`io.github.*` namespaces**: Require GitHub authentication only
- **External hosting**: Explicitly allowed for `io.github.*` entries
- **Domain validation**: Not required (unlike `com.domain.*` namespaces)
- **URL flexibility**: Can point to any reachable endpoint

This update aligns with registry rules and industry best practices.