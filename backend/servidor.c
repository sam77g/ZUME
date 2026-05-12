#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <winsock2.h>
#else
#include <unistd.h>
#include <arpa/inet.h>
#endif

#define PORTA 8080

int main() {

    int servidor_fd, cliente_fd;

    struct sockaddr_in endereco;

    int addrlen = sizeof(endereco);

    char buffer[3000] = {0};

    servidor_fd = socket(AF_INET, SOCK_STREAM, 0);

    if (servidor_fd == 0) {
        printf("Erro no socket\n");
        exit(EXIT_FAILURE);
    }

    endereco.sin_family = AF_INET;
    endereco.sin_addr.s_addr = INADDR_ANY;
    endereco.sin_port = htons(PORTA);

    bind(
        servidor_fd,
        (struct sockaddr *)&endereco,
        sizeof(endereco)
    );

    listen(servidor_fd, 3);

    printf("Servidor rodando na porta 8080...\n");

    while (1) {

        cliente_fd = accept(
            servidor_fd,
            (struct sockaddr *)&endereco,
            (socklen_t*)&addrlen
        );

        read(cliente_fd, buffer, 3000);

        printf("%s\n", buffer);

        char *json = strstr(buffer, "{");

        if (json != NULL) {

            FILE *arquivo = fopen("tempos.txt", "a");

            if (arquivo != NULL) {

                fprintf(arquivo, "%s\n", json);

                fclose(arquivo);
            }
        }

        char resposta[] =
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: text/plain\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "\r\n"
            "Tempo salvo!";

        send(
            cliente_fd,
            resposta,
            strlen(resposta),
            0
        );

#ifdef _WIN32
        closesocket(cliente_fd);
#else
        close(cliente_fd);
#endif

        memset(buffer, 0, sizeof(buffer));
    }

    return 0;
}