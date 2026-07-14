#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_SCRIPT="${SCRIPT_DIR}/build.sh"
BASE_IMAGE="coeus:milkonomy"
TARGET_IMAGE="coeus:mwi-guild-trial"
BUILD_CONTAINER="mwi-guild-trial-builder"
RUN_CONTAINER="mwi-guild-trial"
PORT="5742"

docker rm -f "${BUILD_CONTAINER}" >/dev/null 2>&1 || true
docker run \
    --name "${BUILD_CONTAINER}" \
    -v "${SCRIPT_DIR}:${SCRIPT_DIR}" \
    -w "${SCRIPT_DIR}" \
    "${BASE_IMAGE}" \
    bash "${BUILD_SCRIPT}"

IMPORT_CHANGES=()
while IFS= read -r environment; do
    [ -n "${environment}" ] && IMPORT_CHANGES+=(--change "ENV ${environment}")
done < <(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "${BASE_IMAGE}")

workdir="$(docker inspect -f '{{.Config.WorkingDir}}' "${BASE_IMAGE}")"
[ -n "${workdir}" ] && IMPORT_CHANGES+=(--change "WORKDIR ${workdir}")
IMPORT_CHANGES+=(--change "EXPOSE ${PORT}")
IMPORT_CHANGES+=(--change 'CMD ["nginx","-g","daemon off;"]')

docker export "${BUILD_CONTAINER}" | docker import "${IMPORT_CHANGES[@]}" - "${TARGET_IMAGE}"
docker rm -f "${BUILD_CONTAINER}" >/dev/null 2>&1 || true
docker rm -f "${RUN_CONTAINER}" >/dev/null 2>&1 || true

docker run -d \
    --name "${RUN_CONTAINER}" \
    --restart unless-stopped \
    -p "${PORT}:${PORT}" \
    "${TARGET_IMAGE}"

docker images -f "dangling=true" -q | xargs -r docker rmi >/dev/null 2>&1 || true

echo "MWI Guild Trial Simulator: http://<host>:${PORT}/"
