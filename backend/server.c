/*
 * server.c — Backend Pomodoro
 * Compilar: gcc server.c -o server -lsqlite3 -lmicrohttpd -lpthread -lssl -lcrypto
 * Rodar:    ./server
 * Porta:    8080
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <microhttpd.h>
#include <sqlite3.h>
#include <openssl/sha.h>

#define PORT        8080
#define DB_FILE     "pomodoro.db"
#define MAX_BODY    4096

static sqlite3 *db = NULL;

/* ─── SHA-256: senha → hash hex (64 chars) ───────────────── */

static void sha256_hex(const char *input, char out[65]) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256((const unsigned char *)input, strlen(input), hash);
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++)
        sprintf(out + i * 2, "%02x", hash[i]);
    out[64] = '\0';
}

/* ─── banco de dados ─────────────────────────────────────── */

void db_init(void) {
    char *err = NULL;
    sqlite3_open(DB_FILE, &db);

    const char *sql_usuarios =
        "CREATE TABLE IF NOT EXISTS usuarios ("
        "  id       INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  nome     TEXT    NOT NULL,"
        "  email    TEXT    NOT NULL UNIQUE,"
        "  senha    TEXT    NOT NULL"
        ");";

    const char *sql_sessoes =
        "CREATE TABLE IF NOT EXISTS sessoes ("
        "  id          INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  usuario_id  INTEGER NOT NULL,"
        "  duracao_seg INTEGER NOT NULL,"
        "  criado_em   TEXT DEFAULT (datetime('now')),"
        "  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)"
        ");";

    sqlite3_exec(db, sql_usuarios, NULL, NULL, &err);
    if (err) { fprintf(stderr, "Erro usuarios: %s\n", err); sqlite3_free(err); }

    sqlite3_exec(db, sql_sessoes, NULL, NULL, &err);
    if (err) { fprintf(stderr, "Erro sessoes: %s\n", err); sqlite3_free(err); }

    printf("[DB] Banco inicializado em '%s'\n", DB_FILE);
}

/* ─── helpers JSON ───────────────────────────────────────── */

static int json_get(const char *body, const char *key, char *out, size_t out_sz) {
    char pattern[64];
    snprintf(pattern, sizeof(pattern), "\"%s\":", key);
    const char *p = strstr(body, pattern);
    if (!p) return 0;
    p += strlen(pattern);
    while (*p == ' ') p++;
    if (*p == '"') {
        p++;
        size_t i = 0;
        while (*p && *p != '"' && i < out_sz - 1) out[i++] = *p++;
        out[i] = '\0';
    } else {
        size_t i = 0;
        while (*p && *p != ',' && *p != '}' && i < out_sz - 1) out[i++] = *p++;
        out[i] = '\0';
    }
    return 1;
}

/* ─── rotas ──────────────────────────────────────────────── */

static const char *rota_cadastro(const char *body) {
    static char resp[256];
    char nome[128], email[128], senha[128], senha_hash[65];

    if (!json_get(body, "nome",  nome,  sizeof(nome))  ||
        !json_get(body, "email", email, sizeof(email)) ||
        !json_get(body, "senha", senha, sizeof(senha)))
        return "{\"ok\":false,\"msg\":\"Campos faltando\"}";

    sha256_hex(senha, senha_hash); /* nunca salva a senha direta */

    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db,
        "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?);",
        -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, nome,       -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, email,      -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, senha_hash, -1, SQLITE_STATIC);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    if      (rc == SQLITE_DONE)       snprintf(resp, sizeof(resp), "{\"ok\":true,\"msg\":\"Conta criada!\"}");
    else if (rc == SQLITE_CONSTRAINT) snprintf(resp, sizeof(resp), "{\"ok\":false,\"msg\":\"E-mail já cadastrado\"}");
    else                              snprintf(resp, sizeof(resp), "{\"ok\":false,\"msg\":\"Erro interno\"}");
    return resp;
}

static const char *rota_login(const char *body) {
    static char resp[256];
    char email[128], senha[128], senha_hash[65];

    if (!json_get(body, "email", email, sizeof(email)) ||
        !json_get(body, "senha", senha, sizeof(senha)))
        return "{\"ok\":false,\"msg\":\"Campos faltando\"}";

    sha256_hex(senha, senha_hash); /* compara hash, nunca a senha em texto */

    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db,
        "SELECT id, nome FROM usuarios WHERE email = ? AND senha = ? LIMIT 1;",
        -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, email,      -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, senha_hash, -1, SQLITE_STATIC);

    if (sqlite3_step(stmt) == SQLITE_ROW) {
        int id = sqlite3_column_int(stmt, 0);
        const unsigned char *nome = sqlite3_column_text(stmt, 1);
        snprintf(resp, sizeof(resp), "{\"ok\":true,\"id\":%d,\"nome\":\"%s\"}", id, nome);
    } else {
        snprintf(resp, sizeof(resp), "{\"ok\":false,\"msg\":\"E-mail ou senha incorretos\"}");
    }
    sqlite3_finalize(stmt);
    return resp;
}

