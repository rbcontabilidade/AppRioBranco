from src.core.database import supabase

class SetorCRUD:
    @staticmethod
    def get_all():
        return supabase.table("setores").select("*").order("nome").execute()

    @staticmethod
    def create(data: dict):
        return supabase.table("setores").insert(data).execute()

    @staticmethod
    def update(setor_id: int, data: dict):
        return supabase.table("setores").update(data).eq("id", setor_id).execute()

    @staticmethod
    def delete(setor_id: int):
        return supabase.table("setores").delete().eq("id", setor_id).execute()
