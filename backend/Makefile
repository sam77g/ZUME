# Makefile — servidor Pomodoro em C

CC      = gcc
TARGET  = server
SRC     = server.c
LIBS    = -lsqlite3 -lmicrohttpd -lpthread
CFLAGS  = -Wall -Wextra -O2

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(SRC) -o $(TARGET) $(LIBS)

install-deps:
	sudo apt install -y libsqlite3-dev libmicrohttpd-dev

clean:
	rm -f $(TARGET) pomodoro.db

.PHONY: all install-deps clean