static const char *rota_salvar_sessao(const char *body) {
    char uid_s[32], dur_s[32];
    if (!json_get(body, "usuario_id",  uid_s, sizeof(uid_s)) ||
        !json_get(body, "duracao_seg", dur_s, sizeof(dur_s)))
        return "{\"ok\":false,\"msg\":\"Campos faltando\"}";

    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db,
        "INSERT INTO sessoes (usuario_id, duracao_seg) VALUES (?, ?);",
        -1, &stmt, NULL);
    sqlite3_bind_int(stmt, 1, atoi(uid_s));
    sqlite3_bind_int(stmt, 2, atoi(dur_s));
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return "{\"ok\":true}";
}

static const char *rota_tempo_total(const char *url) {
    static char resp[256];
    const char *p = strstr(url, "usuario_id=");
    if (!p) return "{\"ok\":false,\"msg\":\"usuario_id faltando\"}";

    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db,
        "SELECT COALESCE(SUM(duracao_seg),0), COUNT(*) FROM sessoes WHERE usuario_id = ?;",
        -1, &stmt, NULL);
    sqlite3_bind_int(stmt, 1, atoi(p + 11));

    if (sqlite3_step(stmt) == SQLITE_ROW) {
        int total   = sqlite3_column_int(stmt, 0);
        int sessoes = sqlite3_column_int(stmt, 1);
        snprintf(resp, sizeof(resp),
            "{\"ok\":true,\"total_seg\":%d,\"total_min\":%d,\"sessoes\":%d}",
            total, total / 60, sessoes);
    } else {
        snprintf(resp, sizeof(resp), "{\"ok\":false}");
    }
    sqlite3_finalize(stmt);
    return resp;
}

/* ─── contexto de request ────────────────────────────────── */

struct RequestData { char body[MAX_BODY]; size_t size; };

/* ─── handler principal ──────────────────────────────────── */

static enum MHD_Result handler(
    void *cls, struct MHD_Connection *conn,
    const char *url, const char *method, const char *version,
    const char *upload_data, size_t *upload_data_size, void **con_cls)
{
    (void)cls; (void)version;

    if (strcmp(method, "OPTIONS") == 0) {
        struct MHD_Response *resp = MHD_create_response_from_buffer(0, "", MHD_RESPMEM_PERSISTENT);
        MHD_add_response_header(resp, "Access-Control-Allow-Origin",  "*");
        MHD_add_response_header(resp, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        MHD_add_response_header(resp, "Access-Control-Allow-Headers", "Content-Type");
        enum MHD_Result ret = MHD_queue_response(conn, MHD_HTTP_OK, resp);
        MHD_destroy_response(resp);
        return ret;
    }

    if (*con_cls == NULL) {
        *con_cls = calloc(1, sizeof(struct RequestData));
        return MHD_YES;
    }

    struct RequestData *rd = *con_cls;

    if (*upload_data_size > 0) {
        size_t copy = *upload_data_size;
        if (rd->size + copy < MAX_BODY) {
            memcpy(rd->body + rd->size, upload_data, copy);
            rd->size += copy;
        }
        *upload_data_size = 0;
        return MHD_YES;
    }

    const char *resp_body = "{\"ok\":false,\"msg\":\"Rota não encontrada\"}";
    int status = MHD_HTTP_OK;

    if (strcmp(method, "POST") == 0) {
        if      (strcmp(url, "/cadastro")      == 0) resp_body = rota_cadastro(rd->body);
        else if (strcmp(url, "/login")         == 0) resp_body = rota_login(rd->body);
        else if (strcmp(url, "/salvar_sessao") == 0) resp_body = rota_salvar_sessao(rd->body);
        else status = MHD_HTTP_NOT_FOUND;
    } else if (strcmp(method, "GET") == 0) {
        if (strncmp(url, "/tempo_total", 12) == 0) resp_body = rota_tempo_total(url);
        else status = MHD_HTTP_NOT_FOUND;
    }

    struct MHD_Response *resp = MHD_create_response_from_buffer(
        strlen(resp_body), (void *)resp_body, MHD_RESPMEM_MUST_COPY);
    MHD_add_response_header(resp, "Content-Type",                "application/json");
    MHD_add_response_header(resp, "Access-Control-Allow-Origin", "*");

    enum MHD_Result ret = MHD_queue_response(conn, status, resp);
    MHD_destroy_response(resp);
    free(rd);
    *con_cls = NULL;
    return ret;
}

/* ─── main ───────────────────────────────────────────────── */

int main(void) {
    db_init();

    struct MHD_Daemon *daemon = MHD_start_daemon(
        MHD_USE_THREAD_PER_CONNECTION, PORT, NULL, NULL,
        &handler, NULL, MHD_OPTION_END);

    if (!daemon) { fprintf(stderr, "Falha ao iniciar servidor\n"); return 1; }

    printf("[SERVER] Rodando em http://localhost:%d\n", PORT);
    printf("Pressione ENTER para encerrar...\n");
    getchar();

    MHD_stop_daemon(daemon);
    sqlite3_close(db);
    return 0;
}