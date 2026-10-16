from mcp_tools import build_server

server = build_server()

if __name__ == "__main__":
    server.run("stdio")
