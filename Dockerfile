FROM rust:1.96.0-slim AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs # Dummy main for dep caching
RUN cargo build --release
RUN rm -rf src

COPY src ./src
RUN cargo build --release


FROM debian:bookworm-slim
WORKDIR /app

COPY --from=builder /app/target/release/docker-backend /app/proxy-api
CMD ["./proxy-api"]
