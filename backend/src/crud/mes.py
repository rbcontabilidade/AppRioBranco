from src.core.database import supabase, supabase_admin

class MesCRUD:
    @staticmethod
    def get_all():
        return supabase.table("rh_competencias").select("*").order("ano", desc=True).order("mes", desc=True).execute()

    @staticmethod
    def get_by_id(mes_id: str):
        return supabase.table("rh_competencias").select("*").eq("id", mes_id).single().execute()

    @staticmethod
    def create(data: dict):
        return supabase.table("rh_competencias").insert(data).execute()

    @staticmethod
    def update(mes_id: str, data: dict):
        return supabase.table("rh_competencias").update(data).eq("id", mes_id).execute()

    @staticmethod
    def delete_with_cascade(mes_id: str):
        """
        Deleta um mês e todas as execuções vinculadas a ele de forma atômica via RPC.
        """
        client = supabase_admin if supabase_admin else supabase
        
        # Chamada à função RPC que lida com a deleção em cascata transacional
        try:
            return client.rpc("rh_delete_competencia_cascade", {"p_competencia_id": int(mes_id)}).execute()
        except Exception as e:
            print(f"Erro ao deletar competência {mes_id} via RPC: {e}")
            raise e
