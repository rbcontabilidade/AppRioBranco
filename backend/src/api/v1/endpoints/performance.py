from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from src.core.database import supabase, supabase_admin
from src.api.v1.endpoints.auth import get_current_user_from_cookie
from datetime import datetime, date, timedelta
import calendar

router = APIRouter(prefix="/api/performance", tags=["Performance"])

# ─────────────────────────────────────────────────────────────────────────────
# Utilitários internos
# ─────────────────────────────────────────────────────────────────────────────

def _nome_mes(mes: int) -> str:
    """Retorna abreviação do mês em português."""
    nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
             "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    return nomes[mes - 1] if 1 <= mes <= 12 else str(mes)


def _calcular_score(taxa_pontualidade: float, total_concluidas: int, total_participacoes: int) -> dict:
    """
    Calcula o score de desempenho de 0 a 100 com base em três pilares:
    - Pontualidade: 60% do score
    - Volume de entregas: 25% do score
    - Participação em processos: 15% do score
    """
    # Pilar 1: Pontualidade (0-100%)
    pilar_pontualidade = (taxa_pontualidade / 100) * 60

    # Pilar 2: Volume de entregas — satura em 20 tarefas (score máximo)
    pilar_volume = min(total_concluidas / 20, 1.0) * 25

    # Pilar 3: Participação em processos — satura em 10 processos
    pilar_participacao = min(total_participacoes / 10, 1.0) * 15

    score = round(pilar_pontualidade + pilar_volume + pilar_participacao, 1)

    # Classificação semântica do score
    if score >= 90:
        classificacao = "Excepcional"
        cor = "#10b981"   # Verde
        icone = "🏆"
    elif score >= 75:
        classificacao = "Excelente"
        cor = "#6366f1"   # Roxo
        icone = "⭐"
    elif score >= 60:
        classificacao = "Bom"
        cor = "#3b82f6"   # Azul
        icone = "👍"
    elif score >= 40:
        classificacao = "Regular"
        cor = "#f59e0b"   # Amarelo
        icone = "⚠️"
    else:
        classificacao = "Insuficiente"
        cor = "#ef4444"   # Vermelho
        icone = "📉"

    return {
        "valor": score,
        "classificacao": classificacao,
        "cor": cor,
        "icone": icone
    }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint principal — /api/performance/me
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me")
async def get_my_performance(user_info: tuple = Depends(get_current_user_from_cookie)):
    """
    Retorna o relatório completo de desempenho do funcionário logado.
    Inclui: Visão Geral, Produtividade, Eficiência, Prazos, Distribuição, Histórico, Tendência e Insights.
    """
    try:
        user_id, payload = user_info
        hoje = date.today()
        agora = datetime.now()

        # ── 1. Dados do funcionário logado ──────────────────────────────────
        res_func = supabase.table("funcionarios").select(
            "id, nome, cargo_id, permissao"
        ).eq("id", user_id).execute()

        funcionario = res_func.data[0] if res_func.data else {}
        nome_funcionario = funcionario.get("nome", "Funcionário")
        cargo = funcionario.get("permissao", "Colaborador")

        # ── 2. Competência aberta (período atual) ────────────────────────────
        res_comp = supabase.table("rh_competencias").select(
            "id, mes, ano, status"
        ).eq("status", "ABERTA").order("id", desc=True).limit(1).execute()

        competencia = res_comp.data[0] if res_comp.data else None
        comp_id = competencia["id"] if competencia else None

        periodo_label = "Sem competência aberta"
        if competencia:
            try:
                mes_num = int(competencia.get("mes", hoje.month))
                ano_num = competencia.get("ano", hoje.year)
                mes_nome = _nome_mes(mes_num)
                periodo_label = f"{mes_nome}/{ano_num}"
            except Exception:
                periodo_label = "Erro ao ler competência"

        # ── 3. Todas as tarefas do funcionário ───────────────────────────────
        # Buscamos as tarefas vinculadas
        try:
            user_id = int(str(user_id))
        except:
            pass
            
        res_vinc = supabase.table("rh_execucao_tarefas_responsaveis") \
            .select("execucao_tarefa_id") \
            .eq("funcionario_id", user_id) \
            .execute()

        print(f"[Performance Debug] Resposta Supabase: {res_vinc.data}")
        ids_tarefas = [r["execucao_tarefa_id"] for r in (res_vinc.data or [])]
        print(f"[Performance Debug] User ID: {user_id} ({type(user_id)}), Tarefas encontradas: {len(ids_tarefas)}")

        if not ids_tarefas:
            print(f"[Performance Debug] Retornando resposta vazia para {nome_funcionario}")
            return _resposta_vazia(nome_funcionario, cargo, periodo_label)

        # Buscar detalhes com joins
        res_tarefas = supabase.table("rh_execucao_tarefas").select(
            "id, status, execucao_processo_id, tarefa_id, iniciado_em, concluido_em, "
            "rh_execucao_processos(id, competencia_id, cliente_id, status, "
            "  clientes(razao_social), "
            "  rh_processos(nome), "
            "  rh_competencias(mes, ano)"
            "), "
            "rh_tarefas(titulo, ordem, dias_prazo)"
        ).in_("id", ids_tarefas).execute()

        todas_tarefas_raw = res_tarefas.data or []
        
        # Filtrar as tarefas para deixar apenas as da competência ativa atual
        if comp_id:
            todas_tarefas = [
                t for t in todas_tarefas_raw
                if (t.get("rh_execucao_processos") or {}).get("competencia_id") == comp_id
            ]
        else:
            todas_tarefas = todas_tarefas_raw
        # ── 4. Cálculos de Visão Geral (KPIs) ────────────────────────────────
        concluidas = [t for t in todas_tarefas if t["status"] == "CONCLUIDA"]
        em_andamento = [t for t in todas_tarefas if t["status"] == "EM ANDAMENTO"]
        pendentes = [t for t in todas_tarefas if t["status"] not in ["CONCLUIDA", "EM ANDAMENTO"]]
        
        atrasadas = []
        no_prazo_count = 0
        atrasadas_count = 0

        for t in todas_tarefas:
            t_root = t.get("rh_tarefas") or {}
            exec_p = t.get("rh_execucao_processos") or {}
            comp_ref = exec_p.get("rh_competencias") or {}
            
            dias_prazo = t_root.get("dias_prazo") or 28
            try:
                mes_c = int(comp_ref.get("mes", hoje.month))
                ano_c = int(comp_ref.get("ano", hoje.year))
                d_prazo = int(min(dias_prazo, 28))
                dt_limite = date(ano_c, mes_c, d_prazo)
            except Exception:
                # Fallback seguro para data de limite
                dt_limite = date(hoje.year, hoje.month, 28)

            status = t["status"]
            concl_em = t.get("concluido_em")
            
            is_atrasada = False
            if status == "CONCLUIDA" and concl_em:
                dt_concl = datetime.fromisoformat(concl_em.split('T')[0]).date()
                if dt_concl > dt_limite:
                    atrasadas_count += 1
                    is_atrasada = True
                else:
                    no_prazo_count += 1
            elif status != "CONCLUIDA" and hoje > dt_limite:
                atrasadas_count += 1
                atrasadas.append(t)
                is_atrasada = True
            
            t["_is_atrasada"] = is_atrasada
            t["_dt_limite"] = dt_limite

        total_tarefas = len(todas_tarefas)
        taxa_conclusao = round(float(len(concluidas) / total_tarefas * 100), 1) if total_tarefas > 0 else 0.0
        taxa_atraso = round(float(atrasadas_count / total_tarefas * 100), 1) if total_tarefas > 0 else 0.0
        on_time_rate = round(float(no_prazo_count / len(concluidas) * 100), 1) if concluidas else 0.0

        # ── 5. Produtividade (Hoje, Semana, Mês) ─────────────────────────────
        inicio_semana = hoje - timedelta(days=hoje.weekday())
        inicio_mes = date(hoje.year, hoje.month, 1)

        concluidas_hoje = 0
        concluidas_semana = 0
        concluidas_mes = 0

        for t in concluidas:
            concl_em = t.get("concluido_em")
            if not concl_em: continue
            dt_c = datetime.fromisoformat(concl_em.split('T')[0]).date()
            if dt_c == hoje: concluidas_hoje += 1
            if dt_c >= inicio_semana: concluidas_semana += 1
            if dt_c >= inicio_mes: concluidas_mes += 1

        dias_trabalhados = max((hoje - inicio_mes).days, 1)
        avg_per_day = round(concluidas_mes / dias_trabalhados, 1)

        # ── 6. Eficiência ───────────────────────────────────────────────────
        tempos = []
        for t in concluidas:
            ini = t.get("iniciado_em")
            fim = t.get("concluido_em")
            if ini and fim:
                d_ini = datetime.fromisoformat(ini.replace("Z", "+00:00"))
                d_fim = datetime.fromisoformat(fim.replace("Z", "+00:00"))
                diff = (d_fim - d_ini).total_seconds() / 3600 # horas
                tempos.append(diff)
        
        avg_time = round(sum(tempos) / len(tempos), 1) if tempos else 0

        # ── 7. Distribuição por Estágio/Categoria ────────────────────────────
        dist_map = {}
        for t in todas_tarefas:
            # Sem categorias no DB por enquanto, usando o nome do processo como agrupador
            processo = (t.get("rh_execucao_processos") or {}).get("rh_processos") or {}
            nome_grp = processo.get("nome", "Geral")
            dist_map[nome_grp] = dist_map.get(nome_grp, 0) + 1
        
        distribuicao = [{"name": k, "value": v} for k, v in dist_map.items()]

        # ── 8. Histórico de Atividades (Últimas 20) ─────────────────────────
        atividades = []
        for t in todas_tarefas:
            t_root = t.get("rh_tarefas") or {}
            titulo_tarefa = t_root.get("titulo", "Tarefa")
            
            if t.get("concluido_em"):
                atividades.append({
                    "tipo": "CONCLUIDA",
                    "descricao": f"Concluiu a tarefa: {titulo_tarefa}",
                    "data": t["concluido_em"],
                    "timestamp": t["concluido_em"],
                    "msg": f"Concluiu a tarefa: {titulo_tarefa}"
                })
            if t.get("iniciado_em"):
                atividades.append({
                    "tipo": "INICIADA",
                    "descricao": f"Iniciou a tarefa: {titulo_tarefa}",
                    "data": t["iniciado_em"],
                    "timestamp": t["iniciado_em"],
                    "msg": f"Iniciou a tarefa: {titulo_tarefa}"
                })
        
        atividades.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
        atividades = atividades[:20]

        # ── 9. Tendência de Produtividade (Últimos 30 dias) ─────────────────
        tendencia = []
        for i in range(29, -1, -1):
            d = hoje - timedelta(days=i)
            c_dia = sum(1 for t in concluidas if t.get("concluido_em") and datetime.fromisoformat(t["concluido_em"].split('T')[0]).date() == d)
            tendencia.append({"data": d.strftime("%d/%m"), "concluidas": c_dia})

        # ── 10. Metas e Insights ────────────────────────────────────────────
        target_mes = 30 # Mock meta
        progress_mes = round(min(concluidas_mes / target_mes, 1.0) * 100, 0)
        
        insights = []
        if on_time_rate >= 90:
            insights.append({"tipo": "SUCCESS", "msg": "Excepcional pontualidade! Continue assim."})
        elif on_time_rate < 70:
            insights.append({"tipo": "WARNING", "msg": "Sua taxa de pontualidade caiu. Tente focar nas tarefas prioritárias."})
            
        if concluidas_semana > 10:
            insights.append({"tipo": "SUCCESS", "msg": "Semana muito produtiva! Você superou a média."})
            
        if len(atrasadas) > 3:
            insights.append({"tipo": "DANGER", "msg": f"Você tem {len(atrasadas)} tarefas em atraso. Melhore seu fluxo."})

        # ── 11. Lista unificada de tarefas (para compatibilidade e UI) ────
        tarefas_ativas = [t for t in todas_tarefas if t["status"] != "CONCLUIDA"]
        tarefas_ativas.sort(key=lambda x: (0 if x.get("_is_atrasada") else 1, (x.get("rh_tarefas") or {}).get("ordem", 99)))
        
        tarefas_concluidas_recentes = sorted(concluidas, key=lambda x: x.get("concluido_em") or "", reverse=True)[:10]
        
        todas_lista = []
        for t in (tarefas_ativas + tarefas_concluidas_recentes):
            t_root = t.get("rh_tarefas") or {}
            exec_p = t.get("rh_execucao_processos") or {}
            cliente = exec_p.get("clientes") or {}
            processo = exec_p.get("rh_processos") or {}
            
            todas_lista.append({
                "id": t["id"],
                "titulo": t_root.get("titulo", "—"),
                "processo": processo.get("nome", "—"),
                "cliente": cliente.get("razao_social", "—"),
                "status": "Atrasada" if t["_is_atrasada"] and t["status"] != "CONCLUIDA" else t["status"].capitalize(),
                "prazo": t["_dt_limite"].strftime("%d/%m/%Y"),
                "atrasada": t["_is_atrasada"],
                "ordem": t_root.get("ordem", 99),
            })

        # ── 12. Resultado ───────────────────────────────────────────────────
        processos_participados = len(set(t.get("execucao_processo_id") for t in todas_tarefas))
        return {
            "funcionario": {"nome": nome_funcionario, "cargo": cargo},
            "competencia": {"id": comp_id, "label": periodo_label},
            "kpis": {
                "total": total_tarefas,
                "concluidas": len(concluidas),
                "em_andamento": len(em_andamento),
                "pendentes": len(pendentes),
                "atrasadas_count": atrasadas_count,
                "taxa_conclusao": taxa_conclusao,
                "taxa_atraso": taxa_atraso,
                "on_time_rate": on_time_rate
            },
            "produtividade": {
                "hoje": concluidas_hoje,
                "semana": concluidas_semana,
                "mes": concluidas_mes,
                "avg_dia": avg_per_day
            },
            "eficiencia": {
                "avg_time_hours": avg_time
            },
            "distribuicao": distribuicao,
            "historico": atividades,
            "tendencia": tendencia,
            "metas": {
                "mensal_target": target_mes,
                "mensal_atual": concluidas_mes,
                "percentual": progress_mes
            },
            "insights": insights,
            "score": _calcular_score(on_time_rate, len(concluidas), processos_participados),
            "tarefas": todas_lista
        }

    except Exception as e:
        print(f"[Performance] Erro: {e}")
        import traceback; traceback.print_exc()
        return _resposta_vazia("Funcionário", "Colaborador", "Erro ao carregar")


