#!/bin/sh
# Script to inject environment variables into React build at runtime
# This allows using the same Docker image across different environments

# Create runtime config file
cat <<EOF > /usr/share/nginx/html/env-config.js
window._env_ = {
  REACT_APP_API_URL: "${REACT_APP_API_URL}",
  REACT_APP_SOCKET_URL: "${REACT_APP_SOCKET_URL}",
  REACT_APP_MAX_FILE_SIZE: "${REACT_APP_MAX_FILE_SIZE}"
};
EOF

echo "Environment variables injected successfully"
