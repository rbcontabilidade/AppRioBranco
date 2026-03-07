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
        string_fields = ["razao_social", "cnpj", "codigo", "regime"]
        return {k: (None if v == "" and k not in string_fields else v) for k, v in data.items()}

    @staticmethod
    def create(data: dict):
        processed = ClienteCRUD._process_data(data)
        return supabase_admin.table("clientes").insert(processed).execute()

    @staticmethod
    def update(cliente_id: int, data: dict):
        processed = ClienteCRUD._process_data(data)
        return supabase_admin.table("clientes").update(processed).eq("id", cliente_id).execute()

    @staticmethod
    def delete(cliente_id: int):
        return supabase_admin.table("clientes").delete().eq("id", cliente_id).execute()