def _resposta_vazia(nome: str, cargo: str, periodo: str) -> dict:
    """Estrutura de resposta padrão para quando não há dados."""
    return {
        "funcionario": {"nome": nome, "cargo": cargo},
        "competencia": {"id": None, "label": periodo},
        "kpis": {
            "total": 0,
            "concluidas": 0,
            "em_andamento": 0,
            "pendentes": 0,
            "atrasadas_count": 0,
            "taxa_conclusao": 0.0,
            "taxa_atraso": 0.0,
            "on_time_rate": 0.0
        },
        "produtividade": {"hoje": 0, "semana": 0, "mes": 0, "avg_dia": 0.0},
        "eficiencia": {"avg_time_hours": 0.0},
        "distribuicao": [],
        "historico": [],
        "tendencia": [],
        "metas": {"mensal_target": 30, "mensal_atual": 0, "percentual": 0},
        "insights": [{"tipo": "INFO", "msg": "Sem dados de performance no momento."}],
        "score": {"valor": 0, "classificacao": "Sem dados", "cor": "#94a3b8", "icone": "—"},
        "tarefas": []
    }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints de suporte (mantidos para compatibilidade retroativa)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin-stats")
async def get_admin_stats(competencia_id: Optional[int] = Query(None), funcionario_id: Optional[int] = Query(None)):
    """Busca estatísticas globais para o AdminDashboard.jsx"""
    try:
        # 1. Clientes Ativos
        res_clients = supabase.table("clientes").select("count", count="exact").eq("ativo", True).execute()
        active_clients = res_clients.count or 0

        # 2. Processos (Execuções)
        query_exec = supabase.table("rh_execucao_processos").select("status", count="exact")
        if competencia_id:
            query_exec = query_exec.eq("competencia_id", competencia_id)

        res_exec = query_exec.execute()
        total_execs = res_exec.count or 0
        pending_processes = len([e for e in (res_exec.data or []) if e["status"] != "CONCLUIDO"])

        # 3. Eficiência (Tarefas)
        query_tasks = supabase.table("rh_execucao_tarefas").select("status")
        if funcionario_id:
            res_resp = supabase.table("rh_execucao_tarefas_responsaveis").select("execucao_tarefa_id").eq("funcionario_id", funcionario_id).execute()
            task_ids = [r["execucao_tarefa_id"] for r in (res_resp.data or [])]
            query_tasks = query_tasks.in_("id", task_ids)

        res_tasks = query_tasks.execute()
        tasks_data = res_tasks.data or []
        completed = len([t for t in tasks_data if t["status"] == "CONCLUIDO"])
        total_tasks = len(tasks_data)
        efficiency = round((completed / total_tasks * 100), 1) if total_tasks > 0 else 100

        return {
            "kpis": {
                "total_revenue": "R$ 0,00",
                "active_clients": active_clients,
                "pending_processes": pending_processes,
                "team_efficiency": efficiency
            },
            "chart_data": [
                {"name": "Jan", "completed": 10}, {"name": "Fev", "completed": 20}
            ],
            "recent_logs": []
        }
    except Exception as e:
        print(f"Erro ao calcular stats admin: {e}")
        return {"kpis": {}, "chart_data": [], "recent_logs": []}


