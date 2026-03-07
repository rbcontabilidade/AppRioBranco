"""
Script para aplicar indices de performance no Supabase via API REST.
Usa a funcao exec_sql criada manualmente no SQL Editor do Supabase.
"""
import os
import sys
import httpx
from dotenv import load_dotenv

# Carrega variaveis de ambiente
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY", "")).strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERRO: SUPABASE_URL ou SUPABASE_KEY nao encontradas no .env")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Indices a criar
INDICES = [
    (
        "idx_exec_resp_funcionario",
        "CREATE INDEX IF NOT EXISTS idx_exec_resp_funcionario ON rh_execucao_tarefas_responsaveis(funcionario_id)"
    ),
    (
        "idx_exec_competencia",
        "CREATE INDEX IF NOT EXISTS idx_exec_competencia ON rh_execucao_processos(competencia_id)"
    ),
    (
        "idx_tarefas_processo",
        "CREATE INDEX IF NOT EXISTS idx_tarefas_processo ON rh_tarefas(processo_id)"
    ),
    (
        "idx_exec_tarefas_processo_join",
        "CREATE INDEX IF NOT EXISTS idx_exec_tarefas_processo_join ON rh_execucao_tarefas(execucao_processo_id)"
    ),
]

# Verificacao via pg_indexes
SQL_VERIFICAR = (
    "SELECT indexname, tablename FROM pg_indexes "
    "WHERE indexname IN ("
    "'idx_exec_resp_funcionario',"
    "'idx_exec_competencia',"
    "'idx_tarefas_processo',"
    "'idx_exec_tarefas_processo_join'"
    ") ORDER BY tablename"
)

# Consultas EXPLAIN
EXPLAINS = [
    ("Filtro por competencia",
     "EXPLAIN SELECT * FROM rh_execucao_processos WHERE competencia_id = 1"),
    ("Filtro por funcionario",
     "EXPLAIN SELECT * FROM rh_execucao_tarefas_responsaveis WHERE funcionario_id = 1"),
    ("Filtro por processo",
     "EXPLAIN SELECT * FROM rh_tarefas WHERE processo_id = 1"),
]


def chamar_exec_sql(sql):
    """Chama a funcao exec_sql no Supabase via RPC."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    try:
        resp = httpx.post(url, json={"query": sql}, headers=HEADERS, timeout=30)
        return resp.status_code, resp.json() if resp.text else None
    except Exception as e:
        return -1, str(e)


def chamar_exec_sql_retorna_dados(sql):
    """Chama exec_sql para queries que retornam dados."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql_result"
    try:
        resp = httpx.post(url, json={"query": sql}, headers=HEADERS, timeout=30)
        return resp.status_code, resp.json() if resp.text else None
    except Exception as e:
        return -1, str(e)


def verificar_exec_sql_existe():
    """Verifica se a funcao exec_sql existe no banco."""
    status, resp = chamar_exec_sql("SELECT 1")
    return status in (200, 204)


def main():
    print("\nMIGRACOES DE PERFORMANCE - FiscalApp")
    print("Aplicando indices para eliminar Full Table Scans")
    print("=" * 55)

    # Passo 1: Valida se exec_sql existe
    print("\nVerificando funcao exec_sql no banco...")
    if not verificar_exec_sql_existe():
        print("\n[ATENCAO] A funcao exec_sql nao existe no banco ainda.")
        print("\nExecute o SQL abaixo no SQL Editor do Supabase:")
        print("-" * 55)
        print("""CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE query;
END;
$$;""")
        print("-" * 55)
        print("\nApas criar a funcao, rode novamente: venv\\Scripts\\python.exe apply_indexes.py")
        sys.exit(0)

    print("[OK] Funcao exec_sql encontrada no banco.\n")

    # Passo 2: Aplica os indices
    print("=" * 55)
    print("CRIANDO INDICES DE PERFORMANCE")
    print("=" * 55)

    erros = 0
    for nome, sql in INDICES:
        status, resp = chamar_exec_sql(sql)
        if status in (200, 204):
            print(f"  [OK]  {nome}")
        else:
            print(f"  [ERR] {nome}: status={status} resp={resp}")
            erros += 1

    if erros == 0:
        print("\nTodos os indices foram criados com sucesso!")
    else:
        print(f"\n{erros} erro(s) ao criar indices. Verifique acima.")

    # Passo 3: Verificacao no pg_indexes
    print("\n" + "=" * 55)
    print("VERIFICACAO: INDICES NO BANCO (pg_indexes)")
    print("=" * 55)

    # Para SELECT, usamos a tabela pg_indexes diretamente via API REST do Supabase
    url_pgidx = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    # Como exec_sql retorna VOID, precisamos de uma funcao diferente para SELECT
    # Alternativa: chamar direto via endpoint de tabela
    try:
        url_schema = f"{SUPABASE_URL}/rest/v1/"
        # Tenta via exec_sql mas como void nao retorna dados
        # Usa select na view pg_indexes que o Supabase expoe
        url_pg = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql_select"
        resp_check = httpx.post(
            url_pg,
            json={"query": SQL_VERIFICAR},
            headers=HEADERS,
            timeout=15
        )

        if resp_check.status_code == 200:
            dados = resp_check.json()
            for row in dados:
                print(f"  [OK]  {row.get('tablename')}.{row.get('indexname')}")
            print(f"\n  Total: {len(dados)}/4 indices encontrados.")
        else:
            # exec_sql_select pode nao existir, tenta exec_sql_query
            print(f"  Verificacao automatica indisponivel (exec_sql_select nao existe).")
            print(f"  Para confirmar, execute no SQL Editor do Supabase:")
            print(f"  SELECT indexname, tablename FROM pg_indexes")
            print(f"  WHERE indexname LIKE 'idx_exec%' OR indexname LIKE 'idx_tarefas%';")
    except Exception as e:
        print(f"  Erro ao verificar: {e}")

    # Passo 4: EXPLAIN via exec_sql (DDL apenas, sem retorno)
    print("\n" + "=" * 55)
    print("PLANOS DE EXECUCAO (EXPLAIN)")
    print("Para confirmar o uso dos indices, execute no SQL Editor:")
    print("=" * 55)
    for descricao, sql in EXPLAINS:
        print(f"\n  {descricao}:")
        print(f"    {sql};")

    print("\n" + "=" * 55)
    if erros == 0:
        print("MIGRACAO CONCLUIDA!")
        print("Indices aplicados. Execute os EXPLAIN acima no Supabase para confirmar.")
    else:
        print("ATENCAO: Alguns indices falharam. Verifique os erros acima.")
    print("=" * 55)


if __name__ == "__main__":
    main()
