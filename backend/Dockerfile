FROM debian:bookworm

RUN apt-get update && apt-get install -y \
    gcc \
    make \
    libsqlite3-dev \
    libmicrohttpd-dev \
    libssl-dev \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN gcc server.c -o server \
    -lsqlite3 \
    -lmicrohttpd \
    -lpthread \
    -lssl \
    -lcrypto \
    -lcurl

CMD ["./server"]
