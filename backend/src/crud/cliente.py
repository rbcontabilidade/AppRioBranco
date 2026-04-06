from src.core.database import supabase, supabase_admin

class ClienteCRUD:
    @staticmethod
    def get_all():
        # Usamos supabase_admin para garantir bypass de RLS no backend administrativo
        return supabase_admin.table("clientes").select("*").execute()

    @staticmethod
    def _process_data(data: dict):
        # Campos que devem aceitar "" se forem string (evita erro 23502 NOT NULL)
        # Outros campos (como datas) devem ser None se vazios (evita erro 22007 invalid syntax)
        # REMOVEMOS 'codigo' desta lista para que, se estiver vazio, ele seja tratado como None no insert (permitindo multi-NULL no Postgres)
        string_fields = ["razao_social", "cnpj", "regime", "cidade", "estado"]
        return {k: (None if v == "" and k not in string_fields else v) for k, v in data.items()}

    @staticmethod
    def _generate_next_codigo():
        """Busca o maior código atual e gera o próximo incremental formatado com 3 dígitos."""
        try:
            res = supabase_admin.table("clientes").select("codigo").execute()
            if not res.data:
                return "001"
            
            # Extrai apenas os códigos que são puramente numéricos
            codes = []
            for item in res.data:
                c = item.get("codigo")
                if c and str(c).isdigit():
                    codes.append(int(c))
            
            max_val = max(codes) if codes else 0
            return str(max_val + 1).zfill(3)
        except Exception as e:
            print(f"Erro ao gerar próximo código: {e}")
            return None

    @staticmethod
    def create(data: dict):
        # Se o código estiver vazio ou não for passado, gera um automático
        if not data.get("codigo") or str(data.get("codigo")).strip() == "":
            auto_code = ClienteCRUD._generate_next_codigo()
            if auto_code:
                data["codigo"] = auto_code
        
        processed = ClienteCRUD._process_data(data)
        return supabase_admin.table("clientes").insert(processed).execute()

    @staticmethod
    def update(cliente_id: int, data: dict):
        processed = ClienteCRUD._process_data(data)
        return supabase_admin.table("clientes").update(processed).eq("id", cliente_id).execute()

    @staticmethod
    def delete(cliente_id: int):
        return supabase_admin.table("clientes").delete().eq("id", cliente_id).execute()