@router.get("/dashboard-kpis")
async def get_dashboard_kpis(funcionario_id: Optional[int] = Query(None), competencia_id: Optional[int] = Query(None), global_view: bool = False):
    """Busca KPIs resumidos para o Dashboard.jsx do funcionário"""
    try:
        query = supabase.table("rh_execucao_tarefas").select("id, status, execucao_processo_id")
        res = query.execute()
        all_tasks = res.data or []

        if funcionario_id and not global_view:
            res_resp = supabase.table("rh_execucao_tarefas_responsaveis").select("execucao_tarefa_id").eq("funcionario_id", funcionario_id).execute()
            task_ids_involved = [r["execucao_tarefa_id"] for r in (res_resp.data or [])]
            involved_process_ids = set(t["execucao_processo_id"] for t in all_tasks if t["id"] in task_ids_involved)
            data = [t for t in all_tasks if t["execucao_processo_id"] in involved_process_ids]
        else:
            data = all_tasks

        if competencia_id:
            res_proc = supabase.table("rh_execucao_processos").select("id").eq("competencia_id", competencia_id).execute()
            valid_proc_ids = [p["id"] for p in (res_proc.data or [])]
            data = [t for t in data if t.get("execucao_processo_id") in valid_proc_ids]

        return {
            "total": len(data),
            "concluidos": len([t for t in data if t["status"] in ["CONCLUIDO", "CONCLUIDA"]]),
            "pendentes": len([t for t in data if t["status"] == "PENDENTE"]),
            "atrasados": 0
        }
    except Exception as e:
        return {"total": 0, "concluidos": 0, "pendentes": 0, "atrasados": 0}


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint do Painel Executivo — /api/performance/executive-dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/executive-dashboard")
async def get_executive_dashboard(
    competencia_id: Optional[int] = Query(None),
    funcionario_id: Optional[int] = Query(None),
    user_info: tuple = Depends(get_current_user_from_cookie)
):
    """
    Retorna todos os dados necessários para o Painel Executivo em uma única chamada.
    Apenas administradores devem ter acesso a este endpoint.
    """
    try:
        hoje = date.today()
        client = supabase_admin if supabase_admin else supabase

        # ── 1. Descobrir competência ativa (se não passada) ──────────────────
        if not competencia_id:
            res_comp = client.table("rh_competencias").select("id, mes, ano, status") \
                .eq("status", "ABERTA").order("id", desc=True).limit(1).execute()
            comp_data = res_comp.data[0] if res_comp.data else None
            competencia_id = comp_data["id"] if comp_data else None
            comp_label = f"{str(comp_data['mes']).zfill(2)}/{comp_data['ano']}" if comp_data else "Sem competência"
        else:
            res_comp = client.table("rh_competencias").select("id, mes, ano, status") \
                .eq("id", competencia_id).limit(1).execute()
            comp_data = res_comp.data[0] if res_comp.data else None
            comp_label = f"{str(comp_data['mes']).zfill(2)}/{comp_data['ano']}" if comp_data else f"Comp #{competencia_id}"

        # ── 2. Buscar todas as execuções de processo da competência ──────────
        query_proc = client.table("rh_execucao_processos").select(
            "id, status, competencia_id, cliente_id, processo_id, "
            "clientes(razao_social), rh_processos(nome)"
        )
        if competencia_id:
            query_proc = query_proc.eq("competencia_id", competencia_id)
        res_proc = query_proc.execute()
        todos_processos = res_proc.data or []

        # ── 3. Buscar todas as tarefas da competência com join ───────────────
        proc_ids = [p["id"] for p in todos_processos]

        todos_tarefas = []
        if proc_ids:
            res_tarefas = client.table("rh_execucao_tarefas").select(
                "id, status, execucao_processo_id, tarefa_id, "
                "rh_tarefas(titulo, ordem, dias_prazo), "
                "rh_execucao_tarefas_responsaveis(funcionario_id, "
                "  funcionarios(nome))"
            ).in_("execucao_processo_id", proc_ids).execute()
            todos_tarefas = res_tarefas.data or []

        # ── Filtrar por funcionário se solicitado ────────────────────────────
        if funcionario_id:
            todos_tarefas = [
                t for t in todos_tarefas
                if any(
                    r.get("funcionario_id") == funcionario_id
                    for r in (t.get("rh_execucao_tarefas_responsaveis") or [])
                )
            ]
            # Filtrar processos que têm pelo menos uma tarefa do funcionário
            proc_ids_filtrados = set(t["execucao_processo_id"] for t in todos_tarefas)
            todos_processos = [p for p in todos_processos if p["id"] in proc_ids_filtrados]

        # ── 4. Buscar funcionários ativos ────────────────────────────────────
        res_funcs = client.table("funcionarios").select(
            "id, nome, cargo_id, ativo"
        ).eq("ativo", True).execute()
        todos_funcionarios = res_funcs.data or []
        func_map = {f["id"]: f["nome"] for f in todos_funcionarios}

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 1: KPIs Globais
        # ─────────────────────────────────────────────────────────────────────

        total_processos = len(todos_processos)
        processos_concluidos = sum(1 for p in todos_processos if p["status"] in ["CONCLUIDO", "CONCLUÍDA", "CONCLUIDA"])
        processos_em_andamento = sum(1 for p in todos_processos if p["status"] in ["EM ANDAMENTO", "ABERTO", "PENDENTE"])

        total_tarefas = len(todos_tarefas)
        tarefas_concluidas = sum(1 for t in todos_tarefas if t["status"] == "CONCLUIDA")
        tarefas_pendentes = sum(1 for t in todos_tarefas if t["status"] == "PENDENTE")
        tarefas_em_andamento = sum(1 for t in todos_tarefas if t["status"] == "EM ANDAMENTO")

        # Tarefas atrasadas: verificar dias_prazo vs hoje (usando mês da competência)
        mes_comp = comp_data.get("mes", hoje.month) if comp_data else hoje.month
        ano_comp = comp_data.get("ano", hoje.year) if comp_data else hoje.year

        def _is_atrasada(tarefa: dict) -> bool:
            if tarefa.get("status") == "CONCLUIDA":
                return False
            tarefa_base = tarefa.get("rh_tarefas") or {}
            dias_prazo = tarefa_base.get("dias_prazo") or 0
            if not dias_prazo:
                return False
            try:
                data_limite = date(ano_comp, mes_comp, min(int(dias_prazo), 28))
                return hoje > data_limite
            except Exception:
                return False

        tarefas_atrasadas = sum(1 for t in todos_tarefas if _is_atrasada(t))

        # Taxa de pontualidade: concluídas / total
        taxa_pontualidade = round((tarefas_concluidas / total_tarefas * 100), 1) if total_tarefas > 0 else 0.0

        # Processos em risco: tem pelo menos 1 tarefa atrasada e não está concluído
        proc_com_atraso = set()
        for t in todos_tarefas:
            if _is_atrasada(t):
                proc_com_atraso.add(t.get("execucao_processo_id"))
        processos_em_risco = len([
            p for p in todos_processos
            if p["id"] in proc_com_atraso and p["status"] not in ["CONCLUIDO", "CONCLUÍDA", "CONCLUIDA"]
        ])

        kpis_globais = {
            "total_processos": total_processos,
            "processos_concluidos": processos_concluidos,
            "processos_em_andamento": processos_em_andamento,
            "processos_em_risco": processos_em_risco,
            "total_tarefas": total_tarefas,
            "tarefas_concluidas": tarefas_concluidas,
            "tarefas_atrasadas": tarefas_atrasadas,
            "taxa_pontualidade": taxa_pontualidade,
            "competencia_label": comp_label,
        }

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 2: Pipeline de Processos (por estágio/status)
        # ─────────────────────────────────────────────────────────────────────

        pipeline_contagem = {}
        for p in todos_processos:
            st = p.get("status", "DESCONHECIDO")
            pipeline_contagem[st] = pipeline_contagem.get(st, 0) + 1

        # Normaliza para ordem lógica do funil
        pipeline = [
            {"label": "Pendentes",    "status": "PENDENTE",      "count": pipeline_contagem.get("PENDENTE", 0),      "color": "#3b82f6"},
            {"label": "Em Andamento", "status": "EM ANDAMENTO",  "count": pipeline_contagem.get("EM ANDAMENTO", 0),  "color": "#f59e0b"},
            {"label": "Abertos",      "status": "ABERTO",        "count": pipeline_contagem.get("ABERTO", 0),        "color": "#8b5cf6"},
            {"label": "Atrasados",    "status": "ATRASADO",      "count": len([p for p in todos_processos if p["id"] in proc_com_atraso and p["status"] not in ["CONCLUIDO", "CONCLUÍDA", "CONCLUIDA"]]), "color": "#ef4444"},
            {"label": "Concluídos",   "status": "CONCLUIDO",     "count": processos_concluidos,                       "color": "#10b981"},
        ]

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 3: Gargalos — Top 10 processos mais atrasados
        # ─────────────────────────────────────────────────────────────────────

        # Contar tarefas atrasadas por processo
        atrasos_por_proc: dict[int, list] = {}
        for t in todos_tarefas:
            if _is_atrasada(t):
                pid = t["execucao_processo_id"]
                atrasos_por_proc.setdefault(pid, []).append(t)

        gargalos = []
        proc_map = {p["id"]: p for p in todos_processos}
        for pid, tarefas_atrs in sorted(atrasos_por_proc.items(), key=lambda x: -len(x[1]))[:10]:
            proc = proc_map.get(pid, {})
            cliente_info = proc.get("clientes") or {}
            processo_info = proc.get("rh_processos") or {}
            gargalos.append({
                "processo_id": pid,
                "processo_nome": processo_info.get("nome", "—"),
                "cliente_nome": cliente_info.get("razao_social", "—"),
                "tarefas_atrasadas": len(tarefas_atrs),
                "status": proc.get("status", "—"),
            })

        # Dias sem atualização (processos parados)
        processos_parados = []
        for p in todos_processos:
            if p.get("status") in ["CONCLUIDO", "CONCLUÍDA", "CONCLUIDA"]:
                continue
            updated_raw = p.get("updated_at") or p.get("created_at")
            if updated_raw:
                try:
                    if "T" in str(updated_raw):
                        dt_update = datetime.fromisoformat(str(updated_raw).replace("Z", "+00:00")).date()
                    else:
                        dt_update = date.fromisoformat(str(updated_raw)[:10])
                    dias_parado = (hoje - dt_update).days
                    if dias_parado >= 5:
                        cliente_info = p.get("clientes") or {}
                        processo_info = p.get("rh_processos") or {}
                        processos_parados.append({
                            "processo_id": p["id"],
                            "processo_nome": processo_info.get("nome", "—"),
                            "cliente_nome": cliente_info.get("razao_social", "—"),
                            "dias_parado": dias_parado,
                            "status": p.get("status", "—"),
                        })
                except Exception:
                    pass

        processos_parados.sort(key=lambda x: -x["dias_parado"])
        processos_parados = processos_parados[:10]

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 4: Desempenho da Equipe
        # ─────────────────────────────────────────────────────────────────────

        # Mapear tarefas por funcionário via rh_execucao_tarefas_responsaveis
        stats_por_func: dict[int, dict] = {}

        for t in todos_tarefas:
            responsaveis = t.get("rh_execucao_tarefas_responsaveis") or []
            for resp in responsaveis:
                fid = resp.get("funcionario_id")
                if not fid:
                    continue
                if fid not in stats_por_func:
                    func_nome = func_map.get(fid, f"Funcionário #{fid}")
                    stats_por_func[fid] = {
                        "funcionario_id": fid,
                        "nome": func_nome,
                        "concluidas": 0,
                        "pendentes": 0,
                        "em_andamento": 0,
                        "atrasadas": 0,
                        "total": 0,
                    }
                stats_por_func[fid]["total"] += 1
                status_t = t.get("status", "")
                if status_t == "CONCLUIDA":
                    stats_por_func[fid]["concluidas"] += 1
                elif _is_atrasada(t):
                    stats_por_func[fid]["atrasadas"] += 1
                elif status_t == "EM ANDAMENTO":
                    stats_por_func[fid]["em_andamento"] += 1
                else:
                    stats_por_func[fid]["pendentes"] += 1

        # Calcular taxa de pontualidade e score por funcionário
        equipe = []
        for fid, s in stats_por_func.items():
            taxa = round((s["concluidas"] / s["total"] * 100), 1) if s["total"] > 0 else 0.0
            score = _calcular_score(taxa, s["concluidas"], s["total"])
            equipe.append({**s, "taxa_pontualidade": taxa, "score": score})

        # Ranking por score
        equipe.sort(key=lambda x: -x["score"]["valor"])

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 5: Distribuição de Carga por Funcionário
        # ─────────────────────────────────────────────────────────────────────

        carga_por_func = {}
        for t in todos_tarefas:
            if t.get("status") == "CONCLUIDA":
                continue  # Apenas ativas
            responsaveis = t.get("rh_execucao_tarefas_responsaveis") or []
            for resp in responsaveis:
                fid = resp.get("funcionario_id")
                if not fid:
                    continue
                carga_por_func[fid] = carga_por_func.get(fid, 0) + 1

        MAX_CARGA_IDEAL = 8  # tasks ativas antes de ser considerado "sobrecarregado"
        distribuicao_carga = []
        for f in todos_funcionarios:
            fid = f["id"]
            ativas = carga_por_func.get(fid, 0)
            nivel = "normal"
            if ativas >= MAX_CARGA_IDEAL * 1.5:
                nivel = "critico"
            elif ativas >= MAX_CARGA_IDEAL:
                nivel = "alto"
            elif ativas == 0:
                nivel = "ocioso"
            distribuicao_carga.append({
                "funcionario_id": fid,
                "nome": f["nome"],
                "tarefas_ativas": ativas,
                "nivel": nivel,
                "percentual": round(min(ativas / MAX_CARGA_IDEAL, 1.5) * 100, 0),
            })
        distribuicao_carga.sort(key=lambda x: -x["tarefas_ativas"])

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 6: Monitoramento de Prazos
        # ─────────────────────────────────────────────────────────────────────

        from datetime import timedelta
        fim_semana = hoje + timedelta(days=7)

        prazos_hoje = []
        prazos_semana = []
        prazos_vencidas = []

        for t in todos_tarefas:
            if t.get("status") == "CONCLUIDA":
                continue
            tarefa_base = t.get("rh_tarefas") or {}
            dias_prazo = tarefa_base.get("dias_prazo") or 0
            if not dias_prazo:
                continue

            try:
                data_limite = date(ano_comp, mes_comp, min(int(dias_prazo), 28))
            except Exception:
                continue

            # Identificar o nome do processo e cliente
            proc = proc_map.get(t.get("execucao_processo_id"), {})
            cliente_info = proc.get("clientes") or {}
            processo_info = proc.get("rh_processos") or {}
            responsaveis = t.get("rh_execucao_tarefas_responsaveis") or []
            resp_nomes = [func_map.get(r.get("funcionario_id"), "?") for r in responsaveis]

            item_prazo = {
                "tarefa_id": t["id"],
                "titulo": tarefa_base.get("titulo", "—"),
                "processo": processo_info.get("nome", "—"),
                "cliente": cliente_info.get("razao_social", "—"),
                "prazo": data_limite.strftime("%d/%m/%Y"),
                "responsaveis": resp_nomes,
            }

            if data_limite < hoje:
                prazos_vencidas.append(item_prazo)
            elif data_limite == hoje:
                prazos_hoje.append(item_prazo)
            elif data_limite <= fim_semana:
                prazos_semana.append(item_prazo)

        monitoramento_prazos = {
            "vencidas": prazos_vencidas[:20],
            "hoje": prazos_hoje[:20],
            "esta_semana": prazos_semana[:20],
            "totais": {
                "vencidas": len(prazos_vencidas),
                "hoje": len(prazos_hoje),
                "esta_semana": len(prazos_semana),
            }
        }

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 7: Produtividade (concluídas por período)
        # ─────────────────────────────────────────────────────────────────────

        inicio_semana = hoje - timedelta(days=hoje.weekday())  # Segunda-feira
        inicio_mes = date(hoje.year, hoje.month, 1)

        concluidas_hoje = 0
        concluidas_semana = 0
        concluidas_mes_atual = 0

        for t in todos_tarefas:
            if t.get("status") != "CONCLUIDA":
                continue
            updated_raw = t.get("updated_at")
            if not updated_raw:
                continue
            try:
                if "T" in str(updated_raw):
                    dt_conclusao = datetime.fromisoformat(str(updated_raw).replace("Z", "+00:00")).date()
                else:
                    dt_conclusao = date.fromisoformat(str(updated_raw)[:10])
                if dt_conclusao == hoje:
                    concluidas_hoje += 1
                if dt_conclusao >= inicio_semana:
                    concluidas_semana += 1
                if dt_conclusao >= inicio_mes:
                    concluidas_mes_atual += 1
            except Exception:
                pass

        produtividade = {
            "concluidas_hoje": concluidas_hoje,
            "concluidas_semana": concluidas_semana,
            "concluidas_mes": concluidas_mes_atual,
            "total_concluidas": tarefas_concluidas,
        }

        # ─────────────────────────────────────────────────────────────────────
        # SEÇÃO 8: Alertas do Sistema
        # ─────────────────────────────────────────────────────────────────────

        alertas = []

        # Alerta: processos parados há +7 dias
        for pp in processos_parados:
            if pp["dias_parado"] >= 7:
                alertas.append({
                    "tipo": "PROCESSO_PARADO",
                    "prioridade": "ALTA" if pp["dias_parado"] >= 14 else "MEDIA",
                    "titulo": f"Processo parado há {pp['dias_parado']} dias",
                    "descricao": f"{pp['processo_nome']} — {pp['cliente_nome']}",
                    "referencia_id": pp["processo_id"],
                })

        # Alerta: funcionários sobrecarregados
        for dc in distribuicao_carga:
            if dc["nivel"] == "critico":
                alertas.append({
                    "tipo": "SOBRECARGA",
                    "prioridade": "ALTA",
                    "titulo": f"{dc['nome']} está sobrecarregado",
                    "descricao": f"{dc['tarefas_ativas']} tarefas ativas (limite recomendado: {MAX_CARGA_IDEAL})",
                    "referencia_id": dc["funcionario_id"],
                })
            elif dc["nivel"] == "alto":
                alertas.append({
                    "tipo": "CARGA_ALTA",
                    "prioridade": "MEDIA",
                    "titulo": f"{dc['nome']} com carga elevada",
                    "descricao": f"{dc['tarefas_ativas']} tarefas ativas",
                    "referencia_id": dc["funcionario_id"],
                })

        # Alerta: muitas tarefas vencidas
        if len(prazos_vencidas) > 5:
            alertas.append({
                "tipo": "PRAZO_CRITICO",
                "prioridade": "CRITICA",
                "titulo": f"{len(prazos_vencidas)} tarefas com prazo vencido",
                "descricao": "Ação imediata necessária para evitar atraso nas entregas",
                "referencia_id": None,
            })

        # Alerta: taxa de pontualidade baixa
        if taxa_pontualidade < 60 and total_tarefas > 5:
            alertas.append({
                "tipo": "PONTUALIDADE_BAIXA",
                "prioridade": "ALTA",
                "titulo": f"Taxa de pontualidade em {taxa_pontualidade}%",
                "descricao": "A equipe está abaixo do nível esperado de entregas no prazo",
                "referencia_id": None,
            })

        # Ordena alertas por prioridade
        prioridade_ordem = {"CRITICA": 0, "ALTA": 1, "MEDIA": 2, "BAIXA": 3}
        alertas.sort(key=lambda x: prioridade_ordem.get(x["prioridade"], 9))

        # ─────────────────────────────────────────────────────────────────────
        # Resposta Final
        # ─────────────────────────────────────────────────────────────────────

        return {
            "competencia_id": competencia_id,
            "competencia_label": comp_label,
            "kpis_globais": kpis_globais,
            "pipeline": pipeline,
            "gargalos": {
                "processos_atrasados": gargalos,
                "processos_parados": processos_parados,
            },
            "equipe": equipe,
            "distribuicao_carga": distribuicao_carga,
            "monitoramento_prazos": monitoramento_prazos,
            "produtividade": produtividade,
            "alertas": alertas[:20],
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Executive Dashboard] Erro: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao carregar painel executivo: {str(e)}")
