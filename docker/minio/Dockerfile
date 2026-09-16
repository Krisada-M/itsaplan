FROM golang:1.24.8-alpine AS build
ARG TARGETOS
ARG TARGETARCH

ARG MINIO_TAG=RELEASE.2025-10-15T17-29-55Z
ARG MINIO_COMMIT=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a

RUN apk add --no-cache git
WORKDIR /src
RUN git clone --depth 1 --branch "$MINIO_TAG" https://github.com/minio/minio.git . \
  && test "$(git rev-parse HEAD)" = "$MINIO_COMMIT" \
  && CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/minio . \
  && chmod +x /out/minio

FROM alpine:3.22

RUN apk add --no-cache ca-certificates
COPY --from=build /out/minio /usr/local/bin/minio

ENTRYPOINT ["/usr/local/bin/minio"]
