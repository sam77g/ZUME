/*
 * server.c — Backend Pomodoro + Groq IA Corrigido
 * Compilar: gcc server.c -o server -lsqlite3 -lmicrohttpd -lpthread -lssl -lcrypto -lcurl
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <microhttpd.h>
#include <sqlite3.h>
#include <openssl/sha.h>
#include <curl/curl.h>

#define GROQ_KEY "Bearer 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"
#define PORT        8080
#define DB_FILE     "pomodoro.db"
#define MAX_BODY    524288

static sqlite3 *db = NULL;

struct RequestData { char body[MAX_BODY]; size_t size; };
struct CurlResponse { char *data; size_t size; };

static size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    struct CurlResponse *mem = (struct CurlResponse *)userp;
    char *ptr = realloc(mem->data, mem->size + realsize + 1);
    if (!ptr) return 0;
    mem->data = ptr;
    memcpy(&(mem->data[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->data[mem->size] = 0;
    return realsize;
}

/* Pega valor dentro do JSON limpando aspas de verdade */
static int json_get_clean(const char *body, const char *key, char *out, size_t out_sz) {
    char pattern[64];
    snprintf(pattern, sizeof(pattern), "\"%s\":", key);
    const char *p = strstr(body, pattern);
    if (!p) return 0;
    p += strlen(pattern);
    while (*p == ' ' || *p == '\t') p++;
    
    if (*p == '"') { // String com aspas
        p++; // pula aspa inicial
        size_t i = 0;
        while (*p && i < out_sz - 1) {
            if (*p == '"' && *(p - 1) != '\\') break; // achou fim da string
            out[i++] = *p++;
        }
        out[i] = '\0';
        return 1;
    } else { // Valor normal (numero ou boleano)
        size_t i = 0;
        while (*p && *p != ',' && *p != '}' && *p != '\n' && *p != '\r' && i < out_sz - 1) {
            out[i++] = *p++;
        }
        out[i] = '\0';
        return 1;
    }
}

void escape_json_string(const char *src, char *dst, size_t max_len) {
    size_t j = 0;
    for (size_t i = 0; src[i] != '\0' && j < max_len - 5; i++) {
        if (src[i] == '"') { dst[j++] = '\\'; dst[j++] = '"'; }
        else if (src[i] == '\\') { dst[j++] = '\\'; dst[j++] = '\\'; }
        else if (src[i] == '\n') { dst[j++] = '\\'; dst[j++] = 'n'; }
        else if (src[i] == '\r') { dst[j++] = '\\'; dst[j++] = 'r'; }
        else if (src[i] == '\t') { dst[j++] = '\\'; dst[j++] = 't'; }
        else { dst[j++] = src[i]; }
    }
    dst[j] = '\0';
}

static void sha256_hex(const char *input, char out[65]) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256((const unsigned char *)input, strlen(input), hash);
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++)
        sprintf(out + i * 2, "%02x", hash[i]);
    out[64] = '\0';
}

void db_init(void) {
    char *err = NULL;
    sqlite3_open(DB_FILE, &db);
    sqlite3_exec(db, "CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, senha TEXT NOT NULL);", NULL, NULL, &err);
    sqlite3_exec(db, "CREATE TABLE IF NOT EXISTS sessoes (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, duracao_seg INTEGER NOT NULL, criado_em TEXT DEFAULT (datetime('now')));", NULL, NULL, &err);
}

/* Rota Groq Inteligente - Atua como Proxy Puro */
static char *rota_groq_ia(const char *body) {
    CURL *curl = curl_easy_init();
    if (!curl) return strdup("{\"ok\":false,\"msg\":\"Erro inicializar cURL no C\"}");

    struct CurlResponse chunk = { .data = malloc(1), .size = 0 };
    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    
    // Configura a sua nova chave limpa sem as chaves {} que vieram no texto
    headers = curl_slist_append(headers, "Authorization: Bearer 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");

    curl_easy_setopt(curl, CURLOPT_URL, "https://api.groq.com/openai/v1/chat/completions");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body); // Passa o body direto, sem mexer em nada!
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);

    if (res != CURLE_OK) {
        if (chunk.data) free(chunk.data);
        return strdup("{\"ok\":false,\"msg\":\"Erro de conexao cURL externa\"}");
    }

    return chunk.data; 
}
static const char *rota_cadastro(const char *body) {
    static char resp[256];
    char nome[128], email[128], senha[128], senha_hash[65];
    if (!json_get_clean(body, "nome", nome, sizeof(nome)) || !json_get_clean(body, "email", email, sizeof(email)) || !json_get_clean(body, "senha", senha, sizeof(senha)))
        return "{\"ok\":false,\"msg\":\"Campos faltando\"}";
    sha256_hex(senha, senha_hash);
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db, "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?);", -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, nome, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, email, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, senha_hash, -1, SQLITE_STATIC);
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    if (rc == SQLITE_DONE) snprintf(resp, sizeof(resp), "{\"ok\":true,\"msg\":\"Conta criada!\"}");
    else snprintf(resp, sizeof(resp), "{\"ok\":false,\"msg\":\"Erro ou email duplicado\"}");
    return resp;
}

