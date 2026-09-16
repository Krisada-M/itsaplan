FROM golang:1.23.10-alpine AS build
ARG TARGETOS
ARG TARGETARCH

ARG MC_TAG=RELEASE.2025-08-13T08-35-41Z
ARG MC_COMMIT=7394ce0dd2a80935aded936b09fa12cbb3cb8096

RUN apk add --no-cache git
WORKDIR /src
RUN git clone --depth 1 --branch "$MC_TAG" https://github.com/minio/mc.git . \
  && test "$(git rev-parse HEAD)" = "$MC_COMMIT" \
  && CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/mc . \
  && chmod +x /out/mc

FROM alpine:3.22

RUN apk add --no-cache ca-certificates
COPY --from=build /out/mc /usr/local/bin/mc

ENTRYPOINT ["/usr/local/bin/mc"]
