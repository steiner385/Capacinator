#!/bin/bash

echo "🎨 Shadcn MCP Server Setup for Claude Code"
echo "=========================================="

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Check Claude CLI
if ! command -v claude &> /dev/null; then
    echo "❌ Claude CLI is not installed. Please install Claude Code first."
    exit 1
fi

CLAUDE_VERSION=$(claude --version)
echo "✅ Claude Code version: $CLAUDE_VERSION"

# Function to add server with token
add_server_with_token() {
    local token=$1
    echo "🔧 Adding Shadcn MCP server with GitHub token..."
    claude mcp remove shadcn-ui 2>/dev/null
    claude mcp add shadcn-ui npx -- -y @jpisnice/shadcn-ui-mcp-server --github-api-key "$token"
}

# Function to add server without token
add_server_without_token() {
    echo "🔧 Adding Shadcn MCP server..."
    claude mcp remove shadcn-ui 2>/dev/null
    claude mcp add shadcn-ui npx -- -y @jpisnice/shadcn-ui-mcp-server
}

# Test the server
echo ""
echo "🧪 Testing Shadcn MCP server..."
if npx -y @jpisnice/shadcn-ui-mcp-server --version 2>/dev/null; then
    echo "✅ Shadcn MCP server is available!"
else
    echo "⚠️  Could not verify server installation"
fi

# Check if server is already configured
echo ""
echo "📋 Current MCP servers:"
claude mcp list

# Offer to add/update configuration
echo ""
echo "💡 To avoid GitHub API rate limits, you can add a personal access token."
echo "   Create one at: https://github.com/settings/tokens/new"
echo "   Required scopes: public_repo (or repo for private repos)"
echo ""
read -p "Do you want to (re)configure the Shadcn MCP server? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Do you have a GitHub token to add? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your GitHub Personal Access Token: " github_token
        if [ ! -z "$github_token" ]; then
            add_server_with_token "$github_token"
            
            # Also set it as environment variable for current session
            export GITHUB_PERSONAL_ACCESS_TOKEN="$github_token"
            
            # Update project .mcp.json with token
            cat > .mcp.json << EOF
{
  "shadcn-ui": {
    "command": "npx",
    "args": ["-y", "@jpisnice/shadcn-ui-mcp-server", "--github-api-key", "$github_token"],
    "type": "stdio",
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "$github_token"
    },
    "metadata": {
      "description": "Provides access to shadcn/ui v4 components, demos, and installation guides",
      "capabilities": [
        "Get component source code",
        "Access component demos",
        "View installation instructions",
        "List available components",
        "Retrieve complete block implementations"
      ]
    }
  }
}
EOF
            echo "✅ Updated .mcp.json with token"
        fi
    else
        add_server_without_token
    fi
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Configuration locations:"
echo "   - Local (user) config: Added via 'claude mcp add'"
echo "   - Project config: .mcp.json (can be committed to git)"
echo ""
echo "🚀 The Shadcn MCP server is now available in Claude Code!"
echo ""
echo "🛠️  Available MCP tools:"
echo "   - get_component: Get component source code"
echo "   - get_component_demo: Get component demo code"
echo "   - get_installation_instructions: Get installation guide"
echo "   - get_components_list: List all available components"
echo ""
echo "📚 Example usage in Claude Code:"
echo "   'Can you show me the shadcn button component?'"
echo "   'How do I install the shadcn dialog component?'"
echo "   'Show me a demo of the shadcn data table'"