static const char *rota_login(const char *body) {
    static char resp[256];
    char email[128], senha[128], senha_hash[65];
    if (!json_get_clean(body, "email", email, sizeof(email)) || !json_get_clean(body, "senha", senha, sizeof(senha)))
        return "{\"ok\":false,\"msg\":\"Campos faltando\"}";
    sha256_hex(senha, senha_hash);
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db, "SELECT id, nome FROM usuarios WHERE email = ? AND senha = ? LIMIT 1;", -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, email, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, senha_hash, -1, SQLITE_STATIC);
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        snprintf(resp, sizeof(resp), "{\"ok\":true,\"id\":%d,\"nome\":\"%s\"}", sqlite3_column_int(stmt, 0), sqlite3_column_text(stmt, 1));
    } else {
        snprintf(resp, sizeof(resp), "{\"ok\":false,\"msg\":\"Incorreto\"}");
    }
    sqlite3_finalize(stmt);
    return resp;
}

static const char *rota_salvar_sessao(const char *body) {
    char uid_s[32], dur_s[32];
    if (!json_get_clean(body, "usuario_id", uid_s, sizeof(uid_s)) || !json_get_clean(body, "duracao_seg", dur_s, sizeof(dur_s))) return "{\"ok\":false}";
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db, "INSERT INTO sessoes (usuario_id, duracao_seg) VALUES (?, ?);", -1, &stmt, NULL);
    sqlite3_bind_int(stmt, 1, atoi(uid_s));
    sqlite3_bind_int(stmt, 2, atoi(dur_s));
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return "{\"ok\":true}";
}

static const char *rota_tempo_total(const char *url) {
    static char resp[256];
    const char *p = strstr(url, "usuario_id=");
    if (!p) return "{\"ok\":false}";
    sqlite3_stmt *stmt;
    sqlite3_prepare_v2(db, "SELECT COALESCE(SUM(duracao_seg),0), COUNT(*) FROM sessoes WHERE usuario_id = ?;", -1, &stmt, NULL);
    sqlite3_bind_int(stmt, 1, atoi(p + 11));
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        int total = sqlite3_column_int(stmt, 0);
        snprintf(resp, sizeof(resp), "{\"ok\":true,\"total_seg\":%d,\"total_min\":%d,\"sessoes\":%d}", total, total / 60, sqlite3_column_int(stmt, 1));
    } else { snprintf(resp, sizeof(resp), "{\"ok\":false}"); }
    sqlite3_finalize(stmt);
    return resp;
}

static enum MHD_Result handler(
    void *cls, struct MHD_Connection *conn,
    const char *url, const char *method, const char *version,
    const char *upload_data, size_t *upload_data_size, void **con_cls)
{
    (void)cls; (void)version;
    if (strcmp(method, "OPTIONS") == 0) {
        struct MHD_Response *resp = MHD_create_response_from_buffer(0, "", MHD_RESPMEM_PERSISTENT);
        MHD_add_response_header(resp, "Access-Control-Allow-Origin", "*");
        MHD_add_response_header(resp, "Access-Control-Allow-Methods", "POST, GET, OPTIONS");
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

    const char *resp_body = "{\"ok\":false,\"msg\":\"Erro\"}";
    char *dinamico = NULL;
    int status = MHD_HTTP_OK;

    if (strcmp(method, "POST") == 0) {
        if (strcmp(url, "/cadastro") == 0) resp_body = rota_cadastro(rd->body);
        else if (strcmp(url, "/login") == 0) resp_body = rota_login(rd->body);
        else if (strcmp(url, "/salvar_sessao") == 0) resp_body = rota_salvar_sessao(rd->body);
        else if (strcmp(url, "/ia") == 0) { dinamico = rota_groq_ia(rd->body); resp_body = dinamico; }
        else status = MHD_HTTP_NOT_FOUND;
    } else if (strcmp(method, "GET") == 0) {
        if (strncmp(url, "/tempo_total", 12) == 0) resp_body = rota_tempo_total(url);
        else status = MHD_HTTP_NOT_FOUND;
    }

    struct MHD_Response *resp = MHD_create_response_from_buffer(strlen(resp_body), (void *)resp_body, MHD_RESPMEM_MUST_COPY);
    MHD_add_response_header(resp, "Content-Type", "application/json");
    MHD_add_response_header(resp, "Access-Control-Allow-Origin", "*");
    enum MHD_Result ret = MHD_queue_response(conn, status, resp);
    MHD_destroy_response(resp);
    if (dinamico) free(dinamico);
    free(rd);
    *con_cls = NULL;
    return ret;
}

int main(void) {
    db_init();
    struct MHD_Daemon *daemon = MHD_start_daemon(MHD_USE_THREAD_PER_CONNECTION, PORT, NULL, NULL, &handler, NULL, MHD_OPTION_END);
    if (!daemon) return 1;
    printf("[SERVER] Servidor rodando na porta %d\n", PORT);
    getchar();
    MHD_stop_daemon(daemon);
    sqlite3_close(db);
    return 0;
